export interface User {
  id?: string;
  _id?: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'REPRESENTATIVE' | 'LOADING_STAFF' | 'SITE_INCHARGE';
  email: string;
  monthlyBilling?: number;
}

export interface Item {
  itemCode: string;
  name: string;
  department: 'COUNTER_DECOR' | 'CLOTH_DECOR' | 'RENTAL_ITEMS' | 'EXPENSE_CHARGES' | 'STAFF' | 'OUTSIDE_RENTAL';
  currentStock: number;
  rentalRate: number;
  saleRate: number;
  subItems?: string[];
  imageUrl?: string;
  isActive?: boolean;
  orderList?: string[];
}

export interface DepartmentConfirmation {
  confirmed: boolean;
  confirmedBy?: { fullName: string } | string | any;
  confirmedAt?: Date | string;
}

export interface EventItem {
  itemId: Item;
  quantity: number;
}

export interface Event {
  _id: string;
  customerName: string;
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
  createdBy?: { fullName: string; username: string } | any;
  deletedBy?: { fullName: string } | any;
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
}

export interface Customer {
  id: string;
  name: string;
  place: string;
  contact: string;
  historyCount: number;
}
