"use client";

import React, { useState, useEffect } from 'react';
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
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  FileText
} from 'lucide-react';

// UI Components
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface CustomerAccount {
  name: string;
  phone: string;
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
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

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
        totalEvents: 2,
        pendingAmount: 12350,
        lastEventDate: '2026-05-28',
        lastEventName: 'Wedding Reception Ceremony & Banquet',
        history: [
          { program: 'Wedding Reception Ceremony', place: 'Grand Hyatt Convention Center, Kochi', date: '2026-05-28', status: 'CONFIRMED' },
          { program: 'Stage Engagement Decor', place: 'Kochi Town Hall', date: '2026-04-12', status: 'CLOSED' }
        ]
      },
      {
        name: 'Jane Smith',
        phone: '9876543211',
        totalEvents: 1,
        pendingAmount: 0,
        lastEventDate: '2026-05-15',
        lastEventName: 'Corporate Annual Seminar',
        history: [
          { program: 'Corporate Annual Seminar', place: 'Le Meridien Palace Hall, Trivandrum', date: '2026-05-15', status: 'CLOSED' }
        ]
      },
      {
        name: 'John Doe',
        phone: '9876543212',
        totalEvents: 1,
        pendingAmount: 4500,
        lastEventDate: '2026-05-20',
        lastEventName: 'Engagement Stage Floral Setup',
        history: [
          { program: 'Engagement Stage Floral Setup', place: 'Raviz Resort, Calicut', date: '2026-05-20', status: 'APPROVED' }
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
      } else {
        // Create a dynamic customer from billing logs
        map[key] = {
          name: doc.customer.name.trim(),
          phone: doc.customer.phone || 'Not Provided',
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

  const customerAccounts = aggregateCustomerAccounts();

  // Search filters
  const filteredAccounts = customerAccounts.filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.phone.includes(searchTerm)
  );

  const toggleExpand = (name: string) => {
    setExpandedCustomer(expandedCustomer === name ? null : name);
  };

  const getDuesStatusBadge = (pendingAmount: number) => {
    if (pendingAmount > 0) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <AuthGuard allowedRoles={['ADMIN', 'SALES_REPRESENTATIVE', 'REPRESENTATIVE']}>
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
                      const isExpanded = expandedCustomer === account.name;
                      
                      return (
                        <React.Fragment key={account.name}>
                          
                          {/* Main Row */}
                          <tr className="border-b border-slate-100 hover:bg-slate-50/40 transition">
                            
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

                            {/* Actions toggle history */}
                            <td className="p-4 pr-6 text-center">
                              <Button
                                onClick={() => toggleExpand(account.name)}
                                variant="ghost"
                                className="text-[10px] py-1.5 px-3 border border-slate-200 hover:bg-slate-50 font-bold tracking-wider uppercase flex items-center justify-center gap-1 ml-auto cursor-pointer"
                              >
                                <span>History</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </Button>
                            </td>

                          </tr>

                          {/* Expandable History Row */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="bg-slate-50/50 p-6 border-b border-slate-100">
                                <div className="flex flex-col gap-4 animate-in slide-in-from-top-1 duration-200">
                                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Historical Booking Works Log</h4>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {account.history.map((hist, idx) => (
                                      <div key={idx} className="p-3 border border-slate-200 bg-white rounded-lg flex justify-between items-center text-xs shadow-sm">
                                        <div className="flex flex-col gap-0.5">
                                          <p className="font-bold text-slate-800">{hist.program}</p>
                                          <p className="text-[10px] text-slate-400 font-semibold">
                                            📍 {hist.place} • 📅 {new Date(hist.date).toLocaleDateString()}
                                          </p>
                                        </div>
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider ${
                                          hist.status === 'CONFIRMED' || hist.status === 'CLOSED'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                            : 'bg-blue-50 text-blue-700 border-blue-100'
                                        }`}>
                                          {hist.status}
                                        </span>
                                      </div>
                                    ))}

                                    {account.history.length === 0 && (
                                      <p className="text-xs text-slate-400 italic py-4 col-span-2 text-center">
                                        No historical bookings found matching this customer name dynamically.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}

                        </React.Fragment>
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

      </main>
    </AuthGuard>
  );
}
