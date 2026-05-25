"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { SectionHeader } from '../ui/SectionHeader';
import { Alert } from '../ui/Alert';
import { Customer, Event } from '../../types';
import { getEventsApi } from '../../services/api';

interface CustomerLedgerPanelProps {
  initialCustomers?: Customer[];
  initialEvents?: Event[];
}

export function CustomerLedgerPanel({ 
  initialCustomers = [],
  initialEvents = []
}: CustomerLedgerPanelProps) {
  const [customers, setCustomers] = useState<Customer[]>(
    initialCustomers.length > 0 ? initialCustomers : [
      { id: '1', name: 'Alwin Joy', place: 'Kochi', contact: '9876543210', historyCount: 2 },
      { id: '2', name: 'Jane Smith', place: 'Trivandrum', contact: '9876543211', historyCount: 1 },
      { id: '3', name: 'John Doe', place: 'Calicut', contact: '9876543212', historyCount: 1 }
    ]
  );

  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<string | null>(null);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPlace, setNewCustPlace] = useState('');
  const [newCustContact, setNewCustContact] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // TanStack Query for events to match work history
  const { data: eventsData = [] } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: getEventsApi,
    placeholderData: initialEvents
  });

  const activeEvents = eventsData.length > 0 ? eventsData : initialEvents;

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPlace || !newCustContact) {
      setErrorMessage('Please fill in all customer detail fields.');
      return;
    }
    const newCust = {
      id: String(customers.length + 1),
      name: newCustName,
      place: newCustPlace,
      contact: newCustContact,
      historyCount: 0
    };
    setCustomers([...customers, newCust]);
    setNewCustName('');
    setNewCustPlace('');
    setNewCustContact('');
    setMessage('Customer Ledger Profile Created Successfully!');
    setErrorMessage(null);
  };

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader 
        title="Customer Ledgers & Accounts" 
        description="Review active ledgers, check booking works histories, and add new customer listings." 
      />

      {message && (
        <Alert message={message} type="success" onClose={() => setMessage(null)} />
      )}

      {errorMessage && (
        <Alert message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Customers Listing */}
        <Card className="lg:col-span-2 flex flex-col gap-4">
          <h3 className="text-md font-bold text-[#0F172A] mb-2">Registered Accounts</h3>
          
          <div className="flex flex-col gap-3">
            {customers.map((cust) => {
              const initials = cust.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div key={cust.id} className="p-4 rounded-xl border border-[#E2E8F0] bg-white flex flex-col gap-3 shadow-sm hover-scale transition">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500/10 to-teal-500/10 border border-blue-100 flex items-center justify-center text-blue-600 font-extrabold text-sm shrink-0 uppercase">
                        {initials}
                      </div>
                      <div>
                        <p className="font-bold text-[#0F172A] text-base">{cust.name}</p>
                        <p className="text-xs text-slate-500">📍 {cust.place} • 📞 {cust.contact}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="px-3 py-1 bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold rounded-full">
                        {cust.historyCount} Bookings
                      </span>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setSelectedCustomerHistory(
                            selectedCustomerHistory === cust.id ? null : cust.id
                          );
                        }}
                      >
                        {selectedCustomerHistory === cust.id ? 'Hide Works' : 'View History'}
                      </Button>
                    </div>
                  </div>

                 {selectedCustomerHistory === cust.id && (
                  <div className="mt-2 border-t border-[#E2E8F0] pt-3 flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase text-blue-600 tracking-wider font-sans">Works Log history:</p>
                    {activeEvents
                      .filter((e: Event) => e.customerName.toLowerCase().includes(cust.name.toLowerCase()))
                      .map((ev: Event) => (
                        <div key={ev._id} className="p-3 rounded bg-slate-50 border border-[#E2E8F0] text-xs flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-slate-700">{ev.program}</p>
                            <p className="text-[10px] text-slate-500">📍 {ev.place} • {new Date(ev.eventDate.start).toDateString()}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold uppercase">
                            Booked
                          </span>
                        </div>
                      ))}
                    {activeEvents.filter((e: Event) => e.customerName.toLowerCase().includes(cust.name.toLowerCase())).length === 0 && (
                      <p className="text-xs text-slate-400 italic">No historical events recorded under this name.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </Card>

        {/* Create Customer */}
        <Card className="h-fit">
          <h3 className="text-md font-bold text-[#0F172A] mb-6">New Customer Creation</h3>
          
          <form onSubmit={handleCreateCustomerSubmit} className="flex flex-col gap-4">
            <Input
              label="Customer Name"
              placeholder="John Doe"
              value={newCustName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCustName(e.target.value)}
            />
            
            <Input
              label="City Location"
              placeholder="Kochi"
              value={newCustPlace}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCustPlace(e.target.value)}
            />

            <Input
              label="Contact Phone"
              placeholder="9876543210"
              value={newCustContact}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCustContact(e.target.value)}
            />

            <Button type="submit" className="w-full mt-2">
              Submit Customer
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
