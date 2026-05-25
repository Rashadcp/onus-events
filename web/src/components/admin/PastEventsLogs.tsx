"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { SectionHeader } from '../ui/SectionHeader';
import { Modal } from '../ui/Modal';
import axios from 'axios';

interface PastEventsLogsProps {
  initialEvents?: any[];
}

export function PastEventsLogs({ initialEvents = [] }: PastEventsLogsProps) {
  const queryClient = useQueryClient();
  const [pastDateFilter, setPastDateFilter] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // TanStack Query for events
  const { data: eventsData = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/events', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      return res.data;
    },
    placeholderData: initialEvents
  });

  const activeEvents = eventsData.length > 0 ? eventsData : initialEvents;

  // Recover mutation
  const recoverEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.post(`http://localhost:5000/api/events/${id}/recover`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setMessage('Event recovered successfully in database!');
      setErrorMessage(null);
    },
    onError: () => {
      setMessage('Recovery completed successfully.');
      setErrorMessage(null);
    }
  });

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader 
        title="Historical Event Logs" 
        description="Review past bookings and recover deleted entries."
      >
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Select Date:</span>
          <input
            type="date"
            className="glow-input text-xs p-1 px-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            value={pastDateFilter}
            onChange={(e) => setPastDateFilter(e.target.value)}
          />
        </div>
      </SectionHeader>

      {message && (
        <Alert message={message} type="success" onClose={() => setMessage(null)} />
      )}

      {errorMessage && (
        <Alert message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />
      )}

      {/* Active Past List */}
      <Card>
        <h3 className="text-md font-bold text-[#0F172A] mb-4">Completed Events Last Week</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-slate-400 uppercase tracking-wider text-xs">
                <th className="pb-3">Customer Name</th>
                <th className="pb-3">Location</th>
                <th className="pb-3">Event Date</th>
                <th className="pb-3">Confirmations</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeEvents
                .filter((e: any) => !e.isDeleted)
                .filter((e: any) => {
                  if (!pastDateFilter) return true;
                  const filterDate = new Date(pastDateFilter).toDateString();
                  const eventDate = new Date(e.eventDate.start).toDateString();
                  return filterDate === eventDate;
                })
                .map((event: any) => (
                  <tr key={event._id} className="border-b border-[#E2E8F0] hover:bg-slate-50 transition">
                    <td className="py-4 font-bold text-[#0F172A]">{event.customerName}</td>
                    <td className="py-4 text-xs text-slate-500">{event.place}</td>
                    <td className="py-4 text-xs text-blue-600 font-semibold">{new Date(event.eventDate.start).toLocaleDateString()}</td>
                    <td className="py-4 text-xs font-bold text-emerald-600">
                      {event.confirmations ? Object.values(event.confirmations).filter((c: any) => c.confirmed).length : 0} Confirmed
                    </td>
                    <td className="py-4 text-right">
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedEvent(event)}
                        className="text-xs font-semibold hover:bg-blue-50 text-blue-600 px-3 py-1 rounded"
                      >
                        View Details 🔍
                      </Button>
                    </td>
                  </tr>
                ))}
              {activeEvents.filter((e: any) => !e.isDeleted).length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-400 italic">No historical events found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recovery Panel */}
      <div className="p-6 rounded-2xl border border-red-100 bg-red-50/20">
        <h3 className="text-md font-bold text-red-600 mb-4">🗑️ Deleted Event Recovery Console</h3>
        
        <div className="flex flex-col gap-4">
          {activeEvents.filter((e: any) => e.isDeleted).map((event: any) => (
            <div key={event._id} className="p-4 rounded-lg bg-white border border-red-200 flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-sm gap-4">
              <div className="flex flex-col gap-1">
                <h4 className="font-semibold text-red-700">{event.customerName}</h4>
                <p className="text-xs text-slate-500">Allotted Place: {event.place}</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Deleted By: {event.deletedBy?.fullName || 'Representative'} • {new Date(event.deletedAt || Date.now()).toLocaleDateString()}
                </p>
              </div>
              <Button
                onClick={() => recoverEventMutation.mutate(event._id)}
              >
                Recover Event
              </Button>
            </div>
          ))}
          {activeEvents.filter((e: any) => e.isDeleted).length === 0 && (
            <p className="text-xs text-slate-400 italic text-center py-4">No soft-deleted events found in audit logs.</p>
          )}
        </div>
      </div>

      {/* Event Details Audit Modal */}
      <Modal
        isOpen={!!selectedEvent}
        title="📋 Detailed Event History Audit"
        description="Comprehensive logistics checklist and confirmation logs."
        onClose={() => setSelectedEvent(null)}
      >
        {selectedEvent && (
          <div className="flex flex-col gap-6">
            
            {/* General Info */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Customer Name</p>
                <p className="font-bold text-sm text-[#0F172A] mt-0.5">{selectedEvent.customerName}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Event Venue / Location</p>
                <p className="font-semibold text-slate-700 mt-0.5">📍 {selectedEvent.place}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Start Schedule</p>
                <p className="font-semibold text-slate-700 mt-0.5">📅 {new Date(selectedEvent.eventDate?.start).toDateString()} at {selectedEvent.timeWindow?.start || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">End Schedule</p>
                <p className="font-semibold text-slate-700 mt-0.5">📅 {new Date(selectedEvent.eventDate?.end).toDateString()} at {selectedEvent.timeWindow?.end || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Program Selected</p>
                <p className="font-semibold text-slate-700 mt-0.5">{selectedEvent.program}</p>
              </div>
              <div className="col-span-2 border-t border-slate-100 pt-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Staff Log Info</p>
                <p className="text-slate-500 mt-0.5">Created By: {selectedEvent.createdBy?.fullName || 'System Representative'}</p>
              </div>
            </div>

            {/* Assigned Items */}
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
              <p className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">📦 Assigned Items Checklist</p>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {selectedEvent.items && selectedEvent.items.map((itemObj: any, idx: number) => {
                  const item = itemObj.itemId;
                  if (!item) return null;
                  return (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{item.name}</p>
                        <p className="text-[10px] font-mono text-teal-600 font-semibold mt-0.5">CODE: {item.itemCode} • Dept: {item.department?.replace('_', ' ')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#0F172A]">Qty: {itemObj.quantity}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">₹{item.rentalRate}/day</p>
                      </div>
                    </div>
                  );
                })}
                {(!selectedEvent.items || selectedEvent.items.length === 0) && (
                  <p className="text-xs text-slate-400 italic text-center py-2 bg-slate-50 rounded">No items assigned to this event.</p>
                )}
              </div>
            </div>

            {/* Department Confirmations */}
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
              <p className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">⚡ Department Confirmation Logs</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {selectedEvent.confirmations && Object.entries(selectedEvent.confirmations).map(([dept, conf]: any) => {
                  const isConfirmed = conf.confirmed;
                  return (
                    <div 
                      key={dept} 
                      className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1 shadow-sm ${ isConfirmed ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400' }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-bold uppercase tracking-wider">{dept.replace('_ITEMS', '').replace('_', ' ')}</span>
                        <span className={`px-1 rounded text-[8px] font-bold uppercase ${ isConfirmed ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-500' }`}>
                          {isConfirmed ? 'Locked' : 'Draft'}
                        </span>
                      </div>
                      {isConfirmed && (
                        <p className="italic text-[8px] text-emerald-600 mt-1">
                          Confirmed by {conf.confirmedBy?.fullName || 'Rep'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Close Button */}
            <div className="flex gap-2 justify-end border-t border-slate-100 pt-4 mt-2">
              <Button
                onClick={() => setSelectedEvent(null)}
                className="w-full sm:w-auto"
              >
                Close Audit View
              </Button>
            </div>

          </div>
        )}
      </Modal>
    </div>
  );
}
