import mongoose, { Schema, Document } from 'mongoose';

export type ReservationStatus = 
  | 'PENDING'    // Temporary draft reserve (expires)
  | 'CONFIRMED'  // Event department confirmed (locked)
  | 'DISPATCHED' // Items loaded and shipped to venue
  | 'RETURNED'   // Items returned back to warehouse (released)
  | 'CANCELLED'; // Event cancelled / deleted (released)

export interface IReservation extends Document {
  eventId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  quantity: number;
  status: ReservationStatus;
  startDate: Date;   // Buffered event start date
  endDate: Date;     // Buffered event end date
  expiresAt?: Date;  // Expiration timestamp for PENDING draft reservations
  createdAt: Date;
  updatedAt: Date;
}

const ReservationSchema: Schema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    quantity: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'DISPATCHED', 'RETURNED', 'CANCELLED'],
      required: true,
      default: 'PENDING'
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    expiresAt: { type: Date } // Null for confirmed / permanent reservations
  },
  {
    timestamps: true
  }
);

// High-speed indices for overlapping range queries and conflict checking
ReservationSchema.index({ itemId: 1, status: 1 });
ReservationSchema.index({ startDate: 1, endDate: 1 });
ReservationSchema.index({ eventId: 1 });
ReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Automatic TTL index for expiring draft reservations

export default mongoose.model<IReservation>('Reservation', ReservationSchema);
