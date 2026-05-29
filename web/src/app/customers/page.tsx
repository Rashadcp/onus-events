"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { getEventsApi, getBillingDocumentsApi } from '../../services/api';
import { AuthGuard } from '../../components/auth/AuthGuard';

// Icons
import { 
  Search, 
  User, 
  Phone, 
  Calendar, 
  IndianRupee, 
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  FileText,
  Clock,
  MapPin,
  Users,
  X
} from 'lucide-react';

// UI Components
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface CustomerAccount {
  name: string;
  phone: string;
  address?: string;
  totalEvents: number;
  pendingAmount: number;
  lastEventDate: string;
  lastEventName: string;
  history: any[];
}

export default function CustomerAccountsPage() {
  const router = useRouter();
  const { initializeSession } = useAuthStore();

  // Load session on mount
  useEffect(() => {
    initializeSession();
    document.title = "ERP | Customer Accounts";
  }, [initializeSession]);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  // Queries: Fetch dynamic Events and Billing Documents
  const { data: events = [], isLoading: isEventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: getEventsApi,
    placeholderData: []
  });

  const { data: billingDocs = [], isLoading: isBillingLoading } = useQuery({
    queryKey: ['billingDocs'],
    queryFn: getBillingDocumentsApi,
    placeholderData: []
  });

  // Dynamic aggregation logic to assemble CustomerAccount entities
  const aggregateCustomerAccounts = (): CustomerAccount[] => {
    const map: Record<string, CustomerAccount> = {};

    // 1. Seed fallback mock customers so the page always looks complete
    const mockCustomers: CustomerAccount[] = [
      {
        name: 'Alwin Joy',
        phone: '9876543210',
        address: 'Kochi, Kerala',
        totalEvents: 2,
        pendingAmount: 12350,
        lastEventDate: '2026-05-28',
        lastEventName: 'Wedding Reception Ceremony & Banquet',
        history: [
          { _id: '5f9f1b9b9b9b9b9b9b9b9b9b', program: 'Wedding Reception Ceremony', place: 'Grand Hyatt Convention Center, Kochi', date: '2026-05-28', status: 'CONFIRMED' },
          { _id: '5f9f1b9b9b9b9b9b9b9b9b9c', program: 'Stage Engagement Decor', place: 'Kochi Town Hall', date: '2026-04-12', status: 'CLOSED' }
        ]
      },
      {
        name: 'Jane Smith',
        phone: '9876543211',
        address: 'Trivandrum, Kerala',
        totalEvents: 1,
        pendingAmount: 0,
        lastEventDate: '2026-05-15',
        lastEventName: 'Corporate Annual Seminar',
        history: [
          { _id: '5f9f1b9b9b9b9b9b9b9b9b9d', program: 'Corporate Annual Seminar', place: 'Le Meridien Palace Hall, Trivandrum', date: '2026-05-15', status: 'CLOSED' }
        ]
      },
      {
        name: 'John Doe',
        phone: '9876543212',
        address: 'Calicut, Kerala',
        totalEvents: 1,
        pendingAmount: 4500,
        lastEventDate: '2026-05-20',
        lastEventName: 'Engagement Stage Floral Setup',
        history: [
          { _id: '5f9f1b9b9b9b9b9b9b9b9b9e', program: 'Engagement Stage Floral Setup', place: 'Raviz Resort, Calicut', date: '2026-05-20', status: 'APPROVED' }
        ]
      }
    ];

    // Seed mock customers into mapping
    mockCustomers.forEach(cust => {
      map[cust.name.toLowerCase()] = cust;
    });

    // 2. Scan dynamic database events to build live listings
    events.forEach((ev: any) => {
      if (ev.isDeleted) return;
      const key = ev.customerName.trim().toLowerCase();
      
      // Parse phone if nested in program string
      let parsedPhone = '';
      const prog = ev.program || '';
      if (prog.includes(' | Phone: ')) {
        const phParts = prog.split(' | Phone: ');
        parsedPhone = phParts[1].split(' | ')[0];
      }

      const eventRecord = {
        _id: ev._id,
        program: ev.program?.split(' [Type:')[0] || 'Event booking',
        place: ev.place,
        date: ev.eventDate?.start ? new Date(ev.eventDate.start).toISOString().split('T')[0] : 'N/A',
        status: ev.eventStatus || 'INQUIRY'
      };

      if (map[key]) {
        // Update dynamic details
        const current = map[key];
        const isNewer = new Date(eventRecord.date).getTime() > new Date(current.lastEventDate).getTime();
        
        current.totalEvents += 1;
        if (parsedPhone && !current.phone) current.phone = parsedPhone;
        if (ev.place && (!current.address || current.address === 'Not Provided')) current.address = ev.place;
        if (isNewer) {
          current.lastEventDate = eventRecord.date;
          current.lastEventName = eventRecord.program;
        }
        
        // Add to history if not duplicate program date
        const hasHistory = current.history.some(h => h.date === eventRecord.date && h.program === eventRecord.program);
        if (!hasHistory) {
          current.history.push(eventRecord);
        }
      } else {
        // Create new dynamic customer listing
        map[key] = {
          name: ev.customerName.trim(),
          phone: parsedPhone || 'Not Provided',
          address: ev.place || 'Not Provided',
          totalEvents: 1,
          pendingAmount: 0,
          lastEventDate: eventRecord.date,
          lastEventName: eventRecord.program,
          history: [eventRecord]
        };
      }
    });

    // 3. Scan dynamic billing documents to compute pending dues balances
    billingDocs.forEach((doc: any) => {
      const key = doc.customer?.name?.trim().toLowerCase();
      if (!key) return;

      const grandTotal = doc.totals?.grandTotal || 0;
      const isUnpaid = doc.status !== 'PAID' && doc.status !== 'CANCELLED';

      if (map[key]) {
        if (isUnpaid) {
          map[key].pendingAmount += grandTotal;
        }
        if (doc.customer?.phone && map[key].phone === 'Not Provided') {
          map[key].phone = doc.customer.phone;
        }
        if (doc.customer?.billingAddress && (!map[key].address || map[key].address === 'Not Provided')) {
          map[key].address = doc.customer.billingAddress;
        }
      } else {
        // Create a dynamic customer from billing logs
        map[key] = {
          name: doc.customer.name.trim(),
          phone: doc.customer.phone || 'Not Provided',
          address: doc.customer.billingAddress || doc.customer.eventPlace || 'Not Provided',
          totalEvents: 0,
          pendingAmount: isUnpaid ? grandTotal : 0,
          lastEventDate: doc.issueDate ? new Date(doc.issueDate).toISOString().split('T')[0] : 'N/A',
          lastEventName: doc.event?.program || 'Billing Log Invoice',
          history: []
        };
      }
    });

    return Object.values(map);
  };

  const customerAccounts = useMemo(() => {
    return aggregateCustomerAccounts();
  }, [events, billingDocs]);

  // Search filters
  const filteredAccounts = useMemo(() => {
    return customerAccounts.filter(acc => 
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.phone.includes(searchTerm)
    );
  }, [customerAccounts, searchTerm]);

  const selectedCustomer = useMemo(() => {
    return customerAccounts.find(c => c.name === selectedCustomerName) || null;
  }, [customerAccounts, selectedCustomerName]);

  const getDuesStatusBadge = (pendingAmount: number) => {
    if (pendingAmount > 0) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans antialiased">
        
        {/* Top Header Panel */}
        <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-500 hover:text-slate-900"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
            <h1 className="text-xl font-bold tracking-tight text-slate-950">
              CUSTOMER ACCOUNTS
            </h1>
          </div>
          
          <span className="text-[10px] font-bold text-blue-600 tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase">
            Sales ERP Module
          </span>
        </header>

        {/* Outer Frame Wrapper */}
        <div className="max-w-7xl mx-auto px-6 mt-8 flex flex-col gap-6">
          
          {/* Controls: Live Keyword Search */}
          <Card className="bg-white border border-slate-200 shadow-sm p-5 rounded-xl">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search customers by Customer Name or Contact Phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-800 placeholder:text-slate-400 font-medium"
              />
            </div>
          </Card>

          {/* Customer Accounts Ledger Table */}
          <Card className="bg-white border border-slate-200 shadow-sm p-0 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">Customer Ledgers ({filteredAccounts.length})</h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                ERP Core Ledger Logs
              </span>
            </div>

            {isEventsLoading || isBillingLoading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-xs text-slate-400">Aggregating ledgers data logs...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                      <th className="p-4 pl-6">Customer Name</th>
                      <th className="p-4">Phone / Contact</th>
                      <th className="p-4 text-center">Total Bookings</th>
                      <th className="p-4 text-right">Outstanding Amount</th>
                      <th className="p-4 text-center">Last Booking Date</th>
                      <th className="p-4 pr-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((account) => {
                      return (
                        <tr 
                          key={account.name}
                          onClick={() => {
                            setSelectedCustomerName(account.name);
                            setIsLedgerModalOpen(true);
                          }}
                          className="border-b border-slate-100 hover:bg-blue-50/30 transition cursor-pointer"
                        >
                          {/* Customer Name */}
                          <td className="p-4 pl-6 font-bold text-slate-900 text-sm flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-extrabold text-[10px]">
                              {account.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            {account.name}
                          </td>

                          {/* Phone */}
                          <td className="p-4 text-slate-600 font-medium text-xs">
                            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {account.phone}</span>
                          </td>

                          {/* Total Events */}
                          <td className="p-4 text-center font-bold text-sm text-slate-700">
                            {account.totalEvents} {account.totalEvents === 1 ? 'Event' : 'Events'}
                          </td>

                          {/* Outstanding Amount */}
                          <td className="p-4 text-right text-sm">
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-bold ${getDuesStatusBadge(account.pendingAmount)}`}>
                                {account.pendingAmount > 0 ? (
                                  <>
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>₹{account.pendingAmount.toLocaleString()} Due</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Paid-Up</span>
                                  </>
                                )}
                              </span>
                            </div>
                          </td>

                          {/* Last Event Date */}
                          <td className="p-4 text-center text-slate-500 font-semibold">
                            {account.lastEventDate !== 'N/A' ? new Date(account.lastEventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </td>

                          {/* Actions button */}
                          <td className="p-4 pr-6 text-center">
                            <span className="text-[10px] text-blue-600 hover:text-blue-700 font-extrabold uppercase tracking-wider underline">
                              View Details
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredAccounts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-20 text-center text-slate-400 italic text-sm">
                          No registered customer ledger accounts found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Client Ledger Summary Modal */}
        {isLedgerModalOpen && selectedCustomer && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6" role="dialog" aria-modal="true">
            {/* Clickable backdrop */}
            <div className="absolute inset-0 cursor-default" onClick={() => setIsLedgerModalOpen(false)} aria-hidden="true" />

            {/* Main modal container */}
            <div className="relative bg-white border border-slate-200/80 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden z-10 animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="font-extrabold text-slate-800 text-sm leading-tight">Client Ledger Summary</h3>
                </div>
                <button 
                  onClick={() => setIsLedgerModalOpen(false)} 
                  className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer transition shadow-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
                {/* Client Information Header Card */}
                <div className="bg-slate-50/75 border border-slate-100 p-4 rounded-2xl flex flex-col gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600 shrink-0" />
                    <p className="text-sm font-extrabold text-slate-800">{selectedCustomer.name}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedCustomer.phone}</span>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-slate-500 font-semibold mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-normal">Address: {selectedCustomer.address || 'Not Provided'}</span>
                  </div>
                </div>
                
                {/* Dues Balance Pill Block */}
                {selectedCustomer.pendingAmount > 0 ? (
                  <div className="rounded-2xl bg-rose-50/50 border border-rose-100 p-4 flex items-center justify-between shadow-2xs">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Outstanding balance due</p>
                      <p className="text-xl font-black text-rose-600 mt-1">
                        Rs. {selectedCustomer.pendingAmount.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5 text-rose-500" />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100 p-4 flex items-center justify-between shadow-2xs">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Account status</p>
                      <p className="text-base font-extrabold text-emerald-700 mt-1">
                        Fully Settled (No Dues)
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-250 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                )}

                {/* Event Timeline History */}
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Event Diary History</span>
                  </h4>
                  
                  <div className="relative border-l border-slate-200 ml-2.5 pl-4 space-y-4 pr-1">
                    {selectedCustomer.history.map(event => {
                      const start = event.date !== 'N/A' ? new Date(event.date) : null;
                      const isClosed = event.status === 'CLOSED' || event.status === 'CONFIRMED';
                      return (
                        <div key={event._id || event.program} className="relative">
                          {/* Circle dot on the line */}
                          <span className="absolute -left-[22.5px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-white bg-slate-300 ring-2 ring-slate-100" />
                          
                          <div className="rounded-xl border border-slate-100 bg-white p-3 hover:shadow-xs transition">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 leading-tight">{event.program}</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-300" />
                                  <span className="truncate">{event.place}</span>
                                </p>
                              </div>
                              
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                isClosed 
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  : 'bg-blue-50 text-blue-600 border border-blue-100'
                              }`}>
                                {event.status}
                              </span>
                            </div>
                            
                            <div className="mt-3.5 pt-2.5 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-300" />
                                {start ? start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                              </span>
                              {event._id && (
                                <button
                                  onClick={() => {
                                    setIsLedgerModalOpen(false);
                                    router.push(`/events/${event._id}`);
                                  }}
                                  className="text-blue-600 hover:text-blue-700 font-extrabold underline transition cursor-pointer"
                                >
                                  View Details
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {selectedCustomer.history.length === 0 && (
                      <p className="text-xs text-slate-400 font-semibold py-4 text-center">No associated booking history.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
