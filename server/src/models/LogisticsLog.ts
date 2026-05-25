import mongoose, { Schema, Document } from 'mongoose';

export type LogisticsStatus = 'LOADING_OUT' | 'RELOADING_IN' | 'COMPLETED';

export interface ILogisticsLog extends Document {
  eventId: mongoose.Types.ObjectId;
  status: LogisticsStatus;
  
  // Loading Details (Outward)
  loadingStaff: string[];
  loadingVehicle: {
    vehicleNo?: string;
    noOfLoads: number;
  };
  verifiedOut: Array<{
    itemId: mongoose.Types.ObjectId;
    quantity: number;
  }>;
  additionalItems: Array<{
    itemCode: string;
    quantity: number;
    referredBy: string; // Compulsory referral logging
  }>;
  shortItems: Array<{
    itemId: mongoose.Types.ObjectId;
    quantity: number;
  }>;
  modifiedBy: Array<{
    userId: mongoose.Types.ObjectId;
    modifiedAt: Date;
    changeDetails: string; // Logs what changes were done and who did it
  }>;

  // Reloading Details (Inward Return)
  reloadingStaff: string[];
  reloadingVehicle: {
    vehicleNo?: string;
    noOfLoads: number;
  };
  missingItems: Array<{
    itemId: mongoose.Types.ObjectId;
    quantity: number;
  }>;
  loadingCharges: number;
  splittingDetails?: string;

  createdAt: Date;
  updatedAt: Date;
}

const LogisticsLogSchema: Schema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, unique: true },
    status: {
      type: String,
      enum: ['LOADING_OUT', 'RELOADING_IN', 'COMPLETED'],
      default: 'LOADING_OUT'
    },
    loadingStaff: { type: [String], default: [] },
    loadingVehicle: {
      vehicleNo: { type: String, trim: true },
      noOfLoads: { type: Number, default: 1, min: 1 }
    },
    verifiedOut: [
      {
        itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
        quantity: { type: Number, required: true, min: 0 }
      }
    ],
    additionalItems: [
      {
        itemCode: { type: String, required: true, uppercase: true, trim: true },
        quantity: { type: Number, required: true, min: 1 },
        referredBy: { type: String, required: true, trim: true } // Compulsory referral field
      }
    ],
    shortItems: [
      {
        itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
        quantity: { type: Number, required: true, min: 1 }
      }
    ],
    modifiedBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        modifiedAt: { type: Date, default: Date.now },
        changeDetails: { type: String, required: true }
      }
    ],
    reloadingStaff: { type: [String], default: [] },
    reloadingVehicle: {
      vehicleNo: { type: String, trim: true },
      noOfLoads: { type: Number, default: 1, min: 1 }
    },
    missingItems: [
      {
        itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
        quantity: { type: Number, required: true, min: 1 }
      }
    ],
    loadingCharges: { type: Number, default: 0, min: 0 },
    splittingDetails: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

// Indexes
LogisticsLogSchema.index({ eventId: 1 });
LogisticsLogSchema.index({ status: 1 });

export default mongoose.model<ILogisticsLog>('LogisticsLog', LogisticsLogSchema);
