"use client";

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import {
  Calendar,
  Copy,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Printer,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { AuthGuard } from '../../components/auth/AuthGuard';
import {
  convertQuotationToInvoiceApi,
  createBillingDocumentApi,
  getEventsApi,
  getInventoryApi,
} from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { BillingCopyType, BillingLineItem, Event, Item } from '../../types';

type MenuKey = 'dashboard' | 'create-event' | 'upcoming-events' | 'past-events' | 'free-stock' | 'customer-accounts';
type EventStatus = 'Inquiry' | 'Quotation' | 'Approved' | 'Confirmed' | 'Completed';
type DepartmentKey = 'counterDecor' | 'clothDecor' | 'rentalItems' | 'expenseCharges' | 'staff' | 'outsideRental';
type PrintType = 'Customer Copy' | 'Department Copy' | 'Store Copy';

interface StockItem {
  id: string;
  name: string;
  department: DepartmentKey;
  currentStock: number;
  reservedStock: number;
  damagedStock: number;
  rate: number;
}

interface SalesEvent {
  id: string;
  eventName: string;
  customer: string;
  phone: string;
  venue: string;
  date: string;
  status: EventStatus;
  finalAmount: number;
}

interface CustomerAccount {
  id: string;
  name: string;
  phone: string;
  address: string;
  totalEvents: number;
  pendingAmount: number;
  lastEventDate: string;
}

const departments: { key: DepartmentKey; label: string }[] = [
  { key: 'counterDecor', label: 'Counter Decor' },
  { key: 'clothDecor', label: 'Cloth Decor' },
  { key: 'rentalItems', label: 'Rental Items' },
  { key: 'expenseCharges', label: 'Expense & Charges' },
  { key: 'staff', label: 'Staff' },
  { key: 'outsideRental', label: 'Outside Rental' },
];

const programTypes = ['Wedding', 'Reception', 'Breakfast', 'Lunch', 'Dinner', 'Conference', 'Outdoor Event'];

const stockItems: StockItem[] = [
  { id: 'chair', name: 'Plastic Chair', department: 'rentalItems', currentStock: 500, reservedStock: 120, damagedStock: 8, rate: 12 },
  { id: 'round-table', name: 'Round Table', department: 'rentalItems', currentStock: 80, reservedStock: 25, damagedStock: 2, rate: 90 },
  { id: 'stage-cloth', name: 'Stage Cloth Blue', department: 'clothDecor', currentStock: 60, reservedStock: 18, damagedStock: 1, rate: 150 },
  { id: 'flower-arch', name: 'Flower Arch', department: 'counterDecor', currentStock: 20, reservedStock: 6, damagedStock: 0, rate: 1800 },
  { id: 'counter-light', name: 'Counter Light Set', department: 'counterDecor', currentStock: 35, reservedStock: 10, damagedStock: 3, rate: 250 },
  { id: 'service-staff', name: 'Service Staff', department: 'staff', currentStock: 45, reservedStock: 14, damagedStock: 0, rate: 900 },
  { id: 'transport', name: 'Transport Charge', department: 'expenseCharges', currentStock: 999, reservedStock: 0, damagedStock: 0, rate: 2500 },
  { id: 'generator', name: 'Outside Generator', department: 'outsideRental', currentStock: 8, reservedStock: 3, damagedStock: 0, rate: 3500 },
];

const sampleEvents: SalesEvent[] = [
  { id: 'EV-101', eventName: 'Reception Night', customer: 'Rashad Cp', phone: '9562703957', venue: 'Town Hall', date: '2026-05-26', status: 'Confirmed', finalAmount: 46500 },
  { id: 'EV-102', eventName: 'Wedding Stage', customer: 'Amina K', phone: '9846001122', venue: 'Pearl Auditorium', date: '2026-05-27', status: 'Quotation', finalAmount: 38200 },
  { id: 'EV-103', eventName: 'Lunch Program', customer: 'Navas P', phone: '9895005522', venue: 'Green Garden', date: '2026-05-29', status: 'Inquiry', finalAmount: 12800 },
  { id: 'EV-099', eventName: 'Conference Setup', customer: 'Bright Foods', phone: '9745001000', venue: 'Business Center', date: '2026-05-20', status: 'Completed', finalAmount: 24000 },
  { id: 'EV-098', eventName: 'Outdoor Event', customer: 'Sana M', phone: '9567123012', venue: 'Lake View Ground', date: '2026-05-18', status: 'Completed', finalAmount: 31000 },
];

const sampleCustomers: CustomerAccount[] = [
  { id: 'C-01', name: 'Rashad Cp', phone: '9562703957', address: 'Calicut, Kerala', totalEvents: 3, pendingAmount: 4500, lastEventDate: '2026-05-26' },
  { id: 'C-02', name: 'Amina K', phone: '9846001122', address: 'Kozhikode, Kerala', totalEvents: 1, pendingAmount: 0, lastEventDate: '2026-05-27' },
  { id: 'C-03', name: 'Bright Foods', phone: '9745001000', address: 'Kannur, Kerala', totalEvents: 5, pendingAmount: 12000, lastEventDate: '2026-05-20' },
];

function availableStock(item: StockItem) {
  return Math.max(0, item.currentStock - item.reservedStock - item.damagedStock);
}

function statusBadge(status: EventStatus) {
  const classes: Record<EventStatus, string> = {
    Inquiry: 'bg-slate-100 text-slate-700 border-slate-200',
    Quotation: 'bg-amber-50 text-amber-700 border-amber-200',
    Approved: 'bg-blue-50 text-blue-700 border-blue-200',
    Confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Completed: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return <span className={`rounded border px-2 py-1 text-xs font-medium ${classes[status]}`}>{status}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 ${props.className || ''}`}
    />
  );
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 ${props.className || ''}`}
    />
  );
}

function SimpleButton({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600',
    secondary: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 border-red-600',
  };

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function ConfirmDialog({
  title,
  message,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <SimpleButton variant="secondary" onClick={onCancel}>Cancel</SimpleButton>
          <SimpleButton onClick={onConfirm}>Confirm</SimpleButton>
        </div>
      </div>
    </div>
  );
}

function PrintDialog({ onClose, onPrint }: { onClose: () => void; onPrint: (type: PrintType) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 print:hidden">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h3 className="text-base font-semibold text-slate-900">Print Event Copy</h3>
        <p className="mt-1 text-sm text-slate-600">Choose the copy type to print.</p>
        <div className="mt-5 grid gap-2">
          {(['Customer Copy', 'Department Copy', 'Store Copy'] as PrintType[]).map((type) => (
            <SimpleButton key={type} variant="secondary" onClick={() => onPrint(type)} className="justify-start">
              <Printer className="h-4 w-4" />
              {type}
            </SimpleButton>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <SimpleButton variant="secondary" onClick={onClose}>Close</SimpleButton>
        </div>
      </div>
    </div>
  );
}

export default function SalesRepresentativeModule() {
  const { user, logout } = useAuthStore();
  const [activeMenu, setActiveMenu] = useState<MenuKey>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('2026-05-19');
  const [dateTo, setDateTo] = useState('2026-05-26');
  const [selectedCustomerId, setSelectedCustomerId] = useState(sampleCustomers[0].id);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const today = '2026-05-26';
  const upcomingEvents = sampleEvents.filter((event) => event.date >= today && event.status !== 'Completed');
  const pastEvents = sampleEvents.filter((event) => event.date < today || event.status === 'Completed');
  const todayEvents = sampleEvents.filter((event) => event.date === today);
  const pendingQuotations = sampleEvents.filter((event) => event.status === 'Quotation');

  const filteredUpcoming = upcomingEvents.filter((event) => {
    const matchesSearch = [event.eventName, event.customer, event.venue].join(' ').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || event.status === statusFilter;
    const matchesDate = !dateFilter || event.date === dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const filteredPast = pastEvents.filter((event) => {
    const matchesSearch = [event.eventName, event.customer].join(' ').toLowerCase().includes(search.toLowerCase());
    return matchesSearch && event.date >= dateFrom && event.date <= dateTo;
  });

  const selectedCustomer = sampleCustomers.find((customer) => customer.id === selectedCustomerId) || sampleCustomers[0];
  const customerEvents = sampleEvents.filter((event) => event.customer === selectedCustomer.name);

  const triggerPrint = () => {
    setPrintOpen(false);
    window.setTimeout(() => window.print(), 50);
  };

  const menus: { key: MenuKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'create-event', label: 'Create Event', icon: Plus },
    { key: 'upcoming-events', label: 'Upcoming Events', icon: Calendar },
    { key: 'past-events', label: 'Past Events', icon: History },
    { key: 'free-stock', label: 'Free Stock', icon: Package },
    { key: 'customer-accounts', label: 'Customer Accounts', icon: Users },
  ];

  return (
    <AuthGuard allowedRoles={['SALES_REPRESENTATIVE']}>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="rounded-md border border-slate-300 p-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">Window 1 - Sales Representatives</h1>
                <p className="text-xs text-slate-500">ONUS Event Rental ERP</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium">{user?.fullName || user?.name || 'Sales Representative'}</p>
                <p className="text-xs text-slate-500">Representative ID: {user?.email}</p>
              </div>
              <SimpleButton variant="secondary" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Logout
              </SimpleButton>
            </div>
          </div>
        </header>

        <div className="flex">
          {mobileOpen && <button className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}

          <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white p-4 print:hidden lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)] ${mobileOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <span className="font-semibold">Menus</span>
              <button onClick={() => setMobileOpen(false)} className="rounded-md p-2 hover:bg-slate-100" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {menus.map((menu) => {
                const Icon = menu.icon;
                const active = activeMenu === menu.key;
                return (
                  <button
                    key={menu.key}
                    onClick={() => {
                      setActiveMenu(menu.key);
                      setMobileOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium ${
                      active ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {menu.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="w-full p-4 lg:p-6 print:p-0">
            <div className="mx-auto max-w-7xl space-y-5">
              {activeMenu === 'dashboard' && (
                <>
                  <PageTitle title="Dashboard" description="Quick view of events, quotations, and customers." />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard label="Upcoming Events" value={upcomingEvents.length} />
                    <MetricCard label="Today's Events" value={todayEvents.length} />
                    <MetricCard label="Pending Quotations" value={pendingQuotations.length} />
                    <MetricCard label="Total Customers" value={sampleCustomers.length} />
                  </div>
                  <div className="grid gap-5 lg:grid-cols-3">
                    <SectionCard title="Recent Events Table">
                      <EventTable events={sampleEvents.slice(0, 4)} />
                    </SectionCard>
                    <SectionCard title="Upcoming Event List">
                      <div className="space-y-3">
                        {upcomingEvents.map((event) => (
                          <div key={event.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                            <p className="font-medium">{event.eventName}</p>
                            <p className="text-sm text-slate-600">{event.customer} - {event.date}</p>
                            <p className="text-sm text-slate-600">{event.venue}</p>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  </div>
                </>
              )}

              {activeMenu === 'create-event' && (
                <BillingWorkflow />
                      )}

              {activeMenu === 'upcoming-events' && (
                <>
                  <PageTitle title="Upcoming Events" description="Search, filter, and review upcoming bookings." />
                  <Filters search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter} dateFilter={dateFilter} setDateFilter={setDateFilter} />
                  <SectionCard title="Event Table">
                    <EventTable events={filteredUpcoming} />
                  </SectionCard>
                </>
              )}

              {activeMenu === 'past-events' && (
                <>
                  <PageTitle title="Past Events" description="View one week past events, reprint quotations, or duplicate event data." />
                  <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
                    <Field label="Search Events"><TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" /></Field>
                    <Field label="From Date"><TextInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></Field>
                    <Field label="To Date"><TextInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></Field>
                  </div>
                  <SectionCard title="Past Event Table">
                    <EventTable events={filteredPast} showAmount showPastActions onPrint={() => setPrintOpen(true)} />
                  </SectionCard>
                </>
              )}

              {activeMenu === 'free-stock' && (
                <>
                  <PageTitle title="Free Stock" description="Check item availability before creating a quotation." />
                  <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-5">
                    <Field label="Department">
                      <SelectInput>
                        <option>All Departments</option>
                        {departments.map((dept) => <option key={dept.key}>{dept.label}</option>)}
                      </SelectInput>
                    </Field>
                    <Field label="From Date"><TextInput type="date" /></Field>
                    <Field label="To Date"><TextInput type="date" /></Field>
                    <Field label="From Time"><TextInput type="time" /></Field>
                    <Field label="To Time"><TextInput type="time" /></Field>
                  </div>
                  <SectionCard title="Available Items">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-3">Item Name</th>
                            <th className="px-3 py-3">Department</th>
                            <th className="px-3 py-3">Available Quantity</th>
                            <th className="px-3 py-3">Reserved Quantity</th>
                            <th className="px-3 py-3">Damaged Stock</th>
                            <th className="px-3 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockItems.map((item) => (
                            <tr key={item.id} className="border-t border-slate-100">
                              <td className="px-3 py-3 font-medium">{item.name}</td>
                              <td className="px-3 py-3">{departments.find((dept) => dept.key === item.department)?.label}</td>
                              <td className="px-3 py-3">{availableStock(item)}</td>
                              <td className="px-3 py-3">{item.reservedStock}</td>
                              <td className="px-3 py-3">{item.damagedStock}</td>
                              <td className="px-3 py-3">{availableStock(item) > 0 ? statusBadge('Confirmed') : statusBadge('Inquiry')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                </>
              )}

              {activeMenu === 'customer-accounts' && (
                <>
                  <PageTitle title="Customer Accounts" description="Search customers, check event history, and see pending dues." />
                  <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                    <SectionCard title="Customer List">
                      <div className="mb-3 flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input className="w-full text-sm outline-none" placeholder="Search customer" />
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                              <th className="px-3 py-3">Customer Name</th>
                              <th className="px-3 py-3">Phone</th>
                              <th className="px-3 py-3">Total Events</th>
                              <th className="px-3 py-3">Pending Amount</th>
                              <th className="px-3 py-3">Last Event Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sampleCustomers.map((customer) => (
                              <tr
                                key={customer.id}
                                onClick={() => setSelectedCustomerId(customer.id)}
                                className={`cursor-pointer border-t border-slate-100 ${selectedCustomerId === customer.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                              >
                                <td className="px-3 py-3 font-medium">{customer.name}</td>
                                <td className="px-3 py-3">{customer.phone}</td>
                                <td className="px-3 py-3">{customer.totalEvents}</td>
                                <td className="px-3 py-3">Rs. {customer.pendingAmount.toLocaleString()}</td>
                                <td className="px-3 py-3">{customer.lastEventDate}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </SectionCard>

                    <SectionCard title="Customer Details">
                      <div className="space-y-4 text-sm">
                        <div>
                          <p className="font-semibold">{selectedCustomer.name}</p>
                          <p className="text-slate-600">{selectedCustomer.phone}</p>
                          <p className="text-slate-600">{selectedCustomer.address}</p>
                        </div>
                        <div className="rounded-md bg-slate-50 p-3">
                          <p className="font-medium">Pending Dues</p>
                          <p className="text-lg font-semibold text-red-600">Rs. {selectedCustomer.pendingAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="mb-2 font-medium">Event History</p>
                          <div className="space-y-2">
                            {customerEvents.map((event) => (
                              <div key={event.id} className="rounded-md border border-slate-200 p-2">
                                <p className="font-medium">{event.eventName}</p>
                                <p className="text-slate-600">{event.date} - Rs. {event.finalAmount.toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 font-medium">Previous Quotations</p>
                          <SimpleButton variant="secondary" className="w-full"><FileText className="h-4 w-4" />View Quotations</SimpleButton>
                        </div>
                      </div>
                    </SectionCard>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>

        {confirmMessage && (
          <ConfirmDialog
            title="Please Confirm"
            message={confirmMessage}
            onCancel={() => setConfirmMessage(null)}
            onConfirm={() => setConfirmMessage(null)}
          />
        )}

        {printOpen && <PrintDialog onClose={() => setPrintOpen(false)} onPrint={triggerPrint} />}
      </div>
    </AuthGuard>
  );
}

type BillingDraftLine = Omit<BillingLineItem, 'taxableAmount' | 'gstAmount' | 'totalAmount'>;

interface BillingDraft {
  selectedEventId: string;
  customerName: string;
  phone: string;
  gstin: string;
  eventPlace: string;
  programType: string;
  billingAddress: string;
  notes: string;
  paymentReceived: number;
  lines: BillingDraftLine[];
  copyType: BillingCopyType;
  savedQuotationId?: string;
}

interface BillingDraftStore extends BillingDraft {
  setField: <K extends keyof BillingDraft>(key: K, value: BillingDraft[K]) => void;
  applyEvent: (event: Event) => void;
  addLine: () => void;
  updateLine: (index: number, patch: Partial<BillingDraftLine>) => void;
  removeLine: (index: number) => void;
}

const emptyBillingLine = (): BillingDraftLine => ({
  itemId: '',
  itemCode: '',
  description: '',
  quantity: 1,
  rentalDays: 1,
  unitRate: 0,
  discountType: 'FLAT',
  discountValue: 0,
  gstRate: 18,
});

const useBillingDraftStore = create<BillingDraftStore>((set) => ({
  selectedEventId: '',
  customerName: '',
  phone: '',
  gstin: '',
  eventPlace: '',
  programType: programTypes[0],
  billingAddress: '',
  notes: '',
  paymentReceived: 0,
  lines: [emptyBillingLine()],
  copyType: 'CUSTOMER_COPY',
  setField: (key, value) => set({ [key]: value } as Pick<BillingDraft, typeof key>),
  applyEvent: (event) => set({
    selectedEventId: event._id,
    customerName: event.customerName || '',
    eventPlace: event.place || '',
    programType: event.program || programTypes[0],
    notes: event.timeWindow?.start && event.timeWindow?.end ? `Event time: ${event.timeWindow.start} - ${event.timeWindow.end}` : '',
  }),
  addLine: () => set((state) => ({ lines: [...state.lines, emptyBillingLine()] })),
  updateLine: (index, patch) => set((state) => ({
    lines: state.lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line),
  })),
  removeLine: (index) => set((state) => ({
    lines: state.lines.length === 1 ? [emptyBillingLine()] : state.lines.filter((_, lineIndex) => lineIndex !== index),
  })),
}));

const fallbackInventory: Item[] = stockItems.map((item) => ({
  id: item.id,
  itemCode: item.id,
  name: item.name,
  department: item.department.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase() as Item['department'],
  currentStock: availableStock(item),
  minimumStock: 0,
  rentalRate: item.rate,
  saleRate: item.rate,
  status: 'AVAILABLE',
}));

const fallbackEvents: Event[] = sampleEvents.map((event) => ({
  _id: event.id,
  customerName: event.customer,
  eventStatus: event.status === 'Completed' ? 'CLOSED' : event.status.toUpperCase() as Event['eventStatus'],
  eventDate: { start: event.date, end: event.date },
  timeWindow: { start: '', end: '' },
  place: event.venue,
  program: event.eventName,
  isDeleted: false,
  confirmations: {},
}));

function money(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function calculateLine(line: BillingDraftLine) {
  const quantity = Math.max(0, Number(line.quantity) || 0);
  const days = Math.max(0, Number(line.rentalDays) || 0);
  const rate = Math.max(0, Number(line.unitRate) || 0);
  const gross = quantity * days * rate;
  const discount = line.discountType === 'PERCENTAGE'
    ? gross * (Math.max(0, Number(line.discountValue) || 0) / 100)
    : Math.max(0, Number(line.discountValue) || 0);
  const taxableAmount = Math.max(0, gross - discount);
  const gstAmount = taxableAmount * (Math.max(0, Number(line.gstRate) || 0) / 100);
  return { taxableAmount, gstAmount, totalAmount: taxableAmount + gstAmount, discount };
}

function BillingWorkflow() {
  const {
    selectedEventId,
    customerName,
    phone,
    gstin,
    eventPlace,
    programType,
    billingAddress,
    notes,
    paymentReceived,
    lines,
    copyType,
    savedQuotationId,
    setField,
    applyEvent,
    addLine,
    updateLine,
    removeLine,
  } = useBillingDraftStore();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: backendEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['representative-billing-events'],
    queryFn: getEventsApi,
    retry: 1,
  });
  const { data: backendItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['representative-billing-inventory'],
    queryFn: getInventoryApi,
    retry: 1,
  });

  const events = backendEvents.length ? backendEvents : fallbackEvents;
  const inventoryItems = backendItems.length ? backendItems : fallbackInventory;

  const computedLines = useMemo(() => lines.map((line) => ({ ...line, ...calculateLine(line) })), [lines]);
  const totals = useMemo(() => {
    const subTotal = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.rentalDays) || 0) * (Number(line.unitRate) || 0), 0);
    const discountTotal = lines.reduce((sum, line) => sum + calculateLine(line).discount, 0);
    const taxableTotal = computedLines.reduce((sum, line) => sum + (line.taxableAmount || 0), 0);
    const gstTotal = computedLines.reduce((sum, line) => sum + (line.gstAmount || 0), 0);
    const grandTotal = computedLines.reduce((sum, line) => sum + (line.totalAmount || 0), 0);
    return { subTotal, discountTotal, taxableTotal, gstTotal, grandTotal, balance: Math.max(0, grandTotal - paymentReceived) };
  }, [computedLines, lines, paymentReceived]);

  const stockWarnings = useMemo(() => lines.flatMap((line) => {
    const item = inventoryItems.find((candidate) => candidate.itemCode === line.itemCode || candidate._id === line.itemId || candidate.id === line.itemId);
    if (!item || !line.itemCode) return [];
    return Number(line.quantity) > Number(item.currentStock || 0)
      ? [`${item.name} has only ${item.currentStock} available.`]
      : [];
  }), [inventoryItems, lines]);

  const saveQuotation = useMutation({
    mutationFn: () => createBillingDocumentApi({
      documentType: 'QUOTATION',
      eventId: selectedEventId || undefined,
      customer: { name: customerName, phone, gstin, billingAddress, eventPlace },
      event: { program: programType },
      notes,
      terms: 'Rental charges are calculated by quantity, days, discount, and GST.',
      lineItems: lines,
    }),
    onSuccess: (document) => {
      setField('savedQuotationId', document._id);
      setMessage(`Quotation ${document.documentNumber} saved.`);
      setErrorMessage(null);
    },
    onError: (error) => setErrorMessage(error instanceof Error ? error.message : 'Unable to save quotation.'),
  });

  const generateInvoice = useMutation({
    mutationFn: async () => {
      if (savedQuotationId) return convertQuotationToInvoiceApi(savedQuotationId);
      return createBillingDocumentApi({
        documentType: 'INVOICE',
        eventId: selectedEventId || undefined,
        customer: { name: customerName, phone, gstin, billingAddress, eventPlace },
        event: { program: programType },
        notes,
        terms: 'Generated from the representative billing workflow.',
        lineItems: lines,
      });
    },
    onSuccess: (document) => {
      setMessage(`Invoice ${document.documentNumber} generated.`);
      setErrorMessage(null);
    },
    onError: (error) => setErrorMessage(error instanceof Error ? error.message : 'Unable to generate invoice.'),
  });

  const onEventChange = (eventId: string) => {
    setField('selectedEventId', eventId);
    const selectedEvent = events.find((event) => event._id === eventId);
    if (selectedEvent) applyEvent(selectedEvent);
  };

  const onItemChange = (lineIndex: number, itemCode: string) => {
    const selectedItem = inventoryItems.find((item) => item.itemCode === itemCode);
    updateLine(lineIndex, {
      itemCode,
      itemId: selectedItem?._id || selectedItem?.id || '',
      description: selectedItem?.name || '',
      unitRate: selectedItem?.rentalRate || 0,
    });
  };

  const canSave = Boolean(customerName && lines.some((line) => line.description && Number(line.quantity) > 0)) && stockWarnings.length === 0;

  return (
    <>
      <PageTitle title="Quotation & Invoices" description="Select an event, price rental items, save quotation, generate invoice, and print copies." />
      <WorkflowSteps currentStep={savedQuotationId ? 6 : lines.some((line) => line.description) ? 4 : selectedEventId ? 2 : 1} />

      {(eventsLoading || itemsLoading) && <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">Fetching events and inventory from backend...</p>}
      {message && <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
      {errorMessage && <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className="space-y-6 print:hidden">
          <CustomerEventSection
            events={events}
            selectedEventId={selectedEventId}
            customerName={customerName}
            phone={phone}
            gstin={gstin}
            eventPlace={eventPlace}
            programType={programType}
            billingAddress={billingAddress}
            onEventChange={onEventChange}
            setField={setField}
          />
          <PricingTable
            lines={lines}
            computedLines={computedLines}
            inventoryItems={inventoryItems}
            stockWarnings={stockWarnings}
            onAdd={addLine}
            onRemove={removeLine}
            onUpdate={updateLine}
            onItemChange={onItemChange}
          />
          <SectionCard title="Notes">
            <textarea
              value={notes}
              onChange={(event) => setField('notes', event.target.value)}
              className="min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              placeholder="Customer instructions, transport details, setup remarks, payment terms"
            />
          </SectionCard>
          <BillingControls
            canSave={canSave}
            savePending={saveQuotation.isPending}
            invoicePending={generateInvoice.isPending}
            onSave={() => saveQuotation.mutate()}
            onInvoice={() => generateInvoice.mutate()}
          />
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <InvoicePreview
            copyType={copyType}
            customerName={customerName}
            phone={phone}
            gstin={gstin}
            eventPlace={eventPlace}
            programType={programType}
            billingAddress={billingAddress}
            notes={notes}
            lines={computedLines}
            totals={totals}
          />
          <div className="print:hidden">
            <TotalsCard totals={totals} paymentReceived={paymentReceived} onPaymentChange={(value) => setField('paymentReceived', value)} />
          </div>
          <div className="print:hidden">
            <PrintActions copyType={copyType} setCopyType={(value) => setField('copyType', value)} />
          </div>
        </aside>
      </div>
    </>
  );
}

function WorkflowSteps({ currentStep }: { currentStep: number }) {
  const steps = ['Select Event', 'Auto Fetch Customer', 'Add Pricing Items', 'Calculate Totals', 'Save Quotation', 'Generate Invoice', 'Print'];
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex min-w-[780px] items-center gap-2">
        {steps.map((step, index) => {
          const active = index + 1 <= currentStep;
          return (
            <div key={step} className={`flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium ${active ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${active ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}`}>{index + 1}</span>
              <span className="whitespace-nowrap">{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CustomerEventSection({
  events,
  selectedEventId,
  customerName,
  phone,
  gstin,
  eventPlace,
  programType,
  billingAddress,
  onEventChange,
  setField,
}: {
  events: Event[];
  selectedEventId: string;
  customerName: string;
  phone: string;
  gstin: string;
  eventPlace: string;
  programType: string;
  billingAddress: string;
  onEventChange: (eventId: string) => void;
  setField: BillingDraftStore['setField'];
}) {
  return (
    <SectionCard title="1. Customer & Event Information">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Link Event">
          <SelectInput value={selectedEventId} onChange={(event) => onEventChange(event.target.value)} className="h-11">
            <option value="">Manual quotation</option>
            {events.map((event) => (
              <option key={event._id} value={event._id}>{event.customerName} - {event.program || event.place}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Program Type">
          <TextInput value={programType} onChange={(event) => setField('programType', event.target.value)} className="h-11" placeholder="Wedding, reception, conference" />
        </Field>
        <Field label="Customer Name">
          <TextInput value={customerName} onChange={(event) => setField('customerName', event.target.value)} className="h-11" placeholder="Customer name" />
        </Field>
        <Field label="Phone">
          <TextInput value={phone} onChange={(event) => setField('phone', event.target.value)} className="h-11" placeholder="Phone number" />
        </Field>
        <Field label="GSTIN">
          <TextInput value={gstin} onChange={(event) => setField('gstin', event.target.value.toUpperCase())} className="h-11" placeholder="Optional GSTIN" />
        </Field>
        <Field label="Event Place">
          <TextInput value={eventPlace} onChange={(event) => setField('eventPlace', event.target.value)} className="h-11" placeholder="Venue or place" />
        </Field>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 md:col-span-2">
          Billing Address
          <textarea
            value={billingAddress}
            onChange={(event) => setField('billingAddress', event.target.value)}
            className="min-h-20 rounded-md border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
            placeholder="Billing address for customer copy"
          />
        </label>
      </div>
    </SectionCard>
  );
}

function PricingTable({
  lines,
  computedLines,
  inventoryItems,
  stockWarnings,
  onAdd,
  onRemove,
  onUpdate,
  onItemChange,
}: {
  lines: BillingDraftLine[];
  computedLines: BillingLineItem[];
  inventoryItems: Item[];
  stockWarnings: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<BillingDraftLine>) => void;
  onItemChange: (index: number, itemCode: string) => void;
}) {
  return (
    <SectionCard title="2. Rental Pricing Table">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Rates auto-fill from inventory. Quantity is checked against available stock.</p>
        <SimpleButton variant="secondary" onClick={onAdd}><Plus className="h-4 w-4" />Add Row</SimpleButton>
      </div>
      {stockWarnings.length > 0 && (
        <div className="mb-4 space-y-1 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {stockWarnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      )}
      <div className="max-h-[520px] overflow-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Item</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3">Quantity</th>
              <th className="px-3 py-3">Days</th>
              <th className="px-3 py-3">Rate</th>
              <th className="px-3 py-3">Discount</th>
              <th className="px-3 py-3">GST</th>
              <th className="px-3 py-3 text-right">Total</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const selectedItem = inventoryItems.find((item) => item.itemCode === line.itemCode);
              return (
                <tr key={index} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-4">
                    <SelectInput value={line.itemCode || ''} onChange={(event) => onItemChange(index, event.target.value)} className="h-10 min-w-44">
                      <option value="">Custom item</option>
                      {inventoryItems.map((item) => <option key={item.itemCode} value={item.itemCode}>{item.name}</option>)}
                    </SelectInput>
                    {selectedItem && <p className="mt-1 text-xs text-slate-500">Available: {selectedItem.currentStock}</p>}
                  </td>
                  <td className="px-3 py-4"><TextInput value={line.description} onChange={(event) => onUpdate(index, { description: event.target.value })} className="h-10 min-w-56" /></td>
                  <td className="px-3 py-4"><TextInput type="number" min={1} value={line.quantity} onChange={(event) => onUpdate(index, { quantity: Number(event.target.value) })} className="h-10 w-24" /></td>
                  <td className="px-3 py-4"><TextInput type="number" min={1} value={line.rentalDays} onChange={(event) => onUpdate(index, { rentalDays: Number(event.target.value) })} className="h-10 w-24" /></td>
                  <td className="px-3 py-4"><TextInput type="number" min={0} value={line.unitRate} onChange={(event) => onUpdate(index, { unitRate: Number(event.target.value) })} className="h-10 w-28" /></td>
                  <td className="px-3 py-4">
                    <div className="flex gap-2">
                      <TextInput type="number" min={0} value={line.discountValue} onChange={(event) => onUpdate(index, { discountValue: Number(event.target.value) })} className="h-10 w-24" />
                      <SelectInput value={line.discountType} onChange={(event) => onUpdate(index, { discountType: event.target.value as BillingDraftLine['discountType'] })} className="h-10 w-20">
                        <option value="FLAT">Rs</option>
                        <option value="PERCENTAGE">%</option>
                      </SelectInput>
                    </div>
                  </td>
                  <td className="px-3 py-4"><TextInput type="number" min={0} value={line.gstRate} onChange={(event) => onUpdate(index, { gstRate: Number(event.target.value) })} className="h-10 w-20" /></td>
                  <td className="px-3 py-4 text-right font-semibold">{money(computedLines[index]?.totalAmount || 0)}</td>
                  <td className="px-3 py-4 text-right">
                    <button className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50" onClick={() => onRemove(index)} aria-label="Remove row">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function BillingControls({
  canSave,
  savePending,
  invoicePending,
  onSave,
  onInvoice,
}: {
  canSave: boolean;
  savePending: boolean;
  invoicePending: boolean;
  onSave: () => void;
  onInvoice: () => void;
}) {
  return (
    <SectionCard title="3. Billing Controls">
      <div className="grid gap-3 sm:grid-cols-3">
        <SimpleButton variant="secondary" onClick={onSave} disabled={!canSave || savePending}>
          <FileText className="h-4 w-4" />
          {savePending ? 'Saving...' : 'Save Quotation'}
        </SimpleButton>
        <SimpleButton onClick={onInvoice} disabled={!canSave || invoicePending}>
          <Calendar className="h-4 w-4" />
          {invoicePending ? 'Generating...' : 'Generate Invoice'}
        </SimpleButton>
        <SimpleButton variant="secondary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print Document
        </SimpleButton>
      </div>
    </SectionCard>
  );
}

function InvoicePreview({
  copyType,
  customerName,
  phone,
  gstin,
  eventPlace,
  programType,
  billingAddress,
  notes,
  lines,
  totals,
}: {
  copyType: BillingCopyType;
  customerName: string;
  phone: string;
  gstin: string;
  eventPlace: string;
  programType: string;
  billingAddress: string;
  notes: string;
  lines: BillingLineItem[];
  totals: { subTotal: number; discountTotal: number; taxableTotal: number; gstTotal: number; grandTotal: number; balance: number };
}) {
  const visibleLines = lines.filter((line) => line.description);
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 print:px-0">
        <h3 className="text-base font-semibold text-slate-900">Live Invoice Preview</h3>
        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">{copyType.replace('_', ' ')}</span>
      </div>
      <div className="max-h-[620px] overflow-y-auto p-5 print:max-h-none print:overflow-visible print:p-0">
        <div className="border-b-2 border-slate-900 pb-4">
          <p className="text-xl font-bold text-slate-950">ONUS EVENT ERP</p>
          <p className="mt-1 text-xs text-slate-500">Quotation / Invoice</p>
        </div>
        <div className="grid gap-4 border-b border-slate-200 py-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Customer</p>
            <p className="mt-1 font-semibold">{customerName || 'Customer name'}</p>
            <p className="text-slate-600">{phone || 'Phone'}</p>
            <p className="text-slate-600">{gstin || 'GSTIN not provided'}</p>
            <p className="mt-2 text-slate-600">{billingAddress || 'Billing address'}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase text-slate-500">Event</p>
            <p className="mt-1 font-semibold">{programType || 'Program type'}</p>
            <p className="text-slate-600">{eventPlace || 'Event place'}</p>
            <p className="text-slate-600">{new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>
        <table className="mt-4 w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-2 py-2 text-left">Item</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2 text-right">GST</th>
              <th className="px-2 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {visibleLines.map((line, index) => (
              <tr key={`${line.description}-${index}`} className="border-b border-slate-100">
                <td className="px-2 py-3">
                  <p className="font-medium">{line.description}</p>
                  <p className="text-xs text-slate-500">{line.rentalDays} day(s) x {money(line.unitRate)}</p>
                </td>
                <td className="px-2 py-3 text-right">{line.quantity}</td>
                <td className="px-2 py-3 text-right">{money(line.gstAmount || 0)}</td>
                <td className="px-2 py-3 text-right font-semibold">{money(line.totalAmount || 0)}</td>
              </tr>
            ))}
            {visibleLines.length === 0 && (
              <tr><td colSpan={4} className="px-2 py-8 text-center text-slate-500">Add pricing items to build the preview.</td></tr>
            )}
          </tbody>
        </table>
        <div className="mt-4 ml-auto w-full max-w-xs space-y-2 text-sm">
          <SummaryRow label="Subtotal" value={totals.subTotal} />
          <SummaryRow label="Discount" value={totals.discountTotal} />
          <SummaryRow label="Taxable" value={totals.taxableTotal} />
          <SummaryRow label="GST" value={totals.gstTotal} />
          <div className="border-t border-slate-200 pt-2">
            <SummaryRow label="Grand Total" value={totals.grandTotal} strong />
          </div>
        </div>
        <div className="mt-5 border-t border-slate-200 pt-4 text-xs text-slate-600">
          <p><span className="font-semibold text-slate-800">Tax breakdown:</span> GST total {money(totals.gstTotal)} on taxable amount {money(totals.taxableTotal)}.</p>
          <p className="mt-1"><span className="font-semibold text-slate-800">Notes:</span> {notes || '-'}</p>
        </div>
      </div>
    </section>
  );
}

function TotalsCard({
  totals,
  paymentReceived,
  onPaymentChange,
}: {
  totals: { subTotal: number; discountTotal: number; taxableTotal: number; gstTotal: number; grandTotal: number; balance: number };
  paymentReceived: number;
  onPaymentChange: (value: number) => void;
}) {
  return (
    <SectionCard title="Totals Summary">
      <div className="space-y-3">
        <SummaryRow label="Subtotal" value={totals.subTotal} />
        <SummaryRow label="Discount" value={totals.discountTotal} />
        <SummaryRow label="GST" value={totals.gstTotal} />
        <div className="border-t border-slate-200 pt-3">
          <SummaryRow label="Grand Total" value={totals.grandTotal} strong />
        </div>
        <Field label="Payment Received">
          <TextInput type="number" min={0} value={paymentReceived} onChange={(event) => onPaymentChange(Number(event.target.value))} />
        </Field>
        <SummaryRow label="Balance" value={totals.balance} strong />
      </div>
    </SectionCard>
  );
}

function PrintActions({
  copyType,
  setCopyType,
}: {
  copyType: BillingCopyType;
  setCopyType: (value: BillingCopyType) => void;
}) {
  return (
    <SectionCard title="Print Actions">
      <div className="grid gap-3">
        <Field label="Preview Type">
          <SelectInput value={copyType} onChange={(event) => setCopyType(event.target.value as BillingCopyType)}>
            <option value="CUSTOMER_COPY">Customer Copy</option>
            <option value="OFFICE_COPY">Office Copy</option>
            <option value="STORE_COPY">Store Copy</option>
          </SelectInput>
        </Field>
        <SimpleButton onClick={() => window.print()}><Printer className="h-4 w-4" />Print Selected Copy</SimpleButton>
        <SimpleButton variant="secondary" onClick={() => window.print()}><Copy className="h-4 w-4" />Print All Copies</SimpleButton>
      </div>
    </SectionCard>
  );
}

function PageTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${strong ? 'text-lg font-semibold' : 'text-sm'}`}>
      <span>{label}</span>
      <span>Rs. {value.toLocaleString()}</span>
    </div>
  );
}

function Filters({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  dateFilter,
  setDateFilter,
}: {
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  dateFilter: string;
  setDateFilter: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3">
      <Field label="Search Events"><TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search event, customer, venue" /></Field>
      <Field label="Filter by Date"><TextInput type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} /></Field>
      <Field label="Filter by Status">
        <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All</option>
          <option>Inquiry</option>
          <option>Quotation</option>
          <option>Approved</option>
          <option>Confirmed</option>
        </SelectInput>
      </Field>
    </div>
  );
}

function EventTable({
  events,
  showAmount = false,
  showPastActions = false,
  onPrint,
}: {
  events: SalesEvent[];
  showAmount?: boolean;
  showPastActions?: boolean;
  onPrint?: () => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-3">Event Name</th>
            <th className="px-3 py-3">Customer</th>
            {!showAmount && <th className="px-3 py-3">Venue</th>}
            <th className="px-3 py-3">Date</th>
            {showAmount && <th className="px-3 py-3">Final Amount</th>}
            <th className="px-3 py-3">Status</th>
            {showPastActions && <th className="px-3 py-3">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-t border-slate-100">
              <td className="px-3 py-3 font-medium">{event.eventName}</td>
              <td className="px-3 py-3">{event.customer}</td>
              {!showAmount && <td className="px-3 py-3">{event.venue}</td>}
              <td className="px-3 py-3">{event.date}</td>
              {showAmount && <td className="px-3 py-3">Rs. {event.finalAmount.toLocaleString()}</td>}
              <td className="px-3 py-3">{statusBadge(event.status)}</td>
              {showPastActions && (
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <SimpleButton variant="secondary" onClick={onPrint} className="px-3 py-1.5"><Printer className="h-4 w-4" />Reprint</SimpleButton>
                    <SimpleButton variant="secondary" className="px-3 py-1.5"><Copy className="h-4 w-4" />Duplicate</SimpleButton>
                  </div>
                </td>
              )}
            </tr>
          ))}
          {events.length === 0 && (
            <tr>
              <td colSpan={showPastActions ? 6 : 5} className="px-3 py-8 text-center text-slate-500">No events found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
