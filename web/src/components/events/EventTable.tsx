"use client";

import React, { useState } from 'react';
import { Event } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface EventTableProps {
  events: Event[];
  onViewDetails: (event: Event) => void;
}

export function EventTable({ events, onViewDetails }: EventTableProps) {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const filteredEvents = events.filter((e) => {
    if (e.isDeleted) return false;
    if (filterStatus !== 'ALL' && e.eventStatus !== filterStatus) return false;
    if (search && !e.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'INQUIRY': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'QUOTATION': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'APPROVED': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CONFIRMED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'LOADING': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'DISPATCHED': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'RETURNED': return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'CLOSED': return 'bg-slate-800 text-white border-slate-900';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-[#E2E8F0] pb-4">
        <h3 className="text-lg font-bold text-slate-800">Event Directory</h3>
        <div className="flex gap-4 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search by customer..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glow-input text-sm px-3 py-2 border border-slate-200 rounded-lg flex-1 md:w-64"
          />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="glow-input text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="INQUIRY">Inquiry</option>
            <option value="QUOTATION">Quotation</option>
            <option value="APPROVED">Approved</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="LOADING">Loading</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="RETURNED">Returned</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-2">Customer & Venue</th>
              <th className="py-3 px-2">Dates</th>
              <th className="py-3 px-2">Status</th>
              <th className="py-3 px-2">Created By</th>
              <th className="py-3 px-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-400 italic">No events found matching your criteria.</td>
              </tr>
            ) : (
              filteredEvents.map((event) => (
                <tr key={event._id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="py-3 px-2">
                    <p className="font-bold text-slate-800">{event.customerName}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{event.place}</p>
                  </td>
                  <td className="py-3 px-2">
                    <p className="font-semibold text-slate-700">{new Date(event.eventDate.start).toLocaleDateString()}</p>
                    <p className="text-xs text-slate-500">to {new Date(event.eventDate.end).toLocaleDateString()}</p>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${getStatusColor(event.eventStatus || 'INQUIRY')}`}>
                      {event.eventStatus || 'INQUIRY'}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <p className="text-xs font-semibold text-slate-700">{event.createdBy?.fullName || 'Rep'}</p>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <Button variant="ghost" onClick={() => onViewDetails(event)} className="text-xs py-1.5 px-3 border border-slate-200">
                      View Details
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
