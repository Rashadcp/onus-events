import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'ADMIN' | 'REPRESENTATIVE' | 'LOADING_STAFF' | 'SITE_INCHARGE';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  fullName: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['ADMIN', 'REPRESENTATIVE', 'LOADING_STAFF', 'SITE_INCHARGE'], 
      required: true 
    },
    fullName: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date }
  },
  {
    timestamps: true
  }
);

// Indexing for performance
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });

export default mongoose.model<IUser>('User', UserSchema);
