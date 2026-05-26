"use client";

import React, { useState } from 'react';
import { Event } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Search, Calendar, Filter, User } from 'lucide-react';

interface UpcomingEventsPageProps {
  events: Event[];
  onViewDetails: (event: Event) => void;
}

export function UpcomingEventsPage({ events, onViewDetails }: UpcomingEventsPageProps) {
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Clean, beginner-friendly status badge styling mapper
  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'INQUIRY':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'QUOTATION':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'APPROVED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CONFIRMED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'LOADING':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'DISPATCHED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'RETURNED':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'CLOSED':
        return 'bg-zinc-100 text-zinc-800 border-zinc-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-250';
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

  // Filter implementation (Simple, readable, and highly maintainable)
  const filteredEvents = events.filter((ev) => {
    // 1. Search Query (Matches Event Name or Customer Name)
    const matchesSearch = 
      ev.program.toLowerCase().includes(searchQuery.toLowerCase()) || 
      ev.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Status Filter
    const matchesStatus = statusFilter === 'ALL' || ev.eventStatus === statusFilter;

    // 3. Date Filter (Check if start date matches selected date)
    let matchesDate = true;
    if (dateFilter) {
      const eventDateStr = new Date(ev.eventDate.start).toISOString().split('T')[0];
      matchesDate = eventDateStr === dateFilter;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Upcoming Events</h2>
        <p className="text-xs text-slate-400 font-medium">Browse, search, and verify all active future event schedules.</p>
      </div>

      {/* Filter Toolbar Section */}
      <Card className="bg-white border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-4">
        
        {/* Search Input Box */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by event or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-800 placeholder:text-slate-400"
          />
        </div>

        {/* Date Filter Selection */}
        <div className="relative w-full md:w-48 shrink-0">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-700"
          />
        </div>

        {/* Status Filter Selection */}
        <div className="relative w-full md:w-48 shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-600 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="INQUIRY">INQUIRY</option>
            <option value="QUOTATION">QUOTATION</option>
            <option value="APPROVED">APPROVED</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="LOADING">LOADING</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="RETURNED">RETURNED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {(searchQuery || statusFilter !== 'ALL' || dateFilter) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              setDateFilter('');
            }}
            className="text-[11px] py-1.5 px-3 border border-slate-200 shrink-0 text-slate-500"
          >
            Clear Filters
          </Button>
        )}
      </Card>

      {/* Responsive Event Table Card */}
      <Card className="bg-white border border-slate-200 shadow-sm p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                <th className="p-4 pl-5">Event Name</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Venue</th>
                <th className="p-4">Event Date</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4">Assigned Staff</th>
                <th className="p-4 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((ev) => {
                // Resolve assigned captain or creator details
                const assignedStaffName = 
                  ev.assignedCaptain?.fullName || 
                  ev.assignedCaptain?.name || 
                  ev.createdBy?.fullName || 
                  ev.createdBy?.name || 
                  'Field Representative';

                return (
                  <tr key={ev._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    {/* Event Name */}
                    <td className="p-4 pl-5 font-bold text-slate-900 text-sm">
                      {ev.program}
                    </td>

                    {/* Customer */}
                    <td className="p-4 text-slate-700 font-semibold">
                      {ev.customerName}
                    </td>

                    {/* Venue Place */}
                    <td className="p-4 text-slate-600 truncate max-w-[180px]">
                      {ev.place}
                    </td>

                    {/* Event Date start */}
                    <td className="p-4 font-semibold text-slate-600">
                      {formatDate(ev.eventDate.start)}
                    </td>

                    {/* Status Badge */}
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider border ${getStatusBadgeClass(ev.eventStatus)}`}>
                        {ev.eventStatus || 'INQUIRY'}
                      </span>
                    </td>

                    {/* Assigned Staff */}
                    <td className="p-4 text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                          <User className="w-3 h-3 text-slate-400" />
                        </div>
                        <span>{assignedStaffName}</span>
                      </div>
                    </td>

                    {/* Actions button */}
                    <td className="p-4 pr-5 text-right">
                      <Button
                        variant="ghost"
                        onClick={() => onViewDetails(ev)}
                        className="text-[10px] py-1.5 px-3 border border-slate-200 font-bold hover:bg-slate-50 cursor-pointer"
                      >
                        Verify Details
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 italic text-sm">
                    No upcoming events scheduled matching search filter keywords.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}
