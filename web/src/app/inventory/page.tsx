"use client";

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { getInventoryApi, checkItemAvailabilityApi } from '../../services/api';
import { AuthGuard } from '../../components/auth/AuthGuard';

// Icons
import { 
  Search, 
  Filter, 
  ShoppingBag, 
  Info, 
  Calendar, 
  Clock, 
  RefreshCw,
  AlertTriangle,
  ChevronLeft
} from 'lucide-react';

// UI Components
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

export default function FreeStockAvailabilityPage() {
  const router = useRouter();
  const { initializeSession, user } = useAuthStore();

  // Load session on mount
  useEffect(() => {
    initializeSession();
    document.title = "ERP | Free Stock Availability";
  }, [initializeSession]);

  // Search & Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  
  // Date Range Availability States
  const [queryStart, setQueryStart] = useState('');
  const [queryEnd, setQueryEnd] = useState('');
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, { available: number; reserved: number }>>({});
  const [isQuerying, setIsQuerying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Fetch Inventory items
  const { data: inventory = [], isLoading: isInventoryLoading, refetch } = useQuery({
    queryKey: ['inventory'],
    queryFn: getInventoryApi,
    placeholderData: []
  });

  // Handle Dynamic Stock Availability Queries over custom date intervals
  const handleQueryAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryStart || !queryEnd) {
      setMessage('Please select both Start and End Date/Time to calculate live availability.');
      return;
    }

    const startVal = new Date(queryStart);
    const endVal = new Date(queryEnd);
    if (isNaN(startVal.getTime()) || isNaN(endVal.getTime()) || endVal.getTime() < startVal.getTime()) {
      setMessage('Invalid dates selected. End Date must be after Start Date.');
      return;
    }

    setIsQuerying(true);
    setMessage(null);

    try {
      const map: Record<string, { available: number; reserved: number }> = {};
      const startIso = startVal.toISOString();
      const endIso = endVal.toISOString();

      await Promise.all(
        inventory.map(async (item: any) => {
          try {
            const res = await checkItemAvailabilityApi(item._id, startIso, endIso);
            map[item._id] = {
              available: res.data.availableQty,
              reserved: res.data.reservedAndDispatchedQty
            };
          } catch {
            map[item._id] = {
              available: item.currentStock,
              reserved: 0
            };
          }
        })
      );

      setAvailabilityMap(map);
      setMessage(`Real-time stock calculations parsed for interval: ${startVal.toLocaleString()} to ${endVal.toLocaleString()}`);
    } catch {
      setMessage('Failed to load real-time availability checks. Displaying static totals.');
    } finally {
      setIsQuerying(false);
    }
  };

  const handleClearQuery = () => {
    setQueryStart('');
    setQueryEnd('');
    setAvailabilityMap({});
    setMessage(null);
  };

  // Filter implementation
  const filteredInventory = inventory.filter((item: any) => {
    const searchMatch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const deptMatch = deptFilter === 'ALL' || item.department === deptFilter;
    const activeMatch = item.isActive !== false;

    return searchMatch && deptMatch && activeMatch;
  });

  const getStatusBadge = (item: any) => {
    // If status is DAMAGED
    if (item.status === 'DAMAGED') {
      return 'bg-red-50 text-red-700 border-red-200 uppercase';
    }
    // If stock level is low
    if (item.currentStock <= (item.minimumStock || 5)) {
      return 'bg-amber-50 text-amber-700 border-amber-200 uppercase';
    }
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 uppercase';
  };

  const getStatusText = (item: any) => {
    if (item.status === 'DAMAGED') return 'Damaged';
    if (item.currentStock <= (item.minimumStock || 5)) return 'Low Stock';
    return 'Available';
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans antialiased">
        
        {/* Top Header Panel */}
        <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-500 hover:text-slate-900"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
            <h1 className="text-xl font-bold tracking-tight text-slate-950">
              FREE STOCK MONITOR
            </h1>
          </div>

          <Button 
            onClick={() => refetch()}
            variant="ghost"
            className="text-xs py-1.5 px-3 border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Catalog
          </Button>
        </header>

        {/* Core Container */}
        <div className="max-w-7xl mx-auto px-6 mt-8 flex flex-col gap-6">
          
          {/* Notification Alert Banner */}
          {message && (
            <Alert 
              message={message} 
              type={message.includes('Calculated') || message.includes('parsed') ? 'success' : 'error'} 
              onClose={() => setMessage(null)} 
            />
          )}

          {/* Top Row: Date Range Selector for Live Availability Checks */}
          <Card className="bg-white border border-slate-200 shadow-sm p-6 rounded-xl">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Dynamic Schedule Overlap Filter</h2>
            </div>

            <form onSubmit={handleQueryAvailability} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Start Date & Time
                </label>
                <input 
                  type="datetime-local"
                  value={queryStart}
                  onChange={(e) => setQueryStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-700 font-semibold"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> End Date & Time
                </label>
                <input 
                  type="datetime-local"
                  value={queryEnd}
                  onChange={(e) => setQueryEnd(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-700 font-semibold"
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isQuerying}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider"
                >
                  {isQuerying ? 'Calculating...' : 'Query Availability'}
                </Button>
                
                {(queryStart || queryEnd) && (
                  <Button 
                    type="button" 
                    onClick={handleClearQuery}
                    variant="ghost"
                    className="py-2.5 border border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider px-4"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </form>
          </Card>

          {/* Controls: Search and Department Selector */}
          <Card className="bg-white border border-slate-200 shadow-sm p-6 rounded-xl flex flex-col md:flex-row md:items-center gap-4 justify-between">
            
            {/* Live Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search inventory by Item Name or Code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-800 placeholder:text-slate-400 font-medium"
              />
            </div>

            {/* Department Filter Select */}
            <div className="w-full md:w-64 shrink-0 flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-700 font-semibold"
              >
                <option value="ALL">All Departments</option>
                <option value="COUNTER_DECOR">Counter Decor</option>
                <option value="CLOTH_DECOR">Cloth Decor</option>
                <option value="RENTAL_ITEMS">Rental Items</option>
                <option value="EXPENSE_CHARGES">Expense Charges</option>
                <option value="STAFF">Staff Allocations</option>
                <option value="OUTSIDE_RENTAL">Outside Rental</option>
              </select>
            </div>

          </Card>

          {/* Simple Inventory Table */}
          <Card className="bg-white border border-slate-200 shadow-sm p-0 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">Inventory Items ({filteredInventory.length})</h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                ERP Core warehouse stock levels
              </span>
            </div>

            {isInventoryLoading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-xs text-slate-400">Loading catalog logs...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                      <th className="p-4 pl-6">Item Name</th>
                      <th className="p-4">Department</th>
                      <th className="p-4 text-center">Available Stock</th>
                      <th className="p-4 text-center">Reserved Stock</th>
                      <th className="p-4 text-center">Damaged Stock</th>
                      <th className="p-4 pr-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item: any) => {
                      
                      // Resolve available and reserved quantities based on date query or fallback
                      let availableVal = item.currentStock;
                      let reservedVal = item.status === 'RESERVED' ? item.currentStock : 0;
                      const damagedVal = item.status === 'DAMAGED' ? item.currentStock : 0;

                      if (availabilityMap[item._id]) {
                        availableVal = availabilityMap[item._id].available;
                        reservedVal = availabilityMap[item._id].reserved;
                      } else if (item.status === 'DAMAGED') {
                        availableVal = 0;
                      }

                      return (
                        <tr key={item._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                          
                          {/* Item Name */}
                          <td className="p-4 pl-6">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                              <span className="text-[9px] font-mono text-slate-400 font-bold">CODE: {item.itemCode}</span>
                            </div>
                          </td>

                          {/* Department */}
                          <td className="p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            {item.department?.replace('_', ' ')}
                          </td>

                          {/* Available Quantity */}
                          <td className="p-4 text-center font-bold text-sm">
                            <span className={availableVal === 0 ? 'text-red-500 font-extrabold animate-pulse' : 'text-emerald-600'}>
                              {availableVal}
                            </span>
                          </td>

                          {/* Reserved Quantity */}
                          <td className="p-4 text-center font-bold text-sm text-slate-700">
                            {reservedVal}
                          </td>

                          {/* Damaged Quantity */}
                          <td className="p-4 text-center font-bold text-sm">
                            <span className={damagedVal > 0 ? 'text-red-600' : 'text-slate-400 font-normal'}>
                              {damagedVal}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="p-4 pr-6 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${getStatusBadge(item)}`}>
                              {getStatusText(item)}
                            </span>
                          </td>

                        </tr>
                      );
                    })}

                    {filteredInventory.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-20 text-center text-slate-400 italic text-sm">
                          No items matching search criteria found in catalog.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

        </div>

      </main>
    </AuthGuard>
  );
}
