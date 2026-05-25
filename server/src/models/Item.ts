import mongoose, { Schema, Document } from 'mongoose';

export type ItemDepartment = 
  | 'COUNTER_DECOR' 
  | 'CLOTH_DECOR' 
  | 'RENTAL_ITEMS' 
  | 'EXPENSE_CHARGES' 
  | 'STAFF' 
  | 'OUTSIDE_RENTAL';

export interface IItem extends Document {
  itemCode: string;
  name: string;
  department: ItemDepartment;
  currentStock: number;
  rentalRate: number;
  saleRate: number;
  subItems: string[]; // List of other item codes grouped with this item
  imageUrl?: string;
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
      enum: ['COUNTER_DECOR', 'CLOTH_DECOR', 'RENTAL_ITEMS', 'EXPENSE_CHARGES', 'STAFF', 'OUTSIDE_RENTAL'],
      required: true
    },
    currentStock: { type: Number, required: true, min: 0 },
    rentalRate: { type: Number, required: true, min: 0 },
    saleRate: { type: Number, required: true, min: 0 },
    subItems: { type: [String], default: [] },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

// Indexes
ItemSchema.index({ itemCode: 1 });
ItemSchema.index({ department: 1 });

export default mongoose.model<IItem>('Item', ItemSchema);
