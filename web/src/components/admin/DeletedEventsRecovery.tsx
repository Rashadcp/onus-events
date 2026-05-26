"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDeletedEventsApi, recoverEventApi } from '../../services/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { History, RefreshCw, Trash2, Calendar, MapPin, User, Clock } from 'lucide-react';
import { Event } from '../../types';

export function DeletedEventsRecovery() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Query soft-deleted events
  const { data: deletedEvents = [], isLoading } = useQuery<Event[]>({
    queryKey: ['deletedEvents'],
    queryFn: getDeletedEventsApi,
    placeholderData: []
  });

  // Mutation to recover/restore deleted events
  const recoverEventMutation = useMutation({
    mutationFn: recoverEventApi,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['deletedEvents'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setMessage(data.message || 'Event booking and inventory allocations successfully restored!');
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to restore event.');
    }
  });

  const handleRestore = (eventId: string, customer: string) => {
    if (confirm(`Are you sure you want to recover/restore event booking for "${customer}"?`)) {
      recoverEventMutation.mutate(eventId);
    }
  };

  const formatDate = (dateStr: string | Date) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Notifications */}
      {message && <Alert message={message} type="success" onClose={() => setMessage(null)} />}
      {errorMessage && <Alert message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0F172A] flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            Deleted Events Recovery Console
          </h2>
          <p className="text-xs text-slate-400 font-medium">Browse soft-deleted events drafts and recover active inventory allocations.</p>
        </div>
      </div>

      <Card className="overflow-hidden p-0 border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm">Archived/Deleted Events Logs ({deletedEvents.length})</h3>
          <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded border border-red-100">
            Secure Recovery System
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading deleted event logs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                  <th className="p-4 pl-6">Event Program</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Audited Deletion info</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deletedEvents.map((ev) => (
                  <tr key={ev._id} className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors">
                    {/* Program description */}
                    <td className="p-4 pl-6">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{ev.program}</p>
                        <div className="flex items-center gap-1.5 mt-1 text-slate-400 text-[11px] font-medium">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[200px]">{ev.place}</span>
                        </div>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="p-4 text-slate-700 font-bold text-sm">
                      {ev.customerName}
                    </td>

                    {/* Deletion logs */}
                    <td className="p-4 text-slate-600 font-medium">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> Deleted by: {ev.deletedBy?.name || ev.deletedBy?.email || 'Sales Rep'}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {ev.deletedAt ? new Date(ev.deletedAt).toLocaleString() : 'Date unavailable'}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-red-50 text-red-700 border border-red-200 uppercase tracking-wider">
                        Deleted
                      </span>
                    </td>

                    {/* Restore Action */}
                    <td className="p-4 pr-6 text-right">
                      <Button
                        onClick={() => handleRestore(ev._id, ev.customerName)}
                        disabled={recoverEventMutation.isPending}
                        className="text-[10px] py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1 justify-end ml-auto cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${recoverEventMutation.isPending ? 'animate-spin' : ''}`} />
                        Recover Event Draft
                      </Button>
                    </td>
                  </tr>
                ))}
                {deletedEvents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-400 italic text-sm">
                      No soft-deleted events found in system logs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </div>
  );
}
