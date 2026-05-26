"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Clock } from 'lucide-react';
import { Button } from './Button';

interface TimeRangePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (startTime: string, endTime: string) => void;
  initialStartTime?: string; // "HH:MM" 24h
  initialEndTime?: string;   // "HH:MM" 24h
}

// Helper to parse "HH:MM" to { h: 1-12, m: 0-59, period: 'AM'|'PM' }
type TimePeriod = 'AM' | 'PM';

const parseTime = (timeStr: string): { h: number; m: number; period: TimePeriod } => {
  if (!timeStr) return { h: 10, m: 0, period: 'AM' as const };
  const [hh, mm] = timeStr.split(':').map(Number);
  const period: TimePeriod = hh >= 12 ? 'PM' : 'AM';
  let h = hh % 12;
  if (h === 0) h = 12;
  return { h, m: mm || 0, period };
};

// Helper to format back to "HH:MM" 24h
const formatTime24 = (h: number, m: number, period: 'AM' | 'PM') => {
  let hh = h;
  if (period === 'PM' && hh !== 12) hh += 12;
  if (period === 'AM' && hh === 12) hh = 0;
  return `${hh.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const ClockFace = ({ 
  selectedHour, 
  onSelectHour 
}: { 
  selectedHour: number, 
  onSelectHour: (h: number) => void 
}) => {
  const radius = 80;
  const center = 110;
  
  return (
    <div className="relative w-[220px] h-[220px] rounded-full border border-slate-100 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex items-center justify-center mx-auto my-6">
      <div className="absolute w-3 h-3 bg-blue-600 rounded-full z-10" />
      {/* Clock Hand */}
      <div 
        className="absolute w-[2px] bg-blue-400 origin-bottom rounded-full"
        style={{
          height: radius - 15,
          bottom: '50%',
          left: 'calc(50% - 1px)',
          transform: `rotate(${selectedHour * 30}deg)`,
          transformOrigin: 'bottom center'
        }}
      />
      {/* Numbers */}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => {
        const angle = (h * 30 - 90) * (Math.PI / 180);
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        const isSelected = selectedHour === h || (selectedHour === 0 && h === 12);
        
        return (
          <button
            key={h}
            type="button"
            onClick={() => onSelectHour(h)}
            className={`absolute w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold transition-all -ml-[18px] -mt-[18px] z-20 ${
              isSelected 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 scale-110' 
                : 'text-slate-700 hover:bg-slate-100 hover:scale-110'
            }`}
            style={{ left: `${x}px`, top: `${y}px` }}
          >
            {h}
          </button>
        );
      })}
    </div>
  );
};

const TimePickerCard = ({
  title,
  hour,
  minute,
  period,
  onChange
}: {
  title: string;
  hour: number;
  minute: number;
  period: 'AM' | 'PM';
  onChange: (updates: { h?: number, m?: number, p?: 'AM' | 'PM' }) => void;
}) => {
  return (
    <div className="flex-1 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">{title}</h3>
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
          <Clock className="w-4 h-4" />
        </div>
      </div>

      {/* Digital Display Box */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-blue-600 text-white rounded-lg p-3 text-center text-2xl font-black shadow-inner shadow-blue-700/50">
            {hour.toString().padStart(2, '0')}
          </div>
          <div className="text-2xl font-black text-slate-800 pb-1">:</div>
          <div className="flex-1 bg-white text-slate-800 border border-slate-200 rounded-lg p-3 text-center text-2xl font-black">
            {minute.toString().padStart(2, '0')}
          </div>
          <div className="flex flex-col gap-1 ml-1">
            <button
              type="button"
              onClick={() => onChange({ p: 'AM' })}
              className={`px-3 py-1.5 text-xs font-black rounded border transition-all ${
                period === 'AM' 
                  ? 'bg-[#0F172A] text-white border-[#0F172A]' 
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => onChange({ p: 'PM' })}
              className={`px-3 py-1.5 text-xs font-black rounded border transition-all ${
                period === 'PM' 
                  ? 'bg-[#0F172A] text-white border-[#0F172A]' 
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              PM
            </button>
          </div>
        </div>
        <div className="text-center text-xs font-bold text-slate-500 mt-1">
          {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')} {period}
        </div>
      </div>

      {/* Analog Clock */}
      <ClockFace selectedHour={hour} onSelectHour={(h) => onChange({ h })} />

      {/* Minute Quick Selectors */}
      <div className="flex gap-2 justify-between mt-6">
        {[0, 15, 30, 45].map(m => (
          <button
            key={m}
            type="button"
            onClick={() => onChange({ m })}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-all ${
              minute === m
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            :{m.toString().padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  );
};

export function TimeRangePickerModal({
  isOpen,
  onClose,
  onSave,
  initialStartTime = '10:00',
  initialEndTime = '18:00'
}: TimeRangePickerModalProps) {
  
  const [start, setStart] = useState(parseTime(initialStartTime));
  const [end, setEnd] = useState(parseTime(initialEndTime));

  // Reset internal state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStart(parseTime(initialStartTime));
      setEnd(parseTime(initialEndTime));
    }
  }, [isOpen, initialStartTime, initialEndTime]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(
      formatTime24(start.h, start.m, start.period),
      formatTime24(end.h, end.m, end.period)
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-black text-slate-800">Set Event Schedule Times</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Select the exact start and end times for the booking.</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col md:flex-row gap-6 bg-[#F8FAFC]">
          <TimePickerCard
            title="START TIME"
            hour={start.h}
            minute={start.m}
            period={start.period}
            onChange={(updates) => setStart({ ...start, ...updates })}
          />
          <TimePickerCard
            title="END TIME"
            hour={end.h}
            minute={end.m}
            period={end.period}
            onChange={(updates) => setEnd({ ...end, ...updates })}
          />
        </div>

        <div className="p-4 border-t border-[#E2E8F0] bg-white flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="px-6">Cancel</Button>
          <Button onClick={handleSave} className="px-8 bg-blue-600 hover:bg-blue-700">
            Confirm Times
          </Button>
        </div>
      </div>
    </div>
  );
}
