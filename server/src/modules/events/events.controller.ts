import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Event from '../../models/Event';
import Item, { ItemDepartment } from '../../models/Item';
import BillingDocument from '../../models/BillingDocument';
import ItemGroup from '../../models/ItemGroup';
import { 
  checkBatchAvailability, 
  createReservations, 
  confirmDepartmentReservations, 
  cancelEventReservations, 
  restoreEventReservations 
} from '../../services/reservationEngine';

// Event Creation Validation Schema
const EventCreateSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  eventDate: z.object({
    start: z.string(),
    end: z.string()
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
  ),
  eventStatus: z.enum(['INQUIRY', 'QUOTATION', 'APPROVED', 'CONFIRMED', 'LOADING', 'DISPATCHED', 'RETURNED', 'CLOSED']).optional()
});

/**
 * Create a new Event booking (Sales Rep & Admin).
 */
export async function createEvent(req: Request, res: Response) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const validated = EventCreateSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ error: 'Unauthorized user session context.' });
    }

    // 1. Real-time overlap conflict check with buffer time logic
    const { isFullyAvailable, results } = await checkBatchAvailability(
      validated.items,
      new Date(validated.eventDate.start),
      new Date(validated.eventDate.end)
    );

    if (!isFullyAvailable) {
      const shortages = results
        .filter((r) => !r.isAvailable)
        .map((r) => `${r.name} (${r.itemCode}): Requested ${r.requestedQty}, Available ${r.availableQty} (Total stock: ${r.currentStock})`);

      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        error: 'Stock Availability Clash: Insufficient inventory levels due to overlapping events.',
        shortages
      });
    }

    // 2. Save Event Draft inside the transaction
    const newEvents = await Event.create(
      [
        {
          ...validated,
          eventDate: {
            start: new Date(validated.eventDate.start),
            end: new Date(validated.eventDate.end)
          },
          createdBy: new mongoose.Types.ObjectId(userId),
          eventStatus: validated.eventStatus || 'INQUIRY',
          isCompleteEntry: true
        }
      ],
      { session }
    );

    const newEvent = newEvents[0];

    // 3. Register temporary draft reservations (exhibits 24-hr TTL auto-expiry)
    await createReservations(
      newEvent._id,
      validated.items,
      new Date(validated.eventDate.start),
      new Date(validated.eventDate.end),
      session
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: 'Event booked successfully as draft and inventory reserved!',
      event: newEvent
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
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
    const { fromDate, toDate, status, showDeleted, search } = req.query;
    const filter: any = {};

    if (showDeleted === 'true') {
      filter.isDeleted = true;
    } else {
      filter.isDeleted = false;
    }

    if (fromDate || toDate) {
      filter['eventDate.start'] = {};
      if (fromDate) {
        filter['eventDate.start'].$gte = new Date(fromDate as string);
      }
      if (toDate) {
        filter['eventDate.start'].$lte = new Date(toDate as string);
      }
    }

    if (status) {
      filter.eventStatus = status;
    }

    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { place: { $regex: search, $options: 'i' } },
        { program: { $regex: search, $options: 'i' } }
      ];
    }

    // Populate creator and updater details
    const events = await Event.find(filter)
      .populate('items.itemId')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('deletedBy', 'name email')
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
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('confirmations.COUNTER_DECOR.confirmedBy', 'name')
      .populate('confirmations.CLOTH_DECOR.confirmedBy', 'name')
      .populate('confirmations.RENTAL_ITEMS.confirmedBy', 'name')
      .populate('confirmations.EXPENSE_CHARGES.confirmedBy', 'name')
      .populate('confirmations.STAFF.confirmedBy', 'name')
      .populate('confirmations.OUTSIDE_RENTAL.confirmedBy', 'name');

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
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      await session.abortTransaction();
      session.endSession();
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
      { new: true, session }
    );

    if (!event) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Event not found or already deleted.' });
    }

    // Cancel and release all associated reservations
    await cancelEventReservations(event._id, session);

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: 'Event deleted successfully and reservations cancelled.',
      deletedBy: userId
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}

/**
 * Restore/Recover a deleted event (Admin Only).
 */
export async function recoverEvent(req: Request, res: Response) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;

    const restoredEvent = await Event.findOneAndUpdate(
      { _id: id, isDeleted: true },
      {
        $set: { isDeleted: false },
        $unset: { deletedBy: 1, deletedAt: 1 }
      },
      { new: true, session }
    );

    if (!restoredEvent) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Deleted Event not found.' });
    }

    // Re-verify and restore reservations for recovered booking
    const items = restoredEvent.items.map((i: any) => ({
      itemId: i.itemId.toString(),
      quantity: i.quantity
    }));

    await restoreEventReservations(
      restoredEvent._id,
      restoredEvent.eventDate.start,
      restoredEvent.eventDate.end,
      items,
      session
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: 'Event and reservations recovered successfully.',
      event: restoredEvent
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
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

    // Fetch all active dynamic item group keys from database
    const dynamicGroups = await ItemGroup.find({ isActive: true });
    const dynamicKeys = dynamicGroups.map((g) => g.key.toUpperCase());

    const validDepartments = Array.from(new Set([
      'COUNTER_DECOR',
      'CLOTH_DECOR',
      'RENTAL_ITEMS',
      'EXPENSE_CHARGES',
      'STAFF',
      'OUTSIDE_RENTAL',
      ...dynamicKeys
    ]));

    const deptUpper = (department || '').toUpperCase();

    if (!validDepartments.includes(deptUpper)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Invalid department code.' });
    }

    const event = await Event.findOne({ _id: id, isDeleted: false });
    if (!event) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Already confirmed check is omitted to support robust re-confirmations when items are updated

    // Transition reservation statuses for this department to CONFIRMED
    await confirmDepartmentReservations(event._id, deptUpper, session);

    // Update confirmation flag in the event document
    const updatePath = `confirmations.${deptUpper}`;
    const updatePayload = {
      [`${updatePath}.confirmed`]: true,
      [`${updatePath}.confirmedBy`]: new mongoose.Types.ObjectId(userId),
      [`${updatePath}.confirmedAt`]: new Date()
    };

    await Event.updateOne({ _id: id }, { $set: updatePayload }, { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: `Department ${department} confirmed and stock reservations locked successfully.`
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}

/**
 * Update Event Status (Lifecycle Management).
 */
export async function updateEventStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { eventStatus } = req.body;
    
    const validStatuses = ['INQUIRY', 'QUOTATION', 'APPROVED', 'CONFIRMED', 'LOADING', 'DISPATCHED', 'RETURNED', 'CLOSED'];
    if (!validStatuses.includes(eventStatus)) {
      return res.status(400).json({ error: 'Invalid event status provided.' });
    }

    const event = await Event.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { eventStatus } },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    return res.status(200).json({
      message: `Event status updated to ${eventStatus}.`,
      event
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}

/**
 * Generic Event update controller (Admin & Sales Rep).
 */
export async function updateEvent(req: Request, res: Response) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const validated = EventCreateSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ error: 'Unauthorized user session context.' });
    }

    const event = await Event.findOne({ _id: id, isDeleted: false });
    if (!event) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Event not found or already deleted.' });
    }

    // 1. Release all old reservations first
    await cancelEventReservations(event._id, session);

    // 2. Perform availability overlap conflict check on the new parameters (excluding current event's own reservations)
    const { isFullyAvailable, results } = await checkBatchAvailability(
      validated.items,
      new Date(validated.eventDate.start),
      new Date(validated.eventDate.end),
      event._id.toString()
    );

    if (!isFullyAvailable) {
      const shortages = results
        .filter((r) => !r.isAvailable)
        .map((r) => `${r.name} (${r.itemCode}): Requested ${r.requestedQty}, Available ${r.availableQty}`);

      // Rollback: Re-verify/restore reservations for original event parameters since update failed
      const originalItems = event.items.map((i: any) => ({
        itemId: i.itemId.toString(),
        quantity: i.quantity
      }));
      await restoreEventReservations(
        event._id,
        event.eventDate.start,
        event.eventDate.end,
        originalItems,
        session
      );

      await session.commitTransaction();
      session.endSession();
      return res.status(400).json({
        error: 'Stock Availability Clash: Overlapping schedule constraints.',
        shortages
      });
    }

    // 3. Save new event details and reset confirmations back to false since items/dates were updated
    const resetConfirmations: any = {};
    if (event.confirmations) {
      Object.keys(event.confirmations).forEach((key) => {
        resetConfirmations[key] = { confirmed: false };
      });
    }

    const updatedEvent = await Event.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          customerName: validated.customerName,
          place: validated.place,
          eventDate: {
            start: new Date(validated.eventDate.start),
            end: new Date(validated.eventDate.end)
          },
          timeWindow: validated.timeWindow,
          program: validated.program,
          items: validated.items,
          eventStatus: validated.eventStatus || event.eventStatus,
          updatedBy: new mongoose.Types.ObjectId(userId),
          confirmations: resetConfirmations
        }
      },
      { new: true, session }
    );

    // 4. Re-create new reservations
    await createReservations(
      event._id,
      validated.items,
      new Date(validated.eventDate.start),
      new Date(validated.eventDate.end),
      session
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: 'Event updated successfully and reservations adjusted!',
      event: updatedEvent
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}

/**
 * Fetch unique customers aggregated from all active events and billing documents.
 */
export async function getCustomers(req: Request, res: Response) {
  try {
    const events = await Event.find({ isDeleted: false }).sort({ createdAt: -1 });
    const billingDocs = await BillingDocument.find();

    const customerMap = new Map<string, {
      id: string;
      name: string;
      phone: string;
      address: string;
      totalEvents: number;
      pendingAmount: number;
      lastEventDate: string;
    }>();

    for (const event of events) {
      const name = event.customerName.trim();
      const nameKey = name.toLowerCase();

      // Find billing documents to calculate pending balances
      const customerDocs = billingDocs.filter(
        (doc) => doc.customer.name.toLowerCase() === nameKey && doc.documentType === 'INVOICE'
      );

      const pendingAmount = customerDocs.reduce((sum, doc) => {
        if (doc.status === 'PAID') return sum;
        return sum + (doc.totals?.grandTotal || 0);
      }, 0);

      const eventDateStr = event.eventDate.start.toISOString().split('T')[0];

      if (!customerMap.has(nameKey)) {
        customerMap.set(nameKey, {
          id: event._id.toString(),
          name,
          phone: customerDocs[0]?.customer.phone || '9562703957', // default or dynamic phone
          address: customerDocs[0]?.customer.billingAddress || event.place,
          totalEvents: 1,
          pendingAmount,
          lastEventDate: eventDateStr
        });
      } else {
        const existing = customerMap.get(nameKey)!;
        existing.totalEvents += 1;
        existing.pendingAmount += pendingAmount;
        if (eventDateStr > existing.lastEventDate) {
          existing.lastEventDate = eventDateStr;
        }
      }
    }

    const customersList = Array.from(customerMap.values());
    return res.status(200).json(customersList);
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}
