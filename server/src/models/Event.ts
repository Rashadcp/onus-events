import mongoose, { Schema, Document } from 'mongoose';

export interface IEventItem {
  itemId: mongoose.Types.ObjectId;
  quantity: number;
}

export interface IDepartmentConfirmation {
  confirmed: boolean;
  confirmedBy?: mongoose.Types.ObjectId;
  confirmedAt?: Date;
}

export type EventStatus = 
  | 'INQUIRY'
  | 'QUOTATION'
  | 'APPROVED'
  | 'CONFIRMED'
  | 'LOADING'
  | 'DISPATCHED'
  | 'RETURNED'
  | 'CLOSED';

export interface IEvent extends Document {
  customerName: string;
  eventDate: {
    start: Date;
    end: Date;
  };
  timeWindow: {
    start: string; // HH:MM
    end: string;   // HH:MM
  };
  place: string;
  program: string;
  eventStatus: EventStatus;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  items: IEventItem[];
  confirmations: {
    COUNTER_DECOR: IDepartmentConfirmation;
    CLOTH_DECOR: IDepartmentConfirmation;
    RENTAL_ITEMS: IDepartmentConfirmation;
    EXPENSE_CHARGES: IDepartmentConfirmation;
    STAFF: IDepartmentConfirmation;
    OUTSIDE_RENTAL: IDepartmentConfirmation;
  };
  isCompleteEntry: boolean;
  assignedCaptain?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentConfirmationSchema = new Schema(
  {
    confirmed: { type: Boolean, default: false },
    confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    confirmedAt: { type: Date }
  },
  { _id: false }
);

const EventSchema: Schema = new Schema(
  {
    customerName: { type: String, required: true, trim: true },
    eventDate: {
      start: { type: Date, required: true },
      end: { type: Date, required: true }
    },
    timeWindow: {
      start: { type: String, required: true },
      end: { type: String, required: true }
    },
    place: { type: String, required: true, trim: true },
    program: { type: String, required: true, trim: true },
    eventStatus: { 
      type: String, 
      enum: ['INQUIRY', 'QUOTATION', 'APPROVED', 'CONFIRMED', 'LOADING', 'DISPATCHED', 'RETURNED', 'CLOSED'],
      default: 'INQUIRY'
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date },
    items: [
      {
        itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
        quantity: { type: Number, required: true, min: 1 }
      }
    ],
    confirmations: {
      COUNTER_DECOR: { type: DepartmentConfirmationSchema, default: () => ({}) },
      CLOTH_DECOR: { type: DepartmentConfirmationSchema, default: () => ({}) },
      RENTAL_ITEMS: { type: DepartmentConfirmationSchema, default: () => ({}) },
      EXPENSE_CHARGES: { type: DepartmentConfirmationSchema, default: () => ({}) },
      STAFF: { type: DepartmentConfirmationSchema, default: () => ({}) },
      OUTSIDE_RENTAL: { type: DepartmentConfirmationSchema, default: () => ({}) }
    },
    isCompleteEntry: { type: Boolean, default: false },
    assignedCaptain: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  {
    timestamps: true
  }
);

// Indexes
EventSchema.index({ customerName: 1 });
EventSchema.index({ 'eventDate.start': 1 });
EventSchema.index({ isDeleted: 1 });

export default mongoose.model<IEvent>('Event', EventSchema);
