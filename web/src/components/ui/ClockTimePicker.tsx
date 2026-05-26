import React, { useState } from 'react';
import { Clock } from 'lucide-react';

interface ClockTimePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const hours = Array.from({ length: 12 }, (_, index) => index + 1);
const minutes = Array.from({ length: 12 }, (_, index) => index * 5);

function formatDisplayTime(value: string) {
  if (!value) return '--:--';
  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, '0')}:${minuteText || '00'} ${suffix}`;
}

export function ClockTimePicker({ label, value, onChange }: ClockTimePickerProps) {
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const [hourText = '10', minuteText = '00'] = value.split(':');
  const hour24 = Number(hourText);
  const selectedMinute = Number(minuteText);
  const selectedPeriod = hour24 >= 12 ? 'PM' : 'AM';
  const selectedHour12 = hour24 % 12 || 12;

  const commitTime = (hour12: number, minute: number, period: 'AM' | 'PM') => {
    const normalizedHour = period === 'PM'
      ? (hour12 === 12 ? 12 : hour12 + 12)
      : (hour12 === 12 ? 0 : hour12);

    onChange(`${String(normalizedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  };

  const selectHour = (hour: number) => {
    commitTime(hour, selectedMinute, selectedPeriod);
    setMode('minute');
  };

  const selectMinute = (minute: number) => {
    commitTime(selectedHour12, minute, selectedPeriod);
  };

  const selectPeriod = (period: 'AM' | 'PM') => {
    commitTime(selectedHour12, selectedMinute, period);
  };

  const clockItems = mode === 'hour' ? hours : minutes;
  const activeValue = mode === 'hour' ? selectedHour12 : selectedMinute;

  const itemPosition = (item: number) => {
    const clockValue = mode === 'hour' ? item % 12 : item / 5;
    const angle = (clockValue * 30 - 90) * (Math.PI / 180);
    const radius = 74;
    return {
      left: `calc(50% + ${Math.cos(angle) * radius}px)`,
      top: `calc(50% + ${Math.sin(angle) * radius}px)`
    };
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</label>
        <div className="h-8 w-8 rounded-full border border-blue-100 bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setMode('hour')}
              className={`rounded-md px-3 py-2 text-lg font-black ${mode === 'hour' ? 'bg-blue-600 text-white' : 'text-slate-900'}`}
            >
              {String(selectedHour12).padStart(2, '0')}
            </button>
            <button
              type="button"
              onClick={() => setMode('minute')}
              className={`rounded-md px-3 py-2 text-lg font-black ${mode === 'minute' ? 'bg-blue-600 text-white' : 'text-slate-900'}`}
            >
              {String(selectedMinute).padStart(2, '0')}
            </button>
          </div>

          <div className="grid grid-rows-2 gap-1">
            {(['AM', 'PM'] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => selectPeriod(period)}
                className={`w-12 rounded-md border text-xs font-black ${
                  selectedPeriod === period
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {formatDisplayTime(value)}
        </p>
      </div>

      <div className="relative mx-auto h-48 w-48 rounded-full border border-slate-200 bg-white shadow-inner">
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600" />

        {clockItems.map((item) => {
          const isActive = item === activeValue;
          const position = itemPosition(item);

          return (
            <button
              key={item}
              type="button"
              onClick={() => mode === 'hour' ? selectHour(item) : selectMinute(item)}
              style={position}
              className={`absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full text-xs font-black ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              {mode === 'hour' ? item : String(item).padStart(2, '0')}
            </button>
          );
        })}

        <div
          className="absolute left-1/2 top-1/2 h-0.5 origin-left -translate-y-1/2 rounded-full bg-blue-600/70"
          style={{
            width: 58,
            transform: `rotate(${((mode === 'hour' ? selectedHour12 : selectedMinute / 5) * 30) - 90}deg)`
          }}
        />
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {['00', '15', '30', '45'].map((minute) => (
          <button
            key={minute}
            type="button"
            onClick={() => selectMinute(Number(minute))}
            className={`rounded-md border px-2 py-1.5 text-[10px] font-bold ${
              selectedMinute === Number(minute)
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            :{minute}
          </button>
        ))}
      </div>
    </div>
  );
}
