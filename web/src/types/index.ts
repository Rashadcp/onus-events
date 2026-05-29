export interface User {
  id?: string;
  _id?: string;
  username?: string;
  fullName?: string;
  name?: string;
  phone?: string;
  role: 'ADMIN' | 'SALES_REPRESENTATIVE' | 'REPRESENTATIVE' | 'LOADING_STAFF' | 'SITE_INCHARGE' | 'CAPTAIN' | 'STORE_KEEPER';
  email: string;
  isActive?: boolean;
  monthlyBilling?: number;
  incentiveRate?: number;
}

export interface Item {
  _id?: string;
  id?: string;
  itemCode: string;
  name: string;
  department: string; // Flexible: built-in or custom admin group key
  currentStock: number;
  minimumStock: number;
  rentalRate: number;
  saleRate: number;
  warehouse?: string;
  category?: string;
  status?: 'AVAILABLE' | 'RESERVED' | 'LOADED' | 'DISPATCHED' | 'RETURNED' | 'DAMAGED';
  subItems?: string[];
  imageUrl?: string;
  isActive?: boolean;
  orderList?: string[];
}

export interface DepartmentConfirmation {
  confirmed: boolean;
  confirmedBy?: { fullName?: string; name?: string } | string | any;
  confirmedAt?: Date | string;
}

export interface EventItem {
  itemId: Item;
  quantity: number;
}

export interface Event {
  _id: string;
  customerName: string;
  eventStatus?: 'INQUIRY' | 'QUOTATION' | 'APPROVED' | 'CONFIRMED' | 'LOADING' | 'DISPATCHED' | 'RETURNED' | 'CLOSED';
  eventDate: {
    start: Date | string;
    end: Date | string;
  };
  timeWindow: {
    start: string;
    end: string;
  };
  place: string;
  program: string;
  isDeleted: boolean;
  createdBy?: { fullName?: string; name?: string; username?: string; email?: string } | any;
  deletedBy?: { fullName?: string; name?: string } | any;
  deletedAt?: Date | string;
  items?: EventItem[];
  confirmations: {
    COUNTER_DECOR?: DepartmentConfirmation;
    CLOTH_DECOR?: DepartmentConfirmation;
    RENTAL_ITEMS?: DepartmentConfirmation;
    EXPENSE_CHARGES?: DepartmentConfirmation;
    STAFF?: DepartmentConfirmation;
    OUTSIDE_RENTAL?: DepartmentConfirmation;
  } | any;
  assignedCaptain?: string | any;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Customer {
  id: string;
  name: string;
  place: string;
  contact: string;
  historyCount: number;
}

export type BillingDocumentType = 'QUOTATION' | 'INVOICE';
export type BillingCopyType = 'CUSTOMER_COPY' | 'STORE_COPY' | 'OFFICE_COPY';
export type DiscountType = 'PERCENTAGE' | 'FLAT';

export interface BillingLineItem {
  itemId?: string;
  itemCode?: string;
  description: string;
  quantity: number;
  rentalDays: number;
  unitRate: number;
  discountType: DiscountType;
  discountValue: number;
  gstRate: number;
  taxableAmount?: number;
  gstAmount?: number;
  totalAmount?: number;
}

export interface BillingTotals {
  subTotal: number;
  discountTotal: number;
  taxableTotal: number;
  gstTotal: number;
  grandTotal: number;
}

export interface BillingDocument {
  _id: string;
  documentType: BillingDocumentType;
  documentNumber: string;
  sourceQuotation?: string;
  eventId?: string | Event;
  customer: {
    name: string;
    phone?: string;
    gstin?: string;
    billingAddress?: string;
    eventPlace?: string;
  };
  event?: {
    program?: string;
    startDate?: string;
    endDate?: string;
  };
  issueDate: string;
  dueDate?: string;
  status: 'DRAFT' | 'SENT' | 'CONVERTED' | 'PAID' | 'CANCELLED';
  notes?: string;
  terms?: string;
  lineItems: BillingLineItem[];
  totals: BillingTotals;
  createdAt?: string;
}
