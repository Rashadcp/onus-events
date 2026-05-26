"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { SectionHeader } from '../ui/SectionHeader';
import { TimeSetModal } from '../ui/TimeSetModal';
import { apiClient } from '../../utils/apiClient';
import { createEventApi } from '../../services/api';

interface EventWizardProps {
  initialItems?: any[];
  onComplete?: () => void;
}

export function EventWizard({ initialItems = [], onComplete }: EventWizardProps) {
  const queryClient = useQueryClient();

  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  // Form states
  const [newEventCust, setNewEventCust] = useState('');
  const [newEventPlace, setNewEventPlace] = useState('');
  const [newEventDateStart, setNewEventDateStart] = useState('');
  const [newEventDateEnd, setNewEventDateEnd] = useState('');
  const [newEventTimeStart, setNewEventTimeStart] = useState('10:00');
  const [newEventTimeEnd, setNewEventTimeEnd] = useState('18:00');
  const [newEventProg, setNewEventProg] = useState('Lunch Program');
  const [eventStatus, setEventStatus] = useState<'INQUIRY' | 'QUOTATION' | 'APPROVED'>('INQUIRY');
  const [newEventItems, setNewEventItems] = useState<{ itemId: string; quantity: number }[]>([]);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  
  // Fetch Inventory items for selection
  const { data: inventoryData = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await apiClient.get('/api/inventory');
      return res.data;
    },
    placeholderData: initialItems
  });

  const activeItems = inventoryData.length > 0 ? inventoryData : initialItems;

  const [availabilityMap, setAvailabilityMap] = useState<Record<string, number>>({});
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  const fetchAvailabilityForDates = async (start: string, end: string) => {
    if (!start || !end || activeItems.length === 0) return;
    setIsCheckingAvailability(true);
    try {
      const map: Record<string, number> = {};
      await Promise.all(
        activeItems.map(async (item: any) => {
          try {
            const res = await apiClient.get(`/api/inventory/${item._id}/availability?startDate=${start}&endDate=${end}`);
            map[item._id] = res.data.availableQty;
          } catch (err) {
            map[item._id] = item.currentStock;
          }
        })
      );
      setAvailabilityMap(map);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  useEffect(() => {
    if (newEventDateStart && newEventDateEnd) {
      const startIso = new Date(`${newEventDateStart}T${newEventTimeStart}`).toISOString();
      const endIso = new Date(`${newEventDateEnd}T${newEventTimeEnd}`).toISOString();
      fetchAvailabilityForDates(startIso, endIso);
    }
  }, [newEventDateStart, newEventDateEnd, newEventTimeStart, newEventTimeEnd, inventoryData]);

  // Create Event Mutation
  const createEventMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await createEventApi(payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setMessage('Event Created & Scheduled Successfully!');
      setErrorMessage(null);
      // Reset
      setNewEventCust('');
      setNewEventPlace('');
      setNewEventItems([]);
      setNewEventDateStart('');
      setNewEventDateEnd('');
      setStep(1);
      if (onComplete) onComplete();
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.error || err.message || 'Scheduling failed.';
      setErrorMessage(errorMsg);
    }
  });

  const handleCreateEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventCust || !newEventPlace || !newEventDateStart || !newEventDateEnd) {
      setErrorMessage('Please enter complete event scheduling inputs.');
      return;
    }
    createEventMutation.mutate({
      customerName: newEventCust,
      place: newEventPlace,
      eventDate: {
        start: new Date(newEventDateStart).toISOString(),
        end: new Date(newEventDateEnd).toISOString()
      },
      timeWindow: {
        start: newEventTimeStart,
        end: newEventTimeEnd
      },
      program: newEventProg,
      eventStatus: eventStatus,
      items: newEventItems
    });
  };

  const nextStep = () => {
    if (step === 1) {
      if (!newEventCust || !newEventPlace || !newEventDateStart || !newEventDateEnd) {
        setErrorMessage('Please fill in all required fields before proceeding.');
        return;
      }
      setErrorMessage(null);
    }
    setStep((s) => Math.min(s + 1, 3));
  };
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader 
        title="Schedule New Event" 
        description="Follow the steps to create a new event booking and assign catalog items." 
      />

      {message && (
        <Alert message={message} type="success" onClose={() => setMessage(null)} />
      )}

      {errorMessage && (
        <Alert message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />
      )}

      {/* Stepper Header */}
      <div className="flex justify-between items-center mb-4 border-b border-[#E2E8F0] pb-4">
        {[
          { id: 1, label: '1. Details' },
          { id: 2, label: '2. Inventory Selection' },
          { id: 3, label: '3. Review & Submit' }
        ].map((s) => (
          <div 
            key={s.id} 
            className={`flex-1 text-center py-2 text-sm font-bold border-b-2 transition-all ${
              step >= s.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'
            }`}
          >
            {s.label}
          </div>
        ))}
      </div>

      <Card>
        <form onSubmit={handleCreateEventSubmit} className="flex flex-col gap-6">
          
          {/* STEP 1: Details */}
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-200">
              <Input
                label="Customer Name *"
                placeholder="Jane Smith"
                value={newEventCust}
                onChange={(e: any) => setNewEventCust(e.target.value)}
              />

              <Input
                label="Venue / Place *"
                placeholder="Grand Hyatt Hall, Kochi"
                value={newEventPlace}
                onChange={(e: any) => setNewEventPlace(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Start Date *</label>
                  <input
                    type="date"
                    className="glow-input text-xs"
                    value={newEventDateStart}
                    onChange={(e) => setNewEventDateStart(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">End Date *</label>
                  <input
                    type="date"
                    className="glow-input text-xs"
                    value={newEventDateEnd}
                    onChange={(e) => setNewEventDateEnd(e.target.value)}
                  />
                </div>
              </div>

              <Input
                label="Program Description"
                placeholder="Wedding Reception Ceremony"
                value={newEventProg}
                onChange={(e: any) => setNewEventProg(e.target.value)}
              />

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Event Timings *</label>
                <div 
                  className="glow-input flex justify-between items-center bg-white border border-slate-200 rounded-lg p-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition"
                  onClick={() => setIsTimeModalOpen(true)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-800">{newEventTimeStart}</span>
                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">TO</span>
                    <span className="text-lg font-black text-slate-800">{newEventTimeEnd}</span>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded uppercase tracking-wider">
                    Edit Schedule Times
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Inventory */}
          {step === 2 && (
            <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assign Catalog Items to Event</h4>
              
              {isCheckingAvailability && (
                <div className="text-xs text-blue-600 animate-pulse font-bold">Checking real-time availability for selected dates...</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
                {activeItems.map((item: any) => {
                  const existing = newEventItems.find((i) => i.itemId === item._id);
                  const qty = existing ? existing.quantity : 0;
                  const availableQty = availabilityMap[item._id] !== undefined ? availabilityMap[item._id] : item.currentStock;

                  return (
                    <div key={item._id} className="p-3 rounded border border-[#E2E8F0] bg-slate-50 flex justify-between items-center shadow-sm">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-slate-800 font-bold">{item.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Code: {item.itemCode} • Avail: <strong className={availableQty === 0 ? 'text-red-600 font-extrabold animate-pulse' : 'text-emerald-600 font-bold'}>{availableQty}</strong> / {item.currentStock} max
                        </span>
                      </div>
                      <input
                        type="number"
                        className="w-16 glow-input text-xs p-1.5 text-center bg-white border border-[#E2E8F0] rounded"
                        placeholder="0"
                        value={qty || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val <= 0) {
                            setNewEventItems(newEventItems.filter((i) => i.itemId !== item._id));
                          } else {
                            if (val > availableQty) {
                              setErrorMessage(`Stock Warning: Only ${availableQty} units available on these dates for ${item.name}!`);
                            } else {
                              setErrorMessage(null);
                            }
                            const other = newEventItems.filter((i) => i.itemId !== item._id);
                            setNewEventItems([...other, { itemId: item._id, quantity: val }]);
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Review */}
          {step === 3 && (
            <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-lg text-sm">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Customer</p>
                  <p className="font-semibold text-slate-900">{newEventCust}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Venue</p>
                  <p className="font-semibold text-slate-900">{newEventPlace}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Duration</p>
                  <p className="font-semibold text-slate-900">{newEventDateStart} to {newEventDateEnd}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Items Assigned</p>
                  <p className="font-semibold text-slate-900">{newEventItems.length} items</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Initial Event Status</label>
                <div className="flex gap-4">
                  {['INQUIRY', 'QUOTATION', 'APPROVED'].map((status) => (
                    <label key={status} className={`flex items-center gap-2 cursor-pointer p-3 border rounded-lg transition-all ${eventStatus === status ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input 
                        type="radio" 
                        name="eventStatus" 
                        value={status} 
                        checked={eventStatus === status} 
                        onChange={() => setEventStatus(status as any)}
                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm font-bold text-slate-700">{status}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Select the starting lifecycle state for this booking.</p>
              </div>

            </div>
          )}

          {/* Stepper Footer Controls */}
          <div className="flex justify-between border-t border-[#E2E8F0] pt-6 mt-2">
            {step > 1 ? (
              <Button type="button" variant="ghost" onClick={prevStep}>
                ← Back
              </Button>
            ) : <div />}
            
            {step < 3 ? (
              <Button type="button" onClick={nextStep} className="px-8">
                Next Step →
              </Button>
            ) : (
              <Button type="submit" disabled={createEventMutation.isPending} className="px-8 bg-green-600 hover:bg-green-700">
                {createEventMutation.isPending ? 'Saving...' : 'Finalize & Create Event ✔'}
              </Button>
            )}
          </div>
        </form>
      </Card>

      <TimeSetModal 
        isOpen={isTimeModalOpen}
        onClose={() => setIsTimeModalOpen(false)}
        initialStartTime={newEventTimeStart}
        initialEndTime={newEventTimeEnd}
        onSave={(start, end) => {
          setNewEventTimeStart(start);
          setNewEventTimeEnd(end);
        }}
      />
    </div>
  );
}
