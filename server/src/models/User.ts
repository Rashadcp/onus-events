import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 
  | 'ADMIN'
  | 'SALES_REPRESENTATIVE'
  | 'LOADING_STAFF'
  | 'SITE_INCHARGE'
  | 'CAPTAIN'
  | 'STORE_KEEPER';

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  monthlyBilling: number;
  incentiveRate: number;
  isActive: boolean;
  failedLoginAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['ADMIN', 'SALES_REPRESENTATIVE', 'LOADING_STAFF', 'SITE_INCHARGE', 'CAPTAIN', 'STORE_KEEPER'], 
      required: true 
    },
    monthlyBilling: { type: Number, default: 0, min: 0 },
    incentiveRate: { type: Number, default: 5, min: 0 },
    isActive: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IUser>('User', UserSchema);
