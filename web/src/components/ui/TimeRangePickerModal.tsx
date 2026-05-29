"use client";

import React, { useState, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import { Button } from './Button';

interface TimeRangePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (startTime: string, endTime: string) => void;
  initialStartTime?: string; // "HH:MM" 24h
  initialEndTime?: string;   // "HH:MM" 24h
}

type TimePeriod = 'AM' | 'PM';

const parseTime = (timeStr: string): { h: number; m: number; period: TimePeriod } => {
  if (!timeStr) return { h: 10, m: 0, period: 'AM' as const };
  const [hh, mm] = timeStr.split(':').map(Number);
  const period: TimePeriod = hh >= 12 ? 'PM' : 'AM';
  let h = hh % 12;
  if (h === 0) h = 12;
  return { h, m: mm || 0, period };
};

const formatTime24 = (h: number, m: number, period: 'AM' | 'PM') => {
  let hh = h;
  if (period === 'PM' && hh !== 12) hh += 12;
  if (period === 'AM' && hh === 12) hh = 0;
  return `${hh.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const PRESETS = [
  { label: 'Standard (9 AM - 6 PM)', start: '09:00', end: '18:00' },
  { label: 'Morning (8 AM - 1 PM)', start: '08:00', end: '13:00' },
  { label: 'Afternoon (1 PM - 5 PM)', start: '13:00', end: '17:00' },
  { label: 'Evening (6 PM - 11 PM)', start: '18:00', end: '23:00' },
  { label: 'Full Day (10 AM - 10 PM)', start: '10:00', end: '22:00' },
];

const NumberSpinner = ({
  value,
  min,
  max,
  label,
  onChange,
  options,
  step = 1
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (val: number) => void;
  options: number[];
  step?: number;
}) => {
  const increment = () => {
    let next = value + step;
    if (next > max) next = min;
    if (next < min) next = min;
    onChange(next);
  };
  const decrement = () => {
    let prev = value - step;
    if (prev < min) prev = max;
    if (prev > max) prev = max;
    onChange(prev);
  };

  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">{label}</span>
      <div className="flex flex-col items-center bg-slate-50 border border-slate-200 rounded-2xl p-1.5 shadow-xs relative">
        <button
          type="button"
          onClick={increment}
          className="w-12 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        
        <div className="relative my-1 flex items-center justify-center">
          <select
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-14 text-center text-2xl font-black text-slate-800 bg-transparent border-0 outline-none cursor-pointer appearance-none focus:ring-0 select-none py-1 hover:text-blue-600 transition"
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt.toString().padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={decrement}
          className="w-12 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
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
  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5);
  if (!minuteOptions.includes(minute)) {
    minuteOptions.push(minute);
    minuteOptions.sort((a, b) => a - b);
  }

  return (
    <div className="flex-1 bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
        <h3 className="text-sm font-extrabold text-slate-800 tracking-wide flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          {title}
        </h3>
        <div className="w-8 h-8 rounded-xl bg-blue-50/50 flex items-center justify-center text-blue-600 border border-blue-100/50">
          <Clock className="w-4 h-4" />
        </div>
      </div>

      {/* Handlers row */}
      <div className="flex items-center justify-center gap-3 w-full">
        {/* Hour Spinner */}
        <NumberSpinner
          value={hour}
          min={1}
          max={12}
          label="Hour"
          options={hourOptions}
          onChange={(h) => onChange({ h })}
        />

        {/* Separator */}
        <div className="text-3xl font-black text-slate-300 self-center mt-4">:</div>

        {/* Minute Spinner */}
        <NumberSpinner
          value={minute}
          min={0}
          max={55}
          label="Minute"
          options={minuteOptions}
          step={5}
          onChange={(m) => onChange({ m })}
        />

        {/* AM/PM Switcher */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Period</span>
          <div className="flex flex-col border border-slate-200 bg-slate-50 rounded-2xl p-1.5 shadow-xs w-16 justify-center items-center h-[126px]">
            <button
              type="button"
              onClick={() => onChange({ p: 'AM' })}
              className={`w-full flex-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                period === 'AM'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              AM
            </button>
            <div className="h-[1px] w-6 bg-slate-200 my-1" />
            <button
              type="button"
              onClick={() => onChange({ p: 'PM' })}
              className={`w-full flex-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                period === 'PM'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              PM
            </button>
          </div>
        </div>
      </div>

      {/* Selected Time Badge */}
      <div className="mt-6 w-full text-center py-2 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-extrabold text-sm tracking-wide">
        {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')} {period}
      </div>

      {/* Quick Selectors */}
      <div className="flex gap-2 justify-between mt-4 w-full">
        {[0, 15, 30, 45].map(m => (
          <button
            key={m}
            type="button"
            onClick={() => onChange({ m })}
            className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
              minute === m
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
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

  const applyPreset = (presetStart: string, presetEnd: string) => {
    setStart(parseTime(presetStart));
    setEnd(parseTime(presetEnd));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Set Event Schedule Times
            </h2>
            <p className="text-xs text-slate-500 font-bold mt-0.5">Select the exact start and end times for the booking.</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Quick Presets */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
            ⚡ Quick Event Presets
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const isSelected = 
                formatTime24(start.h, start.m, start.period) === preset.start &&
                formatTime24(end.h, end.m, end.period) === preset.end;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.start, preset.end)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Picker Cards Container */}
        <div className="p-6 flex flex-col sm:flex-row gap-6 bg-slate-50/50">
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

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="px-6 font-bold">Cancel</Button>
          <Button onClick={handleSave} className="px-8 bg-blue-600 hover:bg-blue-700 font-bold">
            Confirm Times
          </Button>
        </div>
      </div>
    </div>
  );
}
