import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import LogisticsLog from '../../models/LogisticsLog';
import Event from '../../models/Event';
import Item from '../../models/Item';
import StockLog from '../../models/StockLog';
import BillingDocument from '../../models/BillingDocument';
import Reservation from '../../models/Reservation';
import { calculateBilling } from '../../services/pricingEngine';
import { 
  dispatchEventReservations, 
  returnEventReservations,
  getBufferedRange
} from '../../services/reservationEngine';

// Logistics Validation Schema
const LogisticsUpdateSchema = z.object({
  status: z.enum(['LOADING_OUT', 'RELOADING_IN', 'COMPLETED']).optional(),
  loadingStaff: z.array(z.string()).optional(),
  loadingVehicle: z.object({
    vehicleNo: z.string().optional(),
    noOfLoads: z.number().int().positive().optional()
  }).optional(),
  verifiedOut: z.array(
    z.object({
      itemId: z.string(),
      quantity: z.number().int().nonnegative()
    })
  ).optional(),
  additionalItems: z.array(
    z.object({
      itemCode: z.string(),
      quantity: z.number().int().positive(),
      referredBy: z.string().min(1, 'Referral name is compulsory for additional items') // Enforce compulsory referral
    })
  ).optional(),
  shortItems: z.array(
    z.object({
      itemId: z.string(),
      quantity: z.number().int().positive()
    })
  ).optional(),
  reloadingStaff: z.array(z.string()).optional(),
  reloadingVehicle: z.object({
    vehicleNo: z.string().optional(),
    noOfLoads: z.number().int().positive().optional()
  }).optional(),
  missingItems: z.array(
    z.object({
      itemId: z.string(),
      quantity: z.number().int().positive()
    })
  ).optional(),
  loadingCharges: z.number().nonnegative().optional(),
  splittingDetails: z.string().optional()
});

/**
 * Fetch a logistics log for a specific event.
 */
export async function getLogisticsLog(req: Request, res: Response) {
  try {
    const { eventId } = req.params;
    const log = await LogisticsLog.findOne({ eventId })
      .populate('verifiedOut.itemId')
      .populate('shortItems.itemId')
      .populate('missingItems.itemId')
      .populate('modifiedBy.userId', 'name email phone');

    if (!log) {
      // Return a blank template if not initialized yet
      return res.status(200).json({
        eventId,
        status: 'LOADING_OUT',
        loadingStaff: [],
        loadingVehicle: { noOfLoads: 1 },
        verifiedOut: [],
        additionalItems: [],
        shortItems: [],
        modifiedBy: [],
        reloadingStaff: [],
        reloadingVehicle: { noOfLoads: 1 },
        missingItems: [],
        loadingCharges: 0
      });
    }

    return res.status(200).json(log);
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}

/**
 * Automatically creates or updates DISPATCHED status reservations for any additional logistics items
 * to block them in the availability calculations for overlapping events.
 */
async function syncAdditionalItemReservations(
  eventId: string,
  additionalItems: any[],
  session: mongoose.ClientSession
) {
  // Fetch event details to get dates and location
  const event = await Event.findById(eventId).session(session);
  if (!event) return;

  const { bufferedStart, bufferedEnd } = getBufferedRange(event.eventDate.start, event.eventDate.end, event.place);

  // We should first remove any existing logistics-generated additional reservations for this event.
  // To distinguish them from standard reservations, we track them.
  // Standard reservations correspond to event.items.
  // So any reservation for this event whose itemId is NOT in the event.items list is an additional logistics reservation!
  const originalItemIds = event.items.map(item => item.itemId.toString());

  await Reservation.deleteMany({
    eventId: new mongoose.Types.ObjectId(eventId),
    itemId: { $nin: originalItemIds.map(id => new mongoose.Types.ObjectId(id)) }
  }, { session });

  // Now, create new DISPATCHED status reservations for each additional item
  if (additionalItems && additionalItems.length > 0) {
    const reservationsToCreate = [];
    for (const itemInfo of additionalItems) {
      const item = await Item.findOne({ itemCode: itemInfo.itemCode.toUpperCase(), isActive: true }).session(session);
      if (item) {
        reservationsToCreate.push({
          eventId: new mongoose.Types.ObjectId(eventId),
          itemId: item._id,
          quantity: itemInfo.quantity,
          status: 'DISPATCHED' as const,
          startDate: bufferedStart,
          endDate: bufferedEnd
        });
      }
    }

    if (reservationsToCreate.length > 0) {
      await Reservation.insertMany(reservationsToCreate, { session });
    }
  }
}

/**
 * Automatically synchronizes logistics items and charges with the associated billing document (Invoice).
 */
async function syncLogisticsWithBilling(
  eventId: string,
  additionalItems: any[],
  missingItems: any[],
  loadingCharges: number,
  session: mongoose.ClientSession
) {
  // Find the associated invoice for this event
  const invoice = await BillingDocument.findOne({ eventId, documentType: 'INVOICE' }).session(session);
  if (!invoice) return; // If no invoice, we don't automatically update (quotation might be converted later)

  // Keep track of existing non-logistics items (original items) by filtering out any previous auto-generated logistics line items
  const nonLogisticsLines = invoice.lineItems.filter(line => 
    !line.description.includes('(Logistics Additional Delivery)') &&
    !line.description.includes('(Lost/Missing Replacement Charge)') &&
    !line.description.includes('Logistics Handling & Loading Charges')
  );

  const updatedInputLines: any[] = [...nonLogisticsLines];

  // 1. Process Additional Items (Rentals)
  if (additionalItems && additionalItems.length > 0) {
    for (const itemInfo of additionalItems) {
      const item = await Item.findOne({ itemCode: itemInfo.itemCode.toUpperCase(), isActive: true }).session(session);
      if (item) {
        updatedInputLines.push({
          itemId: item._id.toString(),
          itemCode: item.itemCode,
          description: `${item.name} (Logistics Additional Delivery)`,
          quantity: itemInfo.quantity,
          rentalDays: 1, // standard rental days
          unitRate: item.rentalRate,
          discountType: 'FLAT',
          discountValue: 0,
          gstRate: 18
        });
      }
    }
  }

  // 2. Process Missing Items (Sales)
  if (missingItems && missingItems.length > 0) {
    for (const itemInfo of missingItems) {
      const item = await Item.findById(itemInfo.itemId).session(session);
      if (item) {
        updatedInputLines.push({
          itemId: item._id.toString(),
          itemCode: item.itemCode,
          description: `${item.name} (Lost/Missing Replacement Charge)`,
          quantity: itemInfo.quantity,
          rentalDays: 1,
          unitRate: item.saleRate, // Charged at full replacement value (saleRate)
          discountType: 'FLAT',
          discountValue: 0,
          gstRate: 18
        });
      }
    }
  }

  // 3. Process Loading Charges (Expenses/Service Fees)
  if (loadingCharges && loadingCharges > 0) {
    updatedInputLines.push({
      itemCode: 'LOGISTICS-FEE',
      description: 'Logistics Handling & Loading Charges',
      quantity: 1,
      rentalDays: 1,
      unitRate: loadingCharges,
      discountType: 'FLAT',
      discountValue: 0,
      gstRate: 18 // standard service tax
    });
  }

  // Recalculate invoice pricing and totals
  if (updatedInputLines.length > 0) {
    const pricing = await calculateBilling(updatedInputLines);
    invoice.lineItems = pricing.lineItems;
    invoice.totals = pricing.totals;
    await invoice.save({ session });
  }
}

/**
 * Create or update a Logistics Log sheet (Admin & Loading Staff).
 * Incorporates complete audit trail logging if modified.
 */
export async function updateLogisticsLog(req: Request, res: Response) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { eventId } = req.params;
    const validated = LogisticsUpdateSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ error: 'Unauthorized user session context.' });
    }

    // Verify event exists
    const eventExists = await Event.findOne({ _id: eventId, isDeleted: false });
    if (!eventExists) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Associated active event not found.' });
    }

    let log = await LogisticsLog.findOne({ eventId });

    // Transition reservation statuses based on logistics workflow
    if (validated.status) {
      if (validated.status === 'RELOADING_IN') {
        await dispatchEventReservations(eventId, session);
        await Event.findOneAndUpdate(
          { _id: eventId },
          { $set: { eventStatus: 'DISPATCHED' } },
          { session }
        );
      } else if (validated.status === 'COMPLETED') {
        await returnEventReservations(eventId, session);
        await Event.findOneAndUpdate(
          { _id: eventId },
          { $set: { eventStatus: 'RETURNED' } },
          { session }
        );

        // Real-world stock logic: Deduct missing items from warehouse inventory and write audit log
        const isAlreadyCompleted = log && log.status === 'COMPLETED';
        if (!isAlreadyCompleted) {
          const missingItemsList = validated.missingItems || log?.missingItems || [];
          for (const missingInfo of missingItemsList) {
            const item = await Item.findById(missingInfo.itemId).session(session);
            if (item) {
              const previousStock = item.currentStock;
              const newStock = Math.max(0, previousStock - missingInfo.quantity);
              const difference = newStock - previousStock;
              
              if (difference !== 0) {
                item.currentStock = newStock;
                await item.save({ session });
                
                // Seed audited stock log entry
                await StockLog.create(
                  [
                    {
                      itemId: item._id,
                      itemCode: item.itemCode,
                      previousStock: previousStock,
                      newStock: newStock,
                      difference: difference,
                      state: 'DAMAGED',
                      warehouse: item.warehouse || 'Main Warehouse',
                      reason: `Lost/Missing items during logistics return (Event #${eventId})`,
                      modifiedBy: new mongoose.Types.ObjectId(userId)
                    }
                  ],
                  { session }
                );
              }
            }
          }
        }
      }
    }

    if (!log) {
      // First-time initialization
      const logsCreated = await LogisticsLog.create(
        [
          {
            eventId: new mongoose.Types.ObjectId(eventId),
            ...validated,
            modifiedBy: [
              {
                userId: new mongoose.Types.ObjectId(userId),
                modifiedAt: new Date(),
                changeDetails: 'Initial logistics log sheet created.'
              }
            ]
          }
        ],
        { session }
      );

      await syncAdditionalItemReservations(
        eventId,
        validated.additionalItems || [],
        session
      );

      await syncLogisticsWithBilling(
        eventId,
        validated.additionalItems || [],
        validated.missingItems || [],
        validated.loadingCharges || 0,
        session
      );

      await session.commitTransaction();
      session.endSession();

      return res.status(201).json({
        message: 'Logistics log created successfully.',
        log: logsCreated[0]
      });
    }

    // Sheet already exists: Perform update and log deep audit modifications
    const changes: string[] = [];

    if (validated.status && validated.status !== log.status) {
      changes.push(`Status changed from ${log.status} to ${validated.status}`);
    }

    if (validated.additionalItems) {
      const prevCodes = log.additionalItems.map((i) => i.itemCode).join(', ');
      const newCodes = validated.additionalItems.map((i) => i.itemCode).join(', ');
      if (prevCodes !== newCodes) {
        changes.push(`Additional items updated. Old: [${prevCodes}], New: [${newCodes}]`);
      }
    }

    if (validated.shortItems && validated.shortItems.length !== log.shortItems.length) {
      changes.push(`Shortage items list size adjusted from ${log.shortItems.length} to ${validated.shortItems.length}`);
    }

    const finalChangeDetails = changes.length > 0 ? changes.join('; ') : 'Logistics details updated.';

    // Construct the Mongoose update fields dynamically
    const updatePayload: any = { ...validated };
    
    // Push the audit log into the modifiedBy array
    const auditRecord = {
      userId: new mongoose.Types.ObjectId(userId),
      modifiedAt: new Date(),
      changeDetails: finalChangeDetails
    };

    const updatedLog = await LogisticsLog.findOneAndUpdate(
      { eventId },
      {
        $set: updatePayload,
        $push: { modifiedBy: auditRecord }
      },
      { new: true, session }
    );

    if (!updatedLog) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Logistics log not found.' });
    }

    await syncAdditionalItemReservations(
      eventId,
      updatedLog.additionalItems || [],
      session
    );

    await syncLogisticsWithBilling(
      eventId,
      updatedLog.additionalItems || [],
      updatedLog.missingItems || [],
      updatedLog.loadingCharges || 0,
      session
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: 'Logistics log updated and modification audited successfully.',
      log: updatedLog
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
