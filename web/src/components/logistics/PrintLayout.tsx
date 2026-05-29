"use client";

import React from 'react';

interface PrintLayoutProps {
  selectedEvent: any;
  activeSubTab: 'upcoming' | 'past';
  additionalItems: any[];
  getAdditionalItemDetails: (code: string) => { _id: string; name: string; itemCode: string };
  loadingVehicleNo: string;
  loadingLoads: number;
  reloadingVehicleNo: string;
  reloadingLoads: number;
  loadingCharges: number;
  loadingStaff: string[];
  loadedQuantities: Record<string, number>;
  returnedQuantities: Record<string, number>;
}

export function PrintLayout({
  selectedEvent,
  activeSubTab,
  additionalItems,
  getAdditionalItemDetails,
  loadingVehicleNo,
  loadingLoads,
  reloadingVehicleNo,
  reloadingLoads,
  loadingCharges,
  loadingStaff,
  loadedQuantities,
  returnedQuantities
}: PrintLayoutProps) {
  return (
    <>
      {/* Strictly visible in browser print mode */}
      <div className="hidden print:block text-center border-b border-slate-300 pb-6 mb-6">
        <div className="flex justify-between items-center">
          <img src="/logo.png" alt="Onus Events" className="h-10" />
          <div className="text-right">
            <h1 className="text-md font-bold text-slate-900">ONUS EVENTS LOGISTICS LOG</h1>
            <p className="text-[10px] font-bold text-blue-600 tracking-widest mt-0.5">INTERNAL WAREHOUSE STORE COPY ONLY</p>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mt-6 text-left border border-slate-200 rounded-md p-4 bg-slate-50/50">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Client Name</span>
            <span className="text-xs font-medium text-slate-800">{selectedEvent.customerName}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Setup Dates</span>
            <span className="text-xs font-medium text-slate-800">
              {new Date(selectedEvent.eventDate.start).toLocaleDateString('en-IN')} to {new Date(selectedEvent.eventDate.end).toLocaleDateString('en-IN')}
            </span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Venue Place</span>
            <span className="text-xs font-medium text-slate-800">{selectedEvent.place}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Setup Window</span>
            <span className="text-xs font-medium text-slate-800">{selectedEvent.timeWindow?.start} - {selectedEvent.timeWindow?.end}</span>
          </div>
        </div>
      </div>

      {/* Printable Store Copy Main Items display */}
      {selectedEvent.items && selectedEvent.items.length > 0 && (
        <div className="hidden print:block border border-slate-300 rounded p-4 mt-6 bg-slate-50/20">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest border-b border-slate-350 pb-2 mb-3">
            📦 COMPLETE ITEM LIST (SALES ORDER)
          </h3>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-350 font-bold text-slate-500 uppercase tracking-wider text-[9px]">
                <th className="py-2">Item Code</th>
                <th className="py-2">Item Description</th>
                {activeSubTab === 'upcoming' ? (
                  <>
                    <th className="py-2 text-center">Ordered Qty</th>
                    <th className="py-2 text-center">Loaded Qty</th>
                    <th className="py-2 text-center">Short Qty</th>
                  </>
                ) : (
                  <>
                    <th className="py-2 text-center">Taken to Site</th>
                    <th className="py-2 text-center">Returned Qty</th>
                    <th className="py-2 text-center">Missing Qty</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {selectedEvent.items.map((it: any) => {
                const item = it.itemId;
                if (!item) return null;
                const id = item._id || item.id;
                
                const ordered = it.quantity;
                const loaded = loadedQuantities[id] ?? ordered;
                const short = Math.max(0, ordered - loaded);
                
                const returned = returnedQuantities[id] ?? loaded;
                const missing = Math.max(0, loaded - returned);

                return (
                  <tr key={id} className="border-b border-slate-100 py-2">
                    <td className="py-2 font-mono font-bold text-blue-800">{item.itemCode}</td>
                    <td className="py-2 font-semibold text-slate-800">{item.name}</td>
                    {activeSubTab === 'upcoming' ? (
                      <>
                        <td className="py-2 text-center font-bold text-slate-400">{ordered}</td>
                        <td className="py-2 text-center font-bold text-slate-800">{loaded}</td>
                        <td className="py-2 text-center font-bold text-red-600">{short > 0 ? short : '-'}</td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 text-center font-bold text-slate-400">{loaded}</td>
                        <td className="py-2 text-center font-bold text-slate-800">{returned}</td>
                        <td className="py-2 text-center font-bold text-red-650">{missing > 0 ? missing : '-'}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Printable Store Copy Additional Items display */}
      {additionalItems.length > 0 && (
        <div className="hidden print:block border border-slate-300 rounded p-4 mt-6 bg-slate-50/20">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest border-b border-slate-350 pb-2 mb-3">
            ⚡ ADDITIONAL ITEMS TAKEN TO SITE
          </h3>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-350 font-bold text-slate-500 uppercase tracking-wider text-[9px]">
                <th className="py-2">Item Code</th>
                <th className="py-2">Item Description</th>
                <th className="py-2 text-center">Qty Taken</th>
                <th className="py-2 text-right">Mandatory Reference / Reason</th>
              </tr>
            </thead>
            <tbody>
              {additionalItems.map((item) => {
                const details = getAdditionalItemDetails(item.itemCode);
                return (
                  <tr key={item.itemCode} className="border-b border-slate-100 py-2">
                    <td className="py-2 font-mono font-bold text-blue-800">{item.itemCode}</td>
                    <td className="py-2 font-semibold text-slate-800">{details.name}</td>
                    <td className="py-2 text-center font-bold text-slate-800">{item.quantity}</td>
                    <td className="py-2 text-right text-[10px] text-slate-500 italic">{item.referredBy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Print layout Crew charges & Vehicle metadata display */}
      <div className="hidden print:grid grid-cols-3 gap-6 border border-slate-350 rounded p-4 mt-6 text-[10px]">
        <div>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Vehicle Number Details</span>
          <p className="font-bold text-slate-800 mt-1 uppercase">
            {activeSubTab === 'upcoming' 
              ? `Outward: ${loadingVehicleNo || 'N/A'} (${loadingLoads} Loads)` 
              : `Inward: ${reloadingVehicleNo || 'N/A'} (${reloadingLoads} Loads)`}
          </p>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Loading Charges</span>
          <p className="font-bold text-slate-800 mt-1">₹ {loadingCharges?.toLocaleString() || '0'}</p>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Logistics Supervisor sign</span>
          <div className="w-24 h-4 border-b border-slate-300 mt-1" />
        </div>
      </div>

      {/* Store Copy Footer Signatures strictly for Warehouse print */}
      <div className="hidden print:grid grid-cols-2 mt-16 pt-8 text-[9px] border-t border-dashed border-slate-300">
        <div className="flex flex-col justify-end gap-1">
          <p className="font-bold uppercase tracking-wider text-slate-500">Warehouse Dispatcher Crew Sign-off</p>
          <div className="w-48 h-8 border-b border-slate-300 mt-4" />
          <p className="italic text-slate-400 mt-1.5">Loading Lead: {loadingStaff[0] || 'Unassigned head'}</p>
        </div>
        <div className="flex flex-col items-end justify-end gap-1">
          <p className="font-bold uppercase tracking-wider text-slate-500">Store Master Verification Seal</p>
          <div className="w-32 h-14 border border-blue-650 bg-slate-50 rounded flex items-center justify-center font-mono text-[10px] text-blue-750 border-dashed mt-4 font-bold uppercase tracking-wider">
            LOGISTICS STORES DISPATCHED
          </div>
        </div>
      </div>
    </>
  );
}
