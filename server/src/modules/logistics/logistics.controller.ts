import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import LogisticsLog from '../../models/LogisticsLog';
import Event from '../../models/Event';
import { 
  dispatchEventReservations, 
  returnEventReservations 
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
