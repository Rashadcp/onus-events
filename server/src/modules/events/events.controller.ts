import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Event from '../../models/Event';
import Item, { ItemDepartment } from '../../models/Item';

// Event Creation Validation Schema
const EventCreateSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  eventDate: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  timeWindow: z.object({
    start: z.string(), // HH:MM
    end: z.string()   // HH:MM
  }),
  place: z.string().min(1, 'Place is required'),
  program: z.string().min(1, 'Program description is required'),
  items: z.array(
    z.object({
      itemId: z.string(),
      quantity: z.number().int().positive('Quantity must be greater than 0')
    })
  )
});

/**
 * Create a new Event booking (Sales Rep & Admin).
 */
export async function createEvent(req: Request, res: Response) {
  try {
    const validated = EventCreateSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized user session context.' });
    }

    // 1. Live Stock Validation
    const itemIds = validated.items.map((item) => new mongoose.Types.ObjectId(item.itemId));
    const itemsInDb = await Item.find({ _id: { $in: itemIds }, isActive: true });

    const itemMap = new Map(itemsInDb.map((item) => [item._id.toString(), item]));

    // Check stock for each requested item
    const shortages: string[] = [];
    for (const reqItem of validated.items) {
      const dbItem = itemMap.get(reqItem.itemId);
      if (!dbItem) {
        return res.status(400).json({ error: `Selected item with ID ${reqItem.itemId} is invalid or disabled.` });
      }

      if (dbItem.currentStock < reqItem.quantity) {
        shortages.push(
          `${dbItem.name} (${dbItem.itemCode}): Requested ${reqItem.quantity}, Available ${dbItem.currentStock}`
        );
      }
    }

    if (shortages.length > 0) {
      return res.status(400).json({
        error: 'Stock Availability Warning: Insufficient inventory levels for these items.',
        shortages
      });
    }

    // 2. Save Event Draft in Database
    const newEvent = await Event.create({
      ...validated,
      eventDate: {
        start: new Date(validated.eventDate.start),
        end: new Date(validated.eventDate.end)
      },
      createdBy: new mongoose.Types.ObjectId(userId),
      isCompleteEntry: true // Mark as true if creation validation completes successfully
    });

    return res.status(201).json({
      message: 'Event created successfully as draft',
      event: newEvent
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}

/**
 * Fetch all Active/Upcoming Events.
 */
export async function getEvents(req: Request, res: Response) {
  try {
    const { fromDate, toDate, status } = req.query;
    const filter: any = { isDeleted: false };

    if (fromDate || toDate) {
      filter['eventDate.start'] = {};
      if (fromDate) {
        filter['eventDate.start'].$gte = new Date(fromDate as string);
      }
      if (toDate) {
        filter['eventDate.start'].$lte = new Date(toDate as string);
      }
    }

    // Populate creator username & name
    const events = await Event.find(filter)
      .populate('createdBy', 'username fullName')
      .sort({ 'eventDate.start': 1 });

    return res.status(200).json(events);
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}

/**
 * Retrieve single event by ID (with full populated items).
 */
export async function getEventById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const event = await Event.findOne({ _id: id, isDeleted: false })
      .populate('items.itemId')
      .populate('createdBy', 'username fullName')
      .populate('confirmations.COUNTER_DECOR.confirmedBy', 'fullName')
      .populate('confirmations.CLOTH_DECOR.confirmedBy', 'fullName')
      .populate('confirmations.RENTAL_ITEMS.confirmedBy', 'fullName')
      .populate('confirmations.EXPENSE_CHARGES.confirmedBy', 'fullName')
      .populate('confirmations.STAFF.confirmedBy', 'fullName')
      .populate('confirmations.OUTSIDE_RENTAL.confirmedBy', 'fullName');

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    return res.status(200).json(event);
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}

/**
 * Soft Delete an Event with Auditor Identity logging (Sales Rep & Admin).
 */
export async function deleteEvent(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized user session context.' });
    }

    const event = await Event.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { 
        $set: { 
          isDeleted: true, 
          deletedBy: new mongoose.Types.ObjectId(userId),
          deletedAt: new Date()
        } 
      },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ error: 'Event not found or already deleted.' });
    }

    return res.status(200).json({
      message: 'Event soft deleted successfully.',
      deletedBy: userId
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}

/**
 * Restore/Recover a deleted event (Admin Only).
 */
export async function recoverEvent(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const restoredEvent = await Event.findOneAndUpdate(
      { _id: id, isDeleted: true },
      {
        $set: { isDeleted: false },
        $unset: { deletedBy: 1, deletedAt: 1 }
      },
      { new: true }
    );

    if (!restoredEvent) {
      return res.status(404).json({ error: 'Deleted Event not found.' });
    }

    return res.status(200).json({
      message: 'Event recovered successfully.',
      event: restoredEvent
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}

/**
 * Handle department-level confirmation & stock deduction (Sales Rep & Admin).
 */
export async function confirmDepartment(req: Request, res: Response) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const { department } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ error: 'Unauthorized user session context.' });
    }

    const validDepartments: ItemDepartment[] = [
      'COUNTER_DECOR',
      'CLOTH_DECOR',
      'RENTAL_ITEMS',
      'EXPENSE_CHARGES',
      'STAFF',
      'OUTSIDE_RENTAL'
    ];

    if (!validDepartments.includes(department)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Invalid department code.' });
    }

    // Fetch the event with item details populated to filter by department
    const event = await Event.findOne({ _id: id, isDeleted: false }).populate('items.itemId');
    if (!event) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Verify if already confirmed
    const dptConf = (event.confirmations as any)[department];
    if (dptConf && dptConf.confirmed) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: `Department ${department} is already confirmed.` });
    }

    // Filter event items that belong to the confirming department
    const dptItems = event.items.filter((eventItem: any) => {
      const dbItem = eventItem.itemId;
      return dbItem && dbItem.department === department;
    });

    // Deduct stock for each department item
    for (const dptItem of dptItems) {
      const dbItem: any = dptItem.itemId;
      const deductionQty = dptItem.quantity;

      // Decrement the currentStock in DB
      const updatedItem = await Item.findOneAndUpdate(
        { _id: dbItem._id, currentStock: { $gte: deductionQty }, isActive: true },
        { $inc: { currentStock: -deductionQty } },
        { new: true, session }
      );

      if (!updatedItem) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          error: `Failed to confirm department: Insufficient stock for item ${dbItem.name} (${dbItem.itemCode}).`
        });
      }
    }

    // Update confirmation flag in the event document
    const updatePath = `confirmations.${department}`;
    const updatePayload = {
      [`${updatePath}.confirmed`]: true,
      [`${updatePath}.confirmedBy`]: new mongoose.Types.ObjectId(userId),
      [`${updatePath}.confirmedAt`]: new Date()
    };

    await Event.updateOne({ _id: id }, { $set: updatePayload }, { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: `Department ${department} confirmed and stock inventory deducted successfully.`
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}
