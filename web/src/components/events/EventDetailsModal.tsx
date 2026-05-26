"use client";

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Event } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { updateEventStatusApi, confirmDepartmentApi } from '../../services/api';
import { Alert } from '../ui/Alert';

interface EventDetailsModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  onPrint?: (event: Event) => void;
}

const STATUS_FLOW = ['INQUIRY', 'QUOTATION', 'APPROVED', 'CONFIRMED', 'LOADING', 'DISPATCHED', 'RETURNED', 'CLOSED'];

export function EventDetailsModal({ event, isOpen, onClose, isAdmin = false, onPrint }: EventDetailsModalProps) {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const updateStatusMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: string }) => updateEventStatusApi(eventId, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSuccessMsg(`Status successfully updated to ${data.event.eventStatus}`);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to update status.');
    }
  });

  const confirmDepartmentMutation = useMutation({
    mutationFn: ({ eventId, department }: { eventId: string; department: string }) => confirmDepartmentApi(eventId, department),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSuccessMsg(data.message || 'Department confirmed successfully!');
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to confirm department.');
    }
  });

  if (!event) return null;

  const currentStatusIndex = STATUS_FLOW.indexOf(event.eventStatus || 'INQUIRY');

  const advanceStatus = () => {
    if (currentStatusIndex < STATUS_FLOW.length - 1) {
      const nextStatus = STATUS_FLOW[currentStatusIndex + 1];
      updateStatusMutation.mutate({ eventId: event._id, status: nextStatus });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'INQUIRY': return 'bg-slate-200 text-slate-700 border-slate-300';
      case 'QUOTATION': return 'bg-yellow-200 text-yellow-800 border-yellow-300';
      case 'APPROVED': return 'bg-blue-200 text-blue-800 border-blue-300';
      case 'CONFIRMED': return 'bg-emerald-200 text-emerald-800 border-emerald-300';
      case 'LOADING': return 'bg-orange-200 text-orange-800 border-orange-300';
      case 'DISPATCHED': return 'bg-purple-200 text-purple-800 border-purple-300';
      case 'RETURNED': return 'bg-teal-200 text-teal-800 border-teal-300';
      case 'CLOSED': return 'bg-slate-800 text-white border-slate-900';
      default: return 'bg-slate-200 text-slate-700 border-slate-300';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Event Details & Lifecycle">
      <div className="flex flex-col gap-6 max-h-[80vh] overflow-y-auto pr-2">
        
        {errorMsg && <Alert type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />}
        {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

        {/* Lifecycle Stepper */}
        <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Lifecycle Progress</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_FLOW.map((status, idx) => {
              const isPast = idx < currentStatusIndex;
              const isCurrent = idx === currentStatusIndex;
              return (
                <div key={status} className="flex items-center gap-2">
                  <div className={`px-2 py-1 text-[10px] font-bold uppercase rounded border ${isCurrent ? getStatusColor(status) + ' ring-2 ring-offset-1 ring-blue-400' : isPast ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-300 border-slate-100'}`}>
                    {status}
                  </div>
                  {idx < STATUS_FLOW.length - 1 && <span className="text-slate-300 text-xs">→</span>}
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end gap-2">
            {onPrint && (
              <Button
                onClick={() => onPrint(event)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 py-2 border border-slate-200"
              >
                🖨️ Print Invoice
              </Button>
            )}
            <Button 
              onClick={advanceStatus} 
              disabled={currentStatusIndex >= STATUS_FLOW.length - 1 || updateStatusMutation.isPending}
              className="bg-blue-600 text-white text-xs px-4 py-2"
            >
              {updateStatusMutation.isPending ? 'Updating...' : `Advance to ${STATUS_FLOW[currentStatusIndex + 1] || 'Completed'}`}
            </Button>
          </div>
        </div>

        {/* Event Meta */}
        <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 border border-slate-200 rounded-xl">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Customer</p>
            <p className="font-semibold text-slate-800">{event.customerName}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Venue</p>
            <p className="font-semibold text-slate-800">{event.place}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Schedule</p>
            <p className="font-semibold text-slate-800">{new Date(event.eventDate.start).toDateString()} to {new Date(event.eventDate.end).toDateString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Timings</p>
            <p className="font-semibold text-slate-800">{event.timeWindow?.start} - {event.timeWindow?.end}</p>
          </div>
        </div>

        {/* Assigned Items */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assigned Inventory</p>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-2 font-bold text-slate-500">Item</th>
                  <th className="p-2 font-bold text-slate-500">Code</th>
                  <th className="p-2 font-bold text-slate-500 text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {event.items && event.items.map((itemObj: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                    <td className="p-2 font-semibold text-slate-800">{itemObj.itemId?.name}</td>
                    <td className="p-2 font-mono text-slate-500">{itemObj.itemId?.itemCode}</td>
                    <td className="p-2 font-bold text-slate-800 text-right">{itemObj.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!event.items || event.items.length === 0) && (
              <p className="text-xs text-slate-400 p-4 text-center italic">No items assigned.</p>
            )}
          </div>
        </div>

        {/* Department Confirmations */}
        {event.confirmations && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Department Confirmations</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(event.confirmations).map(([dept, conf]: any) => {
                const isConfirmed = conf.confirmed;
                return (
                  <div key={dept} className={`p-3 rounded-lg border text-xs flex justify-between items-center ${isConfirmed ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                    <span className="font-bold">{dept.replace('_', ' ')}</span>
                    {isConfirmed ? (
                      <span className="bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold text-[9px] uppercase">Confirmed</span>
                    ) : (
                      <Button 
                        onClick={() => confirmDepartmentMutation.mutate({ eventId: event._id, department: dept })}
                        disabled={confirmDepartmentMutation.isPending}
                        className="text-[9px] py-1 px-2 bg-blue-600 text-white"
                      >
                        Confirm
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}
