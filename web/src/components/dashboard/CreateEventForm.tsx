"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { SectionHeader } from '../ui/SectionHeader';
import { ClockTimePicker } from '../ui/ClockTimePicker';
import { apiClient } from '../../utils/apiClient';

interface CreateEventFormProps {
  initialItems?: any[];
}

export function CreateEventForm({ initialItems = [] }: CreateEventFormProps) {
  const queryClient = useQueryClient();

  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [newEventCust, setNewEventCust] = useState('');
  const [newEventPlace, setNewEventPlace] = useState('');
  const [newEventDateStart, setNewEventDateStart] = useState('');
  const [newEventDateEnd, setNewEventDateEnd] = useState('');
  const [newEventTimeStart, setNewEventTimeStart] = useState('10:00');
  const [newEventTimeEnd, setNewEventTimeEnd] = useState('18:00');
  const [newEventProg, setNewEventProg] = useState('Lunch Program');
  const [newEventItems, setNewEventItems] = useState<{ itemId: string; quantity: number }[]>([]);
  
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
      const res = await apiClient.post('/api/events', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setMessage('Event Created & Scheduled Successfully!');
      setErrorMessage(null);
      setNewEventCust('');
      setNewEventPlace('');
      setNewEventItems([]);
      setNewEventDateStart('');
      setNewEventDateEnd('');
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
      items: newEventItems
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader 
        title="Schedule New Event" 
        description="Direct customer event creation flow with real-time item assignment validation." 
      />

      {message && (
        <Alert message={message} type="success" onClose={() => setMessage(null)} />
      )}

      {errorMessage && (
        <Alert message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />
      )}

      <Card>
        <form onSubmit={handleCreateEventSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Customer Name"
            placeholder="Jane Smith"
            value={newEventCust}
            onChange={(e: any) => setNewEventCust(e.target.value)}
          />

          <Input
            label="Venue / Place"
            placeholder="Grand Hyatt Hall, Kochi"
            value={newEventPlace}
            onChange={(e: any) => setNewEventPlace(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Start Date</label>
              <input
                type="date"
                className="glow-input text-xs"
                value={newEventDateStart}
                onChange={(e) => setNewEventDateStart(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">End Date</label>
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

          <div className="grid grid-cols-2 gap-4">
            <ClockTimePicker
              label="Start Time"
              value={newEventTimeStart}
              onChange={setNewEventTimeStart}
            />
            <ClockTimePicker
              label="End Time"
              value={newEventTimeEnd}
              onChange={setNewEventTimeEnd}
            />
          </div>

          {/* Catalog selection dropdown */}
          <div className="md:col-span-2 border-t border-[#E2E8F0] pt-6">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Assign Catalog Items to Event</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <Button type="submit" className="md:col-span-2 mt-4 py-3">
            Schedule and Book Event
          </Button>
        </form>
      </Card>
    </div>
  );
}
