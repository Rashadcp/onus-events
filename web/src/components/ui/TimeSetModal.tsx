"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { ClockTimePicker } from './ClockTimePicker';
import { Button } from './Button';

interface TimeSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (startTime: string, endTime: string) => void;
  initialStartTime: string;
  initialEndTime: string;
}

export function TimeSetModal({
  isOpen,
  onClose,
  onSave,
  initialStartTime,
  initialEndTime
}: TimeSetModalProps) {
  const [start, setStart] = useState(initialStartTime || '10:00');
  const [end, setEnd] = useState(initialEndTime || '18:00');

  useEffect(() => {
    if (isOpen) {
      setStart(initialStartTime || '10:00');
      setEnd(initialEndTime || '18:00');
    }
  }, [isOpen, initialStartTime, initialEndTime]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Event Timings">
      <div className="flex flex-col gap-6 max-h-[80vh] overflow-y-auto pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border border-[#E2E8F0] bg-slate-50/50">
          <ClockTimePicker
            label="START TIME"
            value={start}
            onChange={setStart}
          />
          <ClockTimePicker
            label="END TIME"
            value={end}
            onChange={setEnd}
          />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
          <Button variant="ghost" onClick={onClose} className="px-6 border border-slate-200">Cancel</Button>
          <Button 
            onClick={() => { onSave(start, end); onClose(); }} 
            className="px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            Confirm Times
          </Button>
        </div>
      </div>
    </Modal>
  );
}
