import mongoose from 'mongoose';
import Reservation, { IReservation, ReservationStatus } from '../models/Reservation';
import Item from '../models/Item';

// Buffer Time Configuration (Default to 2 hours)
const BUFFER_HOURS = Number(process.env.BUFFER_HOURS) || 2;
const BUFFER_MS = BUFFER_HOURS * 60 * 60 * 1000;

// Expiry Threshold for Draft Bookings (Default to 24 hours)
const DRAFT_EXPIRY_HOURS = Number(process.env.DRAFT_EXPIRY_HOURS) || 24;
const DRAFT_EXPIRY_MS = DRAFT_EXPIRY_HOURS * 60 * 60 * 1000;

interface AvailabilityCheckResult {
  itemId: string;
  itemCode: string;
  name: string;
  requestedQty: number;
  availableQty: number;
  currentStock: number;
  reservedAndDispatchedQty: number;
  isAvailable: boolean;
}

/**
 * Calculates buffered start and end dates based on system configuration.
 */
export function getBufferedRange(start: Date, end: Date): { bufferedStart: Date; bufferedEnd: Date } {
  return {
    bufferedStart: new Date(start.getTime() - BUFFER_MS),
    bufferedEnd: new Date(end.getTime() + BUFFER_MS)
  };
}

/**
 * Checks the real-time availability of a single inventory item over a given date range.
 * 
 * Formula:
 *   Available = Current Stock - Sum of (Pending (Unexpired) + Confirmed + Dispatched Reservations)
 */
export async function getItemAvailability(
  itemId: string | mongoose.Types.ObjectId,
  startDate: Date,
  endDate: Date,
  excludeEventId?: string | mongoose.Types.ObjectId
): Promise<{ currentStock: number; reservedAndDispatchedQty: number; availableQty: number }> {
  
  const item = await Item.findOne({ _id: itemId, isActive: true });
  if (!item) {
    throw new Error(`Inventory item ${itemId} not found or inactive.`);
  }

  const { bufferedStart, bufferedEnd } = getBufferedRange(startDate, endDate);

  // Find all active, overlapping reservations
  const overlappingQuery: any = {
    itemId,
    status: { $in: ['PENDING', 'CONFIRMED', 'DISPATCHED'] },
    startDate: { $lte: bufferedEnd },
    endDate: { $gte: bufferedStart }
  };

  // Exclude current event if we are re-validating during update
  if (excludeEventId) {
    overlappingQuery.eventId = { $ne: new mongoose.Types.ObjectId(excludeEventId) };
  }

  const reservations = await Reservation.find(overlappingQuery);

  const now = new Date();
  
  // Sum up all overlapping reservation quantities, ignoring expired pending ones
  const activeReservationsTotal = reservations.reduce((total, res) => {
    if (res.status === 'PENDING' && res.expiresAt && res.expiresAt < now) {
      // Ignore expired pending draft reservations
      return total;
    }
    return total + res.quantity;
  }, 0);

  const availableQty = Math.max(0, item.currentStock - activeReservationsTotal);

  return {
    currentStock: item.currentStock,
    reservedAndDispatchedQty: activeReservationsTotal,
    availableQty
  };
}

/**
 * Evaluates stock availability for multiple items in a batch.
 */
export async function checkBatchAvailability(
  items: Array<{ itemId: string; quantity: number }>,
  startDate: Date,
  endDate: Date,
  excludeEventId?: string
): Promise<{ isFullyAvailable: boolean; results: AvailabilityCheckResult[] }> {
  
  const results: AvailabilityCheckResult[] = [];
  let isFullyAvailable = true;

  for (const requestedItem of items) {
    const dbItem = await Item.findOne({ _id: requestedItem.itemId, isActive: true });
    if (!dbItem) {
      throw new Error(`Item ${requestedItem.itemId} is invalid or deactivated.`);
    }

    const { currentStock, reservedAndDispatchedQty, availableQty } = await getItemAvailability(
      requestedItem.itemId,
      startDate,
      endDate,
      excludeEventId
    );

    const isAvailable = availableQty >= requestedItem.quantity;
    if (!isAvailable) {
      isFullyAvailable = false;
    }

    results.push({
      itemId: requestedItem.itemId,
      itemCode: dbItem.itemCode,
      name: dbItem.name,
      requestedQty: requestedItem.quantity,
      availableQty,
      currentStock,
      reservedAndDispatchedQty,
      isAvailable
    });
  }

  return { isFullyAvailable, results };
}

/**
 * Creates draft reservations for a scheduled event (Status: PENDING, with Expiry).
 */
export async function createReservations(
  eventId: string | mongoose.Types.ObjectId,
  items: Array<{ itemId: string; quantity: number }>,
  startDate: Date,
  endDate: Date,
  session?: mongoose.ClientSession
): Promise<IReservation[]> {
  
  const { bufferedStart, bufferedEnd } = getBufferedRange(startDate, endDate);
  const expiresAt = new Date(Date.now() + DRAFT_EXPIRY_MS);
  
  const reservationsToCreate = items.map(item => ({
    eventId: new mongoose.Types.ObjectId(eventId),
    itemId: new mongoose.Types.ObjectId(item.itemId),
    quantity: item.quantity,
    status: 'PENDING' as ReservationStatus,
    startDate: bufferedStart,
    endDate: bufferedEnd,
    expiresAt
  }));

  return await Reservation.insertMany(reservationsToCreate, { session });
}

/**
 * Confirms draft reservations belonging to a specific department in an event (Status -> CONFIRMED).
 */
export async function confirmDepartmentReservations(
  eventId: string | mongoose.Types.ObjectId,
  department: string,
  session?: mongoose.ClientSession
): Promise<void> {
  
  // Find event items belonging to this department
  const db = mongoose.connection.db;
  const eventObj = await mongoose.model('Event').findOne({ _id: eventId }).populate('items.itemId');
  
  if (!eventObj) {
    throw new Error('Event not found.');
  }

  const deptItemIds = eventObj.items
    .filter((eventItem: any) => eventItem.itemId && eventItem.itemId.department === department)
    .map((eventItem: any) => eventItem.itemId._id.toString());

  if (deptItemIds.length === 0) return; // Nothing to confirm in this department

  // Update matching pending reservations to CONFIRMED and unset expiresAt
  await Reservation.updateMany(
    {
      eventId: new mongoose.Types.ObjectId(eventId),
      itemId: { $in: deptItemIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
      status: 'PENDING'
    },
    {
      $set: { status: 'CONFIRMED' },
      $unset: { expiresAt: 1 }
    },
    { session }
  );
}

/**
 * Transitions reservations to DISPATCHED when vehicle loading and outward checkouts complete.
 */
export async function dispatchEventReservations(
  eventId: string | mongoose.Types.ObjectId,
  session?: mongoose.ClientSession
): Promise<void> {
  
  await Reservation.updateMany(
    {
      eventId: new mongoose.Types.ObjectId(eventId),
      status: 'CONFIRMED'
    },
    {
      $set: { status: 'DISPATCHED' }
    },
    { session }
  );
}

/**
 * Restores stock by completing / returning event reservations (Status -> RETURNED).
 */
export async function returnEventReservations(
  eventId: string | mongoose.Types.ObjectId,
  session?: mongoose.ClientSession
): Promise<void> {
  
  await Reservation.updateMany(
    {
      eventId: new mongoose.Types.ObjectId(eventId),
      status: 'DISPATCHED'
    },
    {
      $set: { status: 'RETURNED' }
    },
    { session }
  );
}

/**
 * Soft cancels or releases all reservations for an event (Status -> CANCELLED).
 */
export async function cancelEventReservations(
  eventId: string | mongoose.Types.ObjectId,
  session?: mongoose.ClientSession
): Promise<void> {
  
  await Reservation.updateMany(
    {
      eventId: new mongoose.Types.ObjectId(eventId),
      status: { $in: ['PENDING', 'CONFIRMED', 'DISPATCHED'] }
    },
    {
      $set: { status: 'CANCELLED' },
      $unset: { expiresAt: 1 }
    },
    { session }
  );
}

/**
 * Restores reservations back to pending/confirmed when recovering soft-deleted events.
 */
export async function restoreEventReservations(
  eventId: string | mongoose.Types.ObjectId,
  startDate: Date,
  endDate: Date,
  items: Array<{ itemId: string; quantity: number }>,
  session?: mongoose.ClientSession
): Promise<void> {
  
  // Clean re-creation of draft reservations for recovered draft events
  await createReservations(eventId, items, startDate, endDate, session);
}

/**
 * Runs a cleaning cycle to release and mark any past-due draft reservations as CANCELLED.
 */
export async function cleanupExpiredReservations(): Promise<number> {
  const now = new Date();
  
  const result = await Reservation.updateMany(
    {
      status: 'PENDING',
      expiresAt: { $lt: now }
    },
    {
      $set: { status: 'CANCELLED' },
      $unset: { expiresAt: 1 }
    }
  );

  return result.modifiedCount;
}
