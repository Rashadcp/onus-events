"use client";

import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Calendar, FileText } from 'lucide-react';

interface EventBannerProps {
  selectedEvent: any;
  onPrint: () => void;
}

export function EventBanner({ selectedEvent, onPrint }: EventBannerProps) {
  return (
    <Card className="border border-slate-200 bg-white p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4 shadow-sm print:hidden">
      <div className="flex flex-col gap-1">
        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping" />
          Logistics Log Sheet
        </span>
        <h2 className="text-xl font-bold text-slate-900 leading-tight">{selectedEvent.customerName}</h2>
        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> 
            {new Date(selectedEvent.eventDate.start).toDateString()}
          </span>
          <span className="flex items-center gap-1">
            🕒 {selectedEvent.timeWindow?.start || '09:00'} - {selectedEvent.timeWindow?.end || '18:00'}
          </span>
          <span className="flex items-center gap-1">
            📍 {selectedEvent.place}
          </span>
        </div>
      </div>
      
      <div className="flex gap-2 shrink-0 print:hidden">
        <Button
          onClick={onPrint}
          className="bg-white border border-slate-350 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 py-2.5 px-4 rounded-md shadow-sm"
        >
          <FileText className="w-4 h-4 text-slate-500" />
          Print Store Copy
        </Button>
      </div>
    </Card>
  );
}
