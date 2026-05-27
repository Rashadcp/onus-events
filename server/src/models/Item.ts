import mongoose, { Schema, Document } from 'mongoose';

// Department is now a flexible string matching any group key (built-in or custom)
export type ItemDepartment = string;


export type ItemStatus = 
  | 'AVAILABLE' 
  | 'RESERVED' 
  | 'LOADED' 
  | 'DISPATCHED' 
  | 'RETURNED' 
  | 'DAMAGED';

export interface IItem extends Document {
  itemCode: string;
  name: string;
  department: ItemDepartment;
  currentStock: number;
  minimumStock: number;
  rentalRate: number;
  saleRate: number;
  warehouse: string;
  category: string;
  status: ItemStatus;
  subItems: string[]; // List of other item codes grouped with this item
  imageUrl?: string;
  orderList: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema: Schema = new Schema(
  {
    itemCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    department: {
      type: String,
      required: true,
      trim: true
    },
    currentStock: { type: Number, required: true, min: 0 },
    minimumStock: { type: Number, required: true, min: 0, default: 5 },
    rentalRate: { type: Number, required: true, min: 0 },
    saleRate: { type: Number, required: true, min: 0 },
    warehouse: { type: String, required: true, default: 'Main Warehouse', trim: true },
    category: { type: String, required: true, default: 'General', trim: true },
    status: {
      type: String,
      enum: ['AVAILABLE', 'RESERVED', 'LOADED', 'DISPATCHED', 'RETURNED', 'DAMAGED'],
      required: true,
      default: 'AVAILABLE'
    },
    subItems: { type: [String], default: [] },
    imageUrl: { type: String },
    orderList: { type: [String], default: [] },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

// Indexes
ItemSchema.index({ itemCode: 1 });
ItemSchema.index({ department: 1 });
ItemSchema.index({ category: 1 });

export default mongoose.model<IItem>('Item', ItemSchema);
