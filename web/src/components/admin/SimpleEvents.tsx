"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  Filter, 
  MapPin, 
  Clock 
} from 'lucide-react';

import { Event } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  getEventsApi, 
  createEventApi, 
  deleteEventApi,
  updateEventStatusApi 
} from '../../services/api';

// Atomic Reusable UI Components
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';

export function SimpleEvents() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'SALES_REPRESENTATIVE';

  // Notifications
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Create Event Modal form states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [program, setProgram] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('22:00');
  const [place, setPlace] = useState('');

  // Delete Confirmation States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [deletingCustomerName, setDeletingCustomerName] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Fetch Events via React Query
  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: getEventsApi,
    placeholderData: []
  });

  // Mutation: Create event
  const createEventMutation = useMutation({
    mutationFn: createEventApi,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setMessage(`Event for "${customerName}" has been successfully scheduled.`);
      setErrorMessage(null);
      resetCreateForm();
      setIsCreateModalOpen(false);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to schedule event.');
    }
  });

  // Mutation: Update status
  const updateStatusMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: string }) => updateEventStatusApi(eventId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setMessage('Event status updated successfully.');
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update event status.');
    }
  });

  // Mutation: Soft delete event
  const deleteEventMutation = useMutation({
    mutationFn: deleteEventApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setMessage('Event deleted successfully.');
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to delete event draft.');
    }
  });

  // Reset Form
  const resetCreateForm = () => {
    setCustomerName('');
    setProgram('');
    setStartDate('');
    setEndDate('');
    setStartTime('10:00');
    setEndTime('22:00');
    setPlace('');
  };

  // Submit Handlers
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !program || !startDate || !endDate || !place) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    createEventMutation.mutate({
      customerName: customerName.trim(),
      program: program.trim(),
      eventDate: {
        start: new Date(startDate).toISOString(),
        end: new Date(endDate).toISOString()
      },
      timeWindow: {
        start: startTime,
        end: endTime
      },
      place: place.trim(),
      confirmations: {
        COUNTER_DECOR: { confirmed: false },
        CLOTH_DECOR: { confirmed: false },
        RENTAL_ITEMS: { confirmed: false },
        EXPENSE_CHARGES: { confirmed: false },
        STAFF: { confirmed: false },
        OUTSIDE_RENTAL: { confirmed: false }
      }
    });
  };

  const handleStatusChange = (eventId: string, newStatus: string) => {
    updateStatusMutation.mutate({ eventId, status: newStatus });
  };

  const handleDelete = (eventId: string, customer: string) => {
    setDeletingEventId(eventId);
    setDeletingCustomerName(customer);
    setDeleteConfirmText(user?.fullName || user?.name || user?.email || '');
    setIsDeleteModalOpen(true);
  };

  const executeDeletion = () => {
    if (deletingEventId) {
      deleteEventMutation.mutate(deletingEventId);
      setIsDeleteModalOpen(false);
      setDeletingEventId(null);
    }
  };

  // Filter & Search Implementation
  const filteredEvents = events.filter((ev) => {
    const customerMatch = ev.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const programMatch = ev.program.toLowerCase().includes(searchTerm.toLowerCase());
    const searchMatch = customerMatch || programMatch;

    const statusMatch = statusFilter === 'ALL' || ev.eventStatus === statusFilter;
    const activeMatch = !ev.isDeleted;

    return searchMatch && statusMatch && activeMatch;
  });

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'INQUIRY':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      case 'QUOTATION':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'APPROVED':
        return 'bg-teal-50 text-teal-700 border border-teal-200';
      case 'CONFIRMED':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'LOADING':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      case 'DISPATCHED':
        return 'bg-violet-50 text-violet-700 border border-violet-200';
      case 'RETURNED':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'CLOSED':
        return 'bg-zinc-150 text-zinc-800 border border-zinc-300';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  const formatDate = (dateStr: string | Date) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Notifications */}
      {message && <Alert message={message} type="success" onClose={() => setMessage(null)} />}
      {errorMessage && <Alert message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />}

      {/* Header Info Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0F172A] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Simple Events Scheduler
          </h2>
          <p className="text-xs text-slate-400 font-medium">Verify event statuses, schedules, dates, and locations.</p>
        </div>
        
        {isPrivileged && (
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 text-xs py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm font-bold cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Create New Event
          </Button>
        )}
      </div>

      {/* Search and Filters panel */}
      <Card className="p-5 border border-slate-200/80 bg-white shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
          <Filter className="w-3.5 h-3.5" /> Filtering & Search Controls
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search keywords */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by Event Name (Program) or Customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition placeholder:text-slate-400"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-600 font-medium"
            >
              <option value="ALL">All Event Statuses</option>
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
        </div>
      </Card>

      {/* Event Listing Table Card */}
      <Card className="overflow-hidden p-0 border border-slate-200/80 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm">Scheduled Bookings ({filteredEvents.length})</h3>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            ERP Core System Schedule
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading scheduled events...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                  <th className="p-4 pl-6">Event Name (Program)</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Date / Window</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev) => {
                  return (
                    <tr 
                      key={ev._id} 
                      className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors"
                    >
                      {/* Event Name */}
                      <td className="p-4 pl-6">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{ev.program}</p>
                          <div className="flex items-center gap-1.5 mt-1 text-slate-400 text-[11px] font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[220px]">{ev.place}</span>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="p-4 text-slate-700 font-semibold text-sm">
                        {ev.customerName}
                      </td>

                      {/* Date Range */}
                      <td className="p-4 text-slate-600 font-medium">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs text-slate-700 font-semibold">
                            {formatDate(ev.eventDate.start)}
                          </p>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" /> 
                            {ev.timeWindow?.start || '10:00'} - {ev.timeWindow?.end || '22:00'}
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 text-[9px] font-bold rounded-md uppercase tracking-wider ${getStatusBadgeClass(ev.eventStatus)}`}>
                          {ev.eventStatus || 'INQUIRY'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center gap-3.5 justify-end">
                          {/* Status modification trigger dropdown */}
                          {isPrivileged ? (
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-100 transition shrink-0">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">State:</span>
                              <select 
                                value={ev.eventStatus || 'INQUIRY'} 
                                onChange={(e) => handleStatusChange(ev._id, e.target.value)}
                                className="bg-transparent text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer"
                              >
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
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold italic">Read-only view</span>
                          )}

                          {/* Delete option */}
                          {isPrivileged && (
                            <Button 
                              variant="danger" 
                              onClick={() => handleDelete(ev._id, ev.customerName)}
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg hover:scale-[1.02] shadow-sm flex items-center justify-center cursor-pointer"
                              aria-label="Delete Event"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredEvents.length === 0 && (
                  <tr>
                    <td 
                      colSpan={5} 
                      className="py-16 text-center text-slate-400 italic text-sm"
                    >
                      No scheduled event bookings found matching search filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Event Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          title="📅 Schedule ERP Event Booking"
          description="Complete the fields below to schedule a new event program."
          onClose={() => {
            setIsCreateModalOpen(false);
            setErrorMessage(null);
          }}
        >
          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
            <Input 
              label="Customer Name (Unique ID or Full Name)"
              placeholder="Alwin Joy Wedding"
              value={customerName}
              onChange={(e: any) => setCustomerName(e.target.value)}
              required
            />

            <Input 
              label="Program / Event Name"
              placeholder="Wedding Reception Ceremony & Banquet"
              value={program}
              onChange={(e: any) => setProgram(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input 
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e: any) => setStartDate(e.target.value)}
                required
              />
              <Input 
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e: any) => setEndDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input 
                label="Start Time Window"
                type="time"
                value={startTime}
                onChange={(e: any) => setStartTime(e.target.value)}
                required
              />
              <Input 
                label="End Time Window"
                type="time"
                value={endTime}
                onChange={(e: any) => setEndTime(e.target.value)}
                required
              />
            </div>

            <Input 
              label="Place (Venue Location)"
              placeholder="Grand Hyatt Convention Center, Kochi"
              value={place}
              onChange={(e: any) => setPlace(e.target.value)}
              required
            />

            <Button 
              type="submit" 
              className="w-full mt-3 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm cursor-pointer"
              loading={createEventMutation.isPending}
            >
              Schedule Event Draft
            </Button>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          title="⚠️ Auditor Deletion Verification"
          description="A soft delete log will be permanently audited against your profile."
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingEventId(null);
            setDeleteConfirmText('');
          }}
        >
          <div className="flex flex-col gap-4">
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs leading-5">
              Are you sure you want to soft delete the event booking for <strong>&quot;{deletingCustomerName}&quot;</strong>? This cancels all warehouse inventory allocations and reserves.
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="auditorSign" className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Accountability Signature (Please type your full name / username) *
              </label>
              <input
                id="auditorSign"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="e.g. akhil_sales"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition placeholder:text-slate-400 font-medium text-slate-800"
                required
              />
            </div>

            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 font-semibold border border-red-100">
              ⚠️ Deleting User: <span className="font-bold">{user?.fullName || user?.name || user?.email || 'System / Logged-in User'}</span>
              <br />
              This soft-delete action will be recorded and audited in system logs.
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4 mt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingEventId(null);
                  setDeleteConfirmText('');
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={!deleteConfirmText.trim()}
                onClick={executeDeletion}
                className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Confirm Booking Deletion
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
