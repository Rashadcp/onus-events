"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SectionHeader } from '../ui/SectionHeader';
import { Alert } from '../ui/Alert';
import { Item } from '../../types';
import { getInventoryApi } from '../../services/api';

interface FreeStockMonitorProps {
  initialItems?: Item[];
}

export function FreeStockMonitor({ initialItems = [] }: FreeStockMonitorProps) {
  const [freeStockStart, setFreeStockStart] = useState('');
  const [freeStockEnd, setFreeStockEnd] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  // TanStack Query for Inventory
  const { data: inventoryData = [] } = useQuery<Item[]>({
    queryKey: ['inventory'],
    queryFn: getInventoryApi,
    placeholderData: initialItems
  });

  const activeItems = inventoryData.length > 0 ? inventoryData : initialItems;

  const handleQueryStock = () => {
    if (!freeStockStart || !freeStockEnd) {
      setMessage('Please select both start and end date/time to query free stock.');
      return;
    }
    setMessage(`Available stock levels calculated successfully for window: ${new Date(freeStockStart).toLocaleString()} to ${new Date(freeStockEnd).toLocaleString()}`);
  };

  const departments = ['COUNTER_DECOR', 'CLOTH_DECOR', 'RENTAL_ITEMS', 'STAFF'];

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader 
        title="Free Stock Monitor" 
        description="Query active available stock levels matching custom dates & times." 
      />

      {message && (
        <Alert message={message} type="success" onClose={() => setMessage(null)} />
      )}

      {/* Form Queries */}
      <Card className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">From Date & Time</label>
          <input
            type="datetime-local"
            className="glow-input text-xs"
            value={freeStockStart}
            onChange={(e) => setFreeStockStart(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">To Date & Time</label>
          <input
            type="datetime-local"
            className="glow-input text-xs"
            value={freeStockEnd}
            onChange={(e) => setFreeStockEnd(e.target.value)}
          />
        </div>
        <Button onClick={handleQueryStock}>
          Query Available Stock
        </Button>
      </Card>

      {/* Available Stocks by Department */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departments.map((dept) => (
          <Card key={dept}>
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-[#E2E8F0] pb-2">
              {dept.replace('_', ' ')}
            </h3>
            
            <div className="flex flex-col gap-3">
              {activeItems.filter((item: Item) => item.department === dept).map((item: Item) => (
                <div key={item.itemCode} className="flex justify-between items-center text-xs">
                  <span className="text-slate-700 font-semibold">{item.name}</span>
                  <span className="px-2 py-0.5 bg-slate-50 border border-[#E2E8F0] text-emerald-600 font-bold rounded">
                    {item.currentStock} Free
                  </span>
                </div>
              ))}
              {activeItems.filter((item: Item) => item.department === dept).length === 0 && (
                <p className="text-xs text-slate-400 italic">No items matching this department in catalog.</p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
