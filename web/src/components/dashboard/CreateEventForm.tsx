"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { SectionHeader } from '../ui/SectionHeader';
import axios from 'axios';

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
      const res = await axios.get('http://localhost:5000/api/inventory', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      return res.data;
    },
    placeholderData: initialItems
  });

  const activeItems = inventoryData.length > 0 ? inventoryData : initialItems;

  // Create Event Mutation
  const createEventMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await axios.post('http://localhost:5000/api/events', payload, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
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
            <Input
              label="Start Time"
              placeholder="10:00"
              value={newEventTimeStart}
              onChange={(e: any) => setNewEventTimeStart(e.target.value)}
            />
            <Input
              label="End Time"
              placeholder="18:00"
              value={newEventTimeEnd}
              onChange={(e: any) => setNewEventTimeEnd(e.target.value)}
            />
          </div>

          {/* Catalog selection dropdown */}
          <div className="md:col-span-2 border-t border-[#E2E8F0] pt-6">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Assign Catalog Items to Event</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeItems.map((item: any) => {
                const existing = newEventItems.find((i) => i.itemId === item.itemCode);
                const qty = existing ? existing.quantity : 0;

                return (
                  <div key={item.itemCode} className="p-3 rounded border border-[#E2E8F0] bg-slate-50 flex justify-between items-center">
                    <span className="text-xs text-slate-700 font-medium">{item.name} (Stock: {item.currentStock})</span>
                    <input
                      type="number"
                      className="w-16 glow-input text-xs p-1.5 text-center bg-white border border-[#E2E8F0] rounded"
                      placeholder="0"
                      value={qty || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val <= 0) {
                          setNewEventItems(newEventItems.filter((i) => i.itemId !== item.itemCode));
                        } else {
                          if (val > item.currentStock) {
                            setErrorMessage(`Stock Warning: Only ${item.currentStock} units available for ${item.name}!`);
                          } else {
                            setErrorMessage(null);
                          }
                          const other = newEventItems.filter((i) => i.itemId !== item.itemCode);
                          setNewEventItems([...other, { itemId: item.itemCode, quantity: val }]);
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
