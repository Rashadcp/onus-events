"use client";

import React, { useState } from 'react';
import { Event } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface EventCalendarProps {
  events: Event[];
  onEventClick: (event: Event) => void;
}

export function EventCalendar({ events, onEventClick }: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  const getEventsForDay = (day: number) => {
    const date = new Date(year, month, day);
    // Remove time for precise day comparison
    const targetDateStr = date.toISOString().split('T')[0];
    
    return events.filter(e => {
      if (e.isDeleted) return false;
      const startStr = new Date(e.eventDate.start).toISOString().split('T')[0];
      const endStr = new Date(e.eventDate.end).toISOString().split('T')[0];
      return targetDateStr >= startStr && targetDateStr <= endStr;
    });
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'INQUIRY': return 'bg-slate-200 text-slate-800';
      case 'QUOTATION': return 'bg-yellow-200 text-yellow-800';
      case 'APPROVED': return 'bg-blue-200 text-blue-800';
      case 'CONFIRMED': return 'bg-emerald-200 text-emerald-800';
      case 'LOADING': return 'bg-orange-200 text-orange-800';
      case 'DISPATCHED': return 'bg-purple-200 text-purple-800';
      case 'RETURNED': return 'bg-teal-200 text-teal-800';
      case 'CLOSED': return 'bg-slate-800 text-white';
      default: return 'bg-slate-200 text-slate-800';
    }
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => <div key={`blank-${i}`} className="p-2 border border-slate-100 bg-slate-50 opacity-50" />);
  
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dayEvents = getEventsForDay(day);
    const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

    return (
      <div key={`day-${day}`} className={`p-2 border border-slate-100 min-h-[100px] flex flex-col gap-1 ${isToday ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-white'}`}>
        <span className={`text-xs font-bold ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>{day}</span>
        <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px]">
          {dayEvents.map(e => (
            <button
              key={e._id}
              onClick={() => onEventClick(e)}
              className={`text-[9px] font-bold text-left px-1.5 py-0.5 rounded truncate transition hover:opacity-80 ${getStatusColor(e.eventStatus)}`}
              title={`${e.customerName} - ${e.place}`}
            >
              {e.customerName}
            </button>
          ))}
        </div>
      </div>
    );
  });

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-4">
        <h3 className="text-xl font-bold text-slate-800">
          {monthNames[month]} {year}
        </h3>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={prevMonth} className="px-3 py-1">←</Button>
          <Button variant="ghost" onClick={today} className="px-4 py-1 text-xs">Today</Button>
          <Button variant="ghost" onClick={nextMonth} className="px-3 py-1">→</Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0 border-t border-l border-slate-100 rounded overflow-hidden">
        {dayNames.map(d => (
          <div key={d} className="bg-slate-100 p-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-r border-slate-200">
            {d}
          </div>
        ))}
        {blanks}
        {days}
      </div>
    </Card>
  );
}
