"use client";

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { AuthGuard } from '../auth/AuthGuard';
import { getEventsApi } from '../../services/api';
import { Event } from '../../types';
import { Card } from '../ui/Card';
import { 
  ChevronRight, 
  MapPin, 
  Calendar, 
  Clock, 
  LogOut, 
  Info,
  Package,
  ClipboardList
} from 'lucide-react';

export function SiteInchargeDashboard() {
  const { user, logout, initializeSession } = useAuthStore();

  // Selected Site state
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Initial session check
  useEffect(() => {
    initializeSession();
    document.title = "ERP | Site Captain Console";
  }, [initializeSession]);

  // Fetch Events via React Query
  const { data: events = [], isLoading: isEventsLoading } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: getEventsApi,
    placeholderData: []
  });

  // Filter events assigned to this Site Incharge / Captain (Restricted)
  const assignedEvents = events.filter((ev) => {
    if (ev.isDeleted) return false;
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
      <div className="min-h-screen bg-[#F8FAFC] text-gray-900 flex flex-col font-sans overflow-x-hidden antialiased">
        
        {/* Dashboard Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-6 py-3 print:hidden shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Onus Events" className="h-10 w-auto" />
              <div className="h-6 w-[1px] bg-slate-200 mx-1" />
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">Site Captain Console</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{user?.fullName || 'Site Captain'}</p>
                <p className="text-xs text-gray-400 font-medium">Captain ID: {user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-350 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
              >
                <LogOut className="h-4 w-4 text-gray-500" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content Shell */}
        <main className="max-w-[1700px] w-full mx-auto p-4 lg:p-6 flex flex-col gap-6">

          {/* Grid Layout - Master Detail View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: Site Selector List (4 Cols) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              <Card className="p-0 border border-gray-200 shadow-xs bg-white rounded-lg overflow-hidden flex flex-col h-[calc(100vh-140px)]">
                <div className="px-5 py-4 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-blue-600" /> Assigned Sites
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 font-medium">Select an event to view details.</p>
                  </div>
                  <span className="text-[11px] font-bold bg-blue-50 text-blue-755 border border-blue-150 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {assignedEvents.length} Active
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                  {isEventsLoading ? (
                    <div className="py-12 text-center text-xs text-gray-400 animate-pulse">Loading active sites...</div>
                  ) : assignedEvents.length === 0 ? (
                    <div className="py-16 text-center text-xs text-gray-405 italic px-4 font-medium">No site programs assigned to you currently.</div>
                  ) : (
                    assignedEvents.map((ev) => {
                      const isSelected = selectedEventId === ev._id;
                      return (
                        <button
                          key={ev._id}
                          onClick={() => setSelectedEventId(ev._id)}
                          className={`w-full text-left p-4 transition-all flex justify-between items-center ${
                            isSelected ? 'bg-blue-50/50 border-l-4 border-blue-600' : 'hover:bg-gray-50/50 bg-white'
                          }`}
                        >
                          <div className="flex flex-col gap-1 min-w-0 pr-2">
                            <span className="text-sm font-bold text-gray-905 truncate leading-snug">{ev.customerName}</span>
                            <span className="text-xs text-gray-400 font-medium truncate flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-350" /> {ev.place}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100">
                                {formatDate(ev.eventDate.start)}
                              </span>
                              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                {ev.eventStatus}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 shrink-0 transition ${isSelected ? 'text-blue-600' : 'text-gray-300'}`} />
                        </button>
                      );
                    })
                  )}
                </div>
              </Card>

            </div>

            {/* RIGHT COLUMN: Selected Site Details & Items (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {selectedEvent ? (
                <div className="flex flex-col gap-6 animate-in fade-in duration-250">
                  
                  {/* Selected Event Details Panel */}
                  <Card className="border border-gray-200 bg-white p-5 flex flex-col gap-4 shadow-xs rounded-lg">
                    <div>
                      <span className="text-[10px] font-bold text-blue-650 uppercase tracking-widest block font-mono">Assigned Location Info</span>
                      <h2 className="text-lg font-extrabold text-gray-950 leading-tight mt-0.5">{selectedEvent.customerName}</h2>
                      <p className="text-xs text-gray-500 font-semibold mt-1.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" /> {selectedEvent.place}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-450 font-bold uppercase tracking-wider">Date Horizon</p>
                          <p className="font-bold text-gray-800 mt-0.5">{formatDate(selectedEvent.eventDate.start)} to {formatDate(selectedEvent.eventDate.end)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-450 font-bold uppercase tracking-wider">Timing window</p>
                          <p className="font-bold text-gray-800 mt-0.5">{selectedEvent.timeWindow?.start} - {selectedEvent.timeWindow?.end}</p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Allocated stocks list table card */}
                  <Card className="border border-gray-200 shadow-xs bg-white rounded-lg overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-200 bg-white flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider flex items-center gap-2">
                          <Package className="w-4 h-4 text-blue-600" /> Allocated Site Inventory
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Physical items dispatched to this location by logistics crew.</p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-150 shadow-xs">
                        Site Allocation
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50 font-bold uppercase tracking-wider text-[10px] text-gray-405">
                            <th className="p-3 pl-5">Item Description</th>
                            <th className="p-3 text-center">Item Code</th>
                            <th className="p-3">Department</th>
                            <th className="p-3 text-center pr-5">Dispatched Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 bg-white text-gray-650">
                          {selectedEvent.items && selectedEvent.items.map((it: any) => {
                            const item = it.itemId;
                            if (!item) return null;
                            return (
                              <tr key={item._id} className="hover:bg-gray-50/50 transition">
                                <td className="p-3 pl-5 font-bold text-gray-900 leading-snug">{item.name}</td>
                                <td className="p-3 text-center font-mono text-blue-600 font-bold">{item.itemCode}</td>
                                <td className="p-3">
                                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 uppercase">
                                    {item.department?.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-extrabold text-gray-900 text-sm bg-gray-50/50 pr-5">{it.quantity}</td>
                              </tr>
                            );
                          })}
                          {(!selectedEvent.items || selectedEvent.items.length === 0) && (
                            <tr>
                              <td colSpan={4} className="py-12 text-center text-gray-400 italic">No assigned items dispatched on this site yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                </div>
              ) : (
                <div className="py-24 text-center flex flex-col items-center justify-center gap-4 bg-white border border-gray-200 rounded-lg shadow-xs h-[calc(100vh-140px)]">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-100">
                    <Info className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">Select Active Scheduled Program</h3>
                  <p className="text-xs text-gray-400 max-w-xs font-medium px-4">Please select a site horizon schedule program from the list to load dispatched inventory specifications.</p>
                </div>
              )}

            </div>

          </div>

        </main>

      </div>
    </AuthGuard>
  );
}
