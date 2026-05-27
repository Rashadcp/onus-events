import mongoose, { Schema, Document } from 'mongoose';

export interface IItemGroup extends Document {
  key: string;          // Unique uppercase identifier e.g. "COUNTER_DECOR", "SOUND_SYSTEM"
  label: string;        // Human-readable display name e.g. "Counter Decor", "Sound System"
  description?: string; // Optional short description
  color?: string;       // Optional hex color for UI badge e.g. "#3b82f6"
  sortOrder: number;    // Display order in Create Event form
  isActive: boolean;
  isDefault: boolean;   // Built-in groups cannot be deleted
  createdAt: Date;
  updatedAt: Date;
}

const ItemGroupSchema: Schema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    color: {
      type: String,
      default: '#3b82f6'
    },
    sortOrder: {
      type: Number,
      default: 100
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

ItemGroupSchema.index({ key: 1 });
ItemGroupSchema.index({ sortOrder: 1 });

export default mongoose.model<IItemGroup>('ItemGroup', ItemGroupSchema);
