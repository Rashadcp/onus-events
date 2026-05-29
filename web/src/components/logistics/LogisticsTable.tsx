"use client";

import React from 'react';
import { Card } from '../ui/Card';
import { Lock, Edit2, CheckSquare } from 'lucide-react';

interface LogisticsTableProps {
  activeSubTab: 'upcoming' | 'past';
  selectedEvent: any;
  isEditingMode: boolean;
  setIsEditingMode: (editing: boolean) => void;
  loadedQuantities: Record<string, number>;
  returnedQuantities: Record<string, number>;
  handleLoadedQtyChange: (itemId: string, maxVal: number, inputVal: number) => void;
  handleReturnedQtyChange: (itemId: string, maxVal: number, inputVal: number) => void;
  handleVerifyLoadingToggle: (itemId: string, orderedQty: number) => void;
  handleVerifyReloadingToggle: (itemId: string, totalTakenQty: number) => void;
}

export function LogisticsTable({
  activeSubTab,
  selectedEvent,
  isEditingMode,
  setIsEditingMode,
  loadedQuantities,
  returnedQuantities,
  handleLoadedQtyChange,
  handleReturnedQtyChange,
  handleVerifyLoadingToggle,
  handleVerifyReloadingToggle
}: LogisticsTableProps) {
  return (
    <Card className="p-6 bg-white border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          {activeSubTab === 'upcoming' ? '📦 Complete Item List (Sales Order)' : 'Site Return Item List'}
        </h3>

        {/* Edit Toggle controls */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setIsEditingMode(!isEditingMode)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              isEditingMode
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isEditingMode ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                Lock Quantities
              </>
            ) : (
              <>
                <Edit2 className="w-3.5 h-3.5" />
                Edit Option
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-400">
              <th className="p-3">Item Description</th>
              <th className="p-3">Item Code</th>
              {activeSubTab === 'upcoming' ? (
                <>
                  <th className="p-3 text-center">Ordered Qty</th>
                  <th className="p-3 text-center">Loaded Qty</th>
                  <th className="p-3 text-center">Short Qty</th>
                </>
              ) : (
                <>
                  <th className="p-3 text-center">Taken to Site</th>
                  <th className="p-3 text-center">Returned Qty</th>
                  <th className="p-3 text-center">Missing Qty</th>
                </>
              )}
              <th className="p-3 pr-4 text-right print:hidden">Verify Checkbox</th>
            </tr>
          </thead>
          <tbody>
            {selectedEvent.items && selectedEvent.items.map((it: any) => {
              const item = it.itemId;
              if (!item) return null;

              const id = item._id || item.id;
              
              // Quantities calculations
              const ordered = it.quantity;
              const loaded = loadedQuantities[id] ?? ordered;
              const short = Math.max(0, ordered - loaded);
              
              const returned = returnedQuantities[id] ?? loaded;
              const missing = Math.max(0, loaded - returned);

              const isFullyLoaded = loaded === ordered;
              const isFullyReturned = returned === loaded;

              return (
                <tr key={id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                  <td className="p-3 font-semibold text-slate-800">{item.name}</td>
                  <td className="p-3 font-mono text-blue-600 font-bold">{item.itemCode}</td>
                  
                  {activeSubTab === 'upcoming' ? (
                    <>
                      <td className="p-3 text-center font-bold text-slate-400 text-sm">{ordered}</td>
                      
                      {/* Loaded Qty column */}
                      <td className="p-3 text-center">
                        {isEditingMode ? (
                          <input
                            type="number"
                            min="0"
                            max={ordered}
                            value={loaded}
                            onChange={(e) => handleLoadedQtyChange(id, ordered, Number(e.target.value))}
                            className="glow-input text-center w-16 text-xs font-black py-1 px-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-150"
                          />
                        ) : (
                          <span className="font-semibold text-slate-800 text-sm">{loaded}</span>
                        )}
                      </td>
                      
                      {/* Short Qty column */}
                      <td className="p-3 text-center">
                        <span className={`font-semibold text-sm ${short > 0 ? 'text-red-650 bg-red-50 px-2 py-0.5 rounded border border-red-100' : 'text-slate-450'}`}>
                          {short}
                        </span>
                      </td>
                      
                      {/* Outward Verify action */}
                      <td className="p-3 pr-4 text-right print:hidden">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleVerifyLoadingToggle(id, ordered)}
                            className={`w-5.5 h-5.5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                              isFullyLoaded
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                                : 'bg-white border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                            }`}
                            aria-label={isFullyLoaded ? 'Unverify Item' : 'Verify Item'}
                          >
                            {isFullyLoaded && (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3 text-center font-bold text-slate-400 text-sm">{loaded}</td>
                      
                      {/* Returned Qty column */}
                      <td className="p-3 text-center">
                        {isEditingMode ? (
                          <input
                            type="number"
                            min="0"
                            max={loaded}
                            value={returned}
                            onChange={(e) => handleReturnedQtyChange(id, loaded, Number(e.target.value))}
                            className="glow-input text-center w-16 text-xs font-black py-1 px-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-150"
                          />
                        ) : (
                          <span className="font-semibold text-slate-800 text-sm">{returned}</span>
                        )}
                      </td>
                      
                      {/* Missing Qty column */}
                      <td className="p-3 text-center">
                        <span className={`font-semibold text-sm ${missing > 0 ? 'text-red-650 bg-red-50 px-2 py-0.5 rounded border border-red-100' : 'text-slate-455'}`}>
                          {missing}
                        </span>
                      </td>
                      
                      {/* Inward Verify action */}
                      <td className="p-3 pr-4 text-right print:hidden">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleVerifyReloadingToggle(id, loaded)}
                            className={`w-5.5 h-5.5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                              isFullyReturned
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                                : 'bg-white border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                            }`}
                            aria-label={isFullyReturned ? 'Unverify Item' : 'Verify Item'}
                          >
                            {isFullyReturned && (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
