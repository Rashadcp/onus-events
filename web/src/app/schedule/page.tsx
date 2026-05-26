"use client";

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { getEventsApi } from '../../services/api';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  ShieldAlert, 
  MapPin, 
  Clock, 
  Calendar, 
  Wrench, 
  CheckCircle2, 
  LogOut,
  ChevronRight,
  Info
} from 'lucide-react';

export default function CaptainDashboard() {
  const { user, logout, initializeSession } = useAuthStore();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Load all events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: getEventsApi,
    placeholderData: []
  });

  // Filter events assigned to this Site Incharge/Captain
  const assignedEvents = events.filter((ev) => {
    if (ev.isDeleted) return false;
    // Checks if the captain matches the logged in user or if the user is admin
    return ev.assignedCaptain === user?.id || ev.assignedCaptain === user?._id || user?.role === 'ADMIN';
  });

  const selectedEvent = events.find((e) => e._id === selectedEventId);

  const formatDate = (dateStr: string | Date) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <AuthGuard allowedRoles={['ADMIN', 'SITE_INCHARGE', 'CAPTAIN']}>
      <div className="erp-readable min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col font-sans overflow-x-hidden">
        
        {/* Dashboard Header */}
        <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-40 px-8 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-emerald-600 rounded-full" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#10B981] to-[#3B82F6] bg-clip-text text-transparent">
              ONUS CAPTAINS WORKSPACE
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-[#0F172A]">{user?.fullName || 'Site Captain'}</p>
              <p className="text-xs text-emerald-600 uppercase tracking-widest font-bold">Field {user?.role || 'CAPTAIN'}</p>
            </div>
            <Button 
              variant="danger" 
              onClick={logout}
              className="flex items-center gap-2 text-xs py-2 px-3.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </Button>
          </div>
        </header>

        {/* Dashboard Content Grid */}
        <div className="max-w-6xl mx-auto w-full p-8 flex flex-col gap-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Sidebar Column: Assigned Site Events */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <Card className="p-0 border border-slate-200 shadow-sm overflow-hidden bg-white">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-emerald-600" /> Assigned Sites
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Manage stock & rentals active at your site locations.</p>
                </div>

                <div className="flex flex-col max-h-[500px] overflow-y-auto divide-y divide-slate-100">
                  {isLoading ? (
                    <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Loading sites...</div>
                  ) : assignedEvents.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-400 italic px-4">No site programs assigned to you currently.</div>
                  ) : (
                    assignedEvents.map((ev) => {
                      const isSelected = selectedEventId === ev._id;
                      return (
                        <button
                          key={ev._id}
                          onClick={() => setSelectedEventId(ev._id)}
                          className={`w-full text-left p-4 transition flex justify-between items-center ${
                            isSelected ? 'bg-emerald-50 border-l-4 border-emerald-600' : 'hover:bg-slate-50/50 bg-white'
                          }`}
                        >
                          <div className="flex flex-col gap-1 min-w-0 pr-2">
                            <span className="text-sm font-bold text-slate-800 truncate">{ev.customerName}</span>
                            <span className="text-[11px] text-slate-400 font-medium truncate">{ev.place}</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                {formatDate(ev.eventDate.start)}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {ev.eventStatus}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 shrink-0 transition ${isSelected ? 'text-emerald-600' : 'text-slate-300'}`} />
                        </button>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>

            {/* Main Content Workspace Column: Site Stocks & Rentals */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {selectedEvent ? (
                <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
                  
                  {/* Selected Site Details */}
                  <Card className="border border-emerald-100 bg-emerald-50/40 p-6 flex flex-col gap-3 shadow-sm">
                    <div>
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest block">Assigned Site Master Details</span>
                      <h2 className="text-xl font-extrabold text-slate-900 leading-tight mt-0.5">{selectedEvent.customerName}</h2>
                      <p className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {selectedEvent.place}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 border-t border-emerald-100/50 pt-4 mt-1 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Date Horizon</p>
                          <p className="font-bold text-slate-700">{formatDate(selectedEvent.eventDate.start)} to {formatDate(selectedEvent.eventDate.end)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Timings Window</p>
                          <p className="font-bold text-slate-700">{selectedEvent.timeWindow?.start} - {selectedEvent.timeWindow?.end}</p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Active Site rentals list */}
                  <Card className="p-6 bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <Wrench className="w-4 h-4 text-emerald-600" /> Active Rentals & Site Stock List
                      </h3>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Site Dispatched</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                            <th className="p-3">Item Description</th>
                            <th className="p-3">Item Code</th>
                            <th className="p-3">Department</th>
                            <th className="p-3 text-center">Site Allocation Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedEvent.items && selectedEvent.items.map((it: any) => {
                            const item = it.itemId;
                            if (!item) return null;
                            return (
                              <tr key={item._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                                <td className="p-3 font-bold text-slate-800">{item.name}</td>
                                <td className="p-3 font-mono text-emerald-600 font-bold">{item.itemCode}</td>
                                <td className="p-3 text-slate-500">
                                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    {item.department?.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-extrabold text-slate-800 text-sm">{it.quantity}</td>
                              </tr>
                            );
                          })}
                          {(!selectedEvent.items || selectedEvent.items.length === 0) && (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-slate-400 italic">No assigned items dispatched on this site yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Operational instructions */}
                  <Card className="p-6 bg-slate-50 border border-slate-200 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200/50 pb-2">
                      <Info className="w-4 h-4 text-emerald-500" /> Captains Operational Checklist
                    </div>

                    <div className="flex flex-col gap-3 text-xs leading-relaxed text-slate-600 font-medium">
                      <div className="flex gap-2.5 items-start">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <p>Verify that all site dispatched allocations list counts match the items physically loaded and dispatched by the loader crew.</p>
                      </div>
                      <div className="flex gap-2.5 items-start">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <p>Supervise decorators and loaders to ensure correct material placement, zero damage rate, and maintain active safety procedures.</p>
                      </div>
                      <div className="flex gap-2.5 items-start">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <p>At event completion, ensure loaders reload all dispatched items and list any missing or short stocks onto the inward return sheet.</p>
                      </div>
                    </div>
                  </Card>

                </div>
              ) : (
                <div className="py-24 text-center flex flex-col items-center justify-center gap-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-base">Select Site Incharge Location</h3>
                  <p className="text-xs text-slate-400 max-w-sm">Please select a site scheduled program in the left panel to inspect site active stocks and rentals list.</p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </AuthGuard>
  );
}
