import mongoose, { Schema, Document } from 'mongoose';

export type BillingDocumentType = 'QUOTATION' | 'INVOICE';
export type BillingCopyType = 'CUSTOMER_COPY' | 'STORE_COPY' | 'OFFICE_COPY';
export type BillingStatus = 'DRAFT' | 'SENT' | 'CONVERTED' | 'PAID' | 'CANCELLED';
export type DiscountType = 'PERCENTAGE' | 'FLAT';

export interface IBillingLineItem {
  itemId?: mongoose.Types.ObjectId;
  itemCode: string;
  description: string;
  quantity: number;
  rentalDays: number;
  unitRate: number;
  discountType: DiscountType;
  discountValue: number;
  gstRate: number;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
}

export interface IBillingTotals {
  subTotal: number;
  discountTotal: number;
  taxableTotal: number;
  gstTotal: number;
  grandTotal: number;
}

export interface IBillingDocument extends Document {
  documentType: BillingDocumentType;
  documentNumber: string;
  sourceQuotation?: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;
  customer: {
    name: string;
    phone?: string;
    gstin?: string;
    billingAddress?: string;
    eventPlace?: string;
  };
  event: {
    program?: string;
    startDate?: Date;
    endDate?: Date;
  };
  issueDate: Date;
  dueDate?: Date;
  status: BillingStatus;
  notes?: string;
  terms?: string;
  lineItems: IBillingLineItem[];
  totals: IBillingTotals;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BillingLineItemSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
    itemCode: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    rentalDays: { type: Number, required: true, min: 1 },
    unitRate: { type: Number, required: true, min: 0 },
    discountType: { type: String, enum: ['PERCENTAGE', 'FLAT'], default: 'FLAT' },
    discountValue: { type: Number, default: 0, min: 0 },
    gstRate: { type: Number, default: 18, min: 0 },
    taxableAmount: { type: Number, required: true, min: 0 },
    gstAmount: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const BillingDocumentSchema = new Schema(
  {
    documentType: { type: String, enum: ['QUOTATION', 'INVOICE'], required: true },
    documentNumber: { type: String, required: true, unique: true, trim: true },
    sourceQuotation: { type: Schema.Types.ObjectId, ref: 'BillingDocument' },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, trim: true },
      gstin: { type: String, trim: true, uppercase: true },
      billingAddress: { type: String, trim: true },
      eventPlace: { type: String, trim: true }
    },
    event: {
      program: { type: String, trim: true },
      startDate: { type: Date },
      endDate: { type: Date }
    },
    issueDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'CONVERTED', 'PAID', 'CANCELLED'],
      default: 'DRAFT'
    },
    notes: { type: String, trim: true },
    terms: { type: String, trim: true },
    lineItems: { type: [BillingLineItemSchema], default: [] },
    totals: {
      subTotal: { type: Number, required: true, min: 0 },
      discountTotal: { type: Number, required: true, min: 0 },
      taxableTotal: { type: Number, required: true, min: 0 },
      gstTotal: { type: Number, required: true, min: 0 },
      grandTotal: { type: Number, required: true, min: 0 }
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

BillingDocumentSchema.index({ documentType: 1, createdAt: -1 });
BillingDocumentSchema.index({ 'customer.name': 1 });
BillingDocumentSchema.index({ eventId: 1 });

export default mongoose.model<IBillingDocument>('BillingDocument', BillingDocumentSchema);
