import mongoose, { Schema, Document } from 'mongoose';

export type StockLogState = 
  | 'AVAILABLE' 
  | 'RESERVED' 
  | 'LOADED' 
  | 'DISPATCHED' 
  | 'RETURNED' 
  | 'DAMAGED';

export interface IStockLog extends Document {
  itemId: mongoose.Types.ObjectId;
  itemCode: string;
  previousStock: number;
  newStock: number;
  difference: number;
  state: StockLogState;
  warehouse: string;
  reason: string;       // "Initial Seeding", "Manual Adjustment", "Damage Log", "Returned Stock"
  modifiedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const StockLogSchema: Schema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    itemCode: { type: String, required: true, uppercase: true, trim: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    difference: { type: Number, required: true },
    state: {
      type: String,
      enum: ['AVAILABLE', 'RESERVED', 'LOADED', 'DISPATCHED', 'RETURNED', 'DAMAGED'],
      required: true
    },
    warehouse: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true },
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Indexes for robust querying speeds
StockLogSchema.index({ itemCode: 1 });
StockLogSchema.index({ itemId: 1 });
StockLogSchema.index({ createdAt: -1 });

export default mongoose.model<IStockLog>('StockLog', StockLogSchema);
