"use client";

import React, { useState, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { PlusCircle, FileSpreadsheet, Plus, Trash2 } from 'lucide-react';

interface AdditionalItemsManagerProps {
  catalog: any[];
  additionalItems: Array<{ itemCode: string; quantity: number; referredBy: string }>;
  addCode: string;
  setAddCode: (code: string) => void;
  addQty: string;
  setAddQty: (qty: string) => void;
  addReferral: string;
  setAddReferral: (reason: string) => void;
  addAdditionalItem: () => void;
  removeAdditionalItem: (code: string) => void;
  getAdditionalItemDetails: (itemCode: string) => { _id: string; name: string; itemCode: string };
}

export function AdditionalItemsManager({
  catalog,
  additionalItems,
  addCode,
  setAddCode,
  addQty,
  setAddQty,
  addReferral,
  setAddReferral,
  addAdditionalItem,
  removeAdditionalItem,
  getAdditionalItemDetails
}: AdditionalItemsManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredCatalog = useMemo(() => {
    if (!searchTerm.trim()) return catalog;
    const term = searchTerm.toLowerCase();
    return catalog.filter((c: any) => 
      (c.itemCode || '').toLowerCase().includes(term) || 
      (c.name || '').toLowerCase().includes(term)
    );
  }, [catalog, searchTerm]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
      
      {/* Add Form */}
      <Card className="md:col-span-1 p-6 bg-white border border-slate-200 shadow-sm rounded-md flex flex-col gap-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
          <PlusCircle className="w-4 h-4 text-blue-600" /> Additional items
        </h4>
        
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-2">
            <div className="relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Search Product</label>
              <input
                type="text"
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Short delay to allow recommendation click events to register
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                className="glow-input w-full text-xs font-semibold"
              />

              {/* Suggestions floating dropdown */}
              {showSuggestions && searchTerm.trim() && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {filteredCatalog.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 italic font-semibold">No matching items found</div>
                  ) : (
                    filteredCatalog.slice(0, 8).map((c: any) => (
                      <button
                        key={c._id || c.id}
                        type="button"
                        onClick={() => {
                          setAddCode(c.itemCode);
                          setSearchTerm(`${c.itemCode} - ${c.name}`);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2.5 text-xs hover:bg-blue-50 hover:text-blue-700 transition flex flex-col gap-0.5 cursor-pointer font-medium"
                      >
                        <span className="font-bold text-slate-800">{c.name}</span>
                        <span className="font-mono text-[10px] text-blue-600 font-bold">{c.itemCode}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

           
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Quantity</label>
            <input 
              type="number" 
              min="1"
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
              className="glow-input w-full text-xs font-semibold"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-1">
              Reference / Reason *
            </label>
            <input 
              type="text" 
              placeholder="Why are extra items taken?"
              value={addReferral}
              onChange={(e) => setAddReferral(e.target.value)}
              className="glow-input w-full text-xs placeholder-slate-350 focus:border-red-500"
            />
          </div>

          <Button
            type="button"
            onClick={addAdditionalItem}
            className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white py-2.5 font-semibold flex items-center justify-center gap-1 rounded-md shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Additional Item
          </Button>
        </div>
      </Card>

      {/* Display List */}
      <Card className="md:col-span-2 p-6 bg-white border border-slate-200 shadow-sm rounded-md flex flex-col gap-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Additional Items Taken to Site
        </h4>

        <div className="overflow-y-auto max-h-[290px] divide-y divide-slate-100 pr-1">
          {additionalItems.length === 0 ? (
            <div className="text-center py-16 text-slate-400 italic text-xs font-semibold">
              No additional items added to this load yet.
            </div>
          ) : (
            additionalItems.map((item) => {
              const details = getAdditionalItemDetails(item.itemCode);
              return (
                <div key={item.itemCode} className="flex justify-between items-start py-3 first:pt-0 last:pb-0 hover:bg-slate-50/50 px-2 rounded transition">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-sm text-slate-800">{details.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                        {item.itemCode}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Qty: <strong className="text-slate-700">{item.quantity}</strong></span>
                    </div>
                    <p className="text-[10px] text-amber-700 font-bold mt-1 bg-amber-50 border border-amber-100 px-2 py-1 rounded w-fit">
                      Reference / Reason: {item.referredBy}
                    </p>
                  </div>
                  <button 
                    onClick={() => removeAdditionalItem(item.itemCode)}
                    className="text-slate-400 hover:text-red-650 hover:bg-red-50 p-1.5 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
