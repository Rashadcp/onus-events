import { LayoutDashboard, Plus, Calendar, History, Package, Users } from 'lucide-react';
import type React from 'react';

export type MenuKey =
  | 'dashboard'
  | 'create-event'
  | 'upcoming-events'
  | 'past-events'
  | 'free-stock'
  | 'customer-accounts';

export type DepartmentKey =
  | 'COUNTER_DECOR'
  | 'CLOTH_DECOR'
  | 'RENTAL_ITEMS'
  | 'EXPENSE_CHARGES'
  | 'STAFF'
  | 'OUTSIDE_RENTAL';

export const departments: { key: DepartmentKey; label: string }[] = [
  { key: 'COUNTER_DECOR', label: 'Counter Decor' },
  { key: 'CLOTH_DECOR', label: 'Cloth Decor' },
  { key: 'RENTAL_ITEMS', label: 'Rental Items' },
  { key: 'EXPENSE_CHARGES', label: 'Expense & Charges' },
  { key: 'STAFF', label: 'Staff' },
  { key: 'OUTSIDE_RENTAL', label: 'Outside Rental' },
];

export const programTypes = ['Wedding', 'Reception', 'Breakfast', 'Lunch', 'Dinner', 'Conference', 'Outdoor Event'];

export const representativeMenuItems = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'create-event', label: 'Create / Edit Event', icon: Plus },
  { key: 'upcoming-events', label: 'Upcoming Events', icon: Calendar },
  { key: 'past-events', label: 'Past Events', icon: History },
  { key: 'free-stock', label: 'Free Stock check', icon: Package },
  { key: 'customer-accounts', label: 'Customer Accounts', icon: Users },
] satisfies Array<{ key: MenuKey; label: string; icon: React.ComponentType<{ className?: string }> }>;
