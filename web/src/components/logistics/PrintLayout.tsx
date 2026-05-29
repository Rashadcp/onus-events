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
  const isOutward = activeSubTab === 'upcoming';
  const slipId = `ONUS-LOG-${(selectedEvent?._id || selectedEvent?.id || '000000').slice(-6).toUpperCase()}`;
  const currentDateStr = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <>
      {/* Dynamic Printing Style Injector to guarantee high-quality black-and-white printouts */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          }
          .print-border-bold {
            border: 2px solid #000000 !important;
          }
          .print-border-thin {
            border: 1px solid #1e293b !important;
          }
          .print-table th {
            border-bottom: 2px solid #000000 !important;
            border-right: 1px solid #cbd5e1 !important;
            background-color: #f1f5f9 !important;
            color: #000000 !important;
            font-weight: 800 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-table td {
            border-bottom: 1px solid #e2e8f0 !important;
            border-right: 1px solid #cbd5e1 !important;
            color: #000000 !important;
          }
          .print-table tr:last-child td {
            border-bottom: 2px solid #000000 !important;
          }
          .print-table th:last-child, .print-table td:last-child {
            border-right: none !important;
          }
          .print-badge {
            background-color: #000000 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />

      {/* Main Container visible strictly on Print */}
      <div className="hidden print:block text-slate-900 w-full text-xs">
        
        {/* Header Block: Classic Industrial Delivery Gatepass style */}
        <div className="border-2 border-black p-4 rounded-t-md bg-slate-50/50">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-black tracking-tight text-black uppercase">ONUS EVENTS</h1>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Creative Exhibitions & Elite Event Logistics</p>
              <span className="text-[8px] text-slate-400 mt-1 font-mono">System ID: {selectedEvent?._id || selectedEvent?.id}</span>
            </div>
            
            <div className="text-right flex flex-col items-end gap-1.5">
              <div className="px-3 py-1 text-[10px] font-extrabold tracking-wider print-badge rounded uppercase text-white bg-black">
                {isOutward ? 'OUTWARD LOADING GATE SLIP' : 'INWARD RETURN AUDIT SHEET'}
              </div>
              <div className="text-[9px] font-bold text-slate-500">
                SLIP NO: <span className="font-mono font-black text-black text-xs">{slipId}</span>
              </div>
              <div className="text-[8px] text-slate-400 font-mono">
                Printed: {currentDateStr}
              </div>
            </div>
          </div>

          {/* Master Info Grid: Essential Logistics details */}
          <div className="grid grid-cols-4 gap-x-4 gap-y-3 mt-4 pt-4 border-t border-slate-300 text-left">
            <div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Customer / Client</span>
              <span className="text-xs font-black text-black leading-tight block">{selectedEvent.customerName}</span>
            </div>
            <div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Event Venue Place</span>
              <span className="text-xs font-semibold text-slate-800 leading-tight block">{selectedEvent.place}</span>
            </div>
            <div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Setup Schedule Window</span>
              <span className="text-xs font-semibold text-slate-800 block">
                {new Date(selectedEvent.eventDate.start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} to {new Date(selectedEvent.eventDate.end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                <span className="text-[9px] block text-slate-500 font-mono">({selectedEvent.timeWindow?.start || '09:00 AM'} - {selectedEvent.timeWindow?.end || '06:00 PM'})</span>
              </span>
            </div>
            <div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Logistics Supervisor</span>
              <span className="text-xs font-black text-slate-900 block">{loadingStaff[0] || 'Unassigned Supervisor'}</span>
            </div>
          </div>
        </div>

        {/* Dispatch Truck & Loading Metadata Bar */}
        <div className="border-x-2 border-b-2 border-black p-3.5 bg-slate-50 grid grid-cols-4 gap-4 rounded-b-md">
          <div>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">TRUCK / VEHICLE NO</span>
            <span className="text-xs font-mono font-black text-blue-900 uppercase">
              {isOutward ? (loadingVehicleNo || '_________________') : (reloadingVehicleNo || '_________________')}
            </span>
          </div>
          <div>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">TOTAL DISPATCH LOADS</span>
            <span className="text-xs font-bold text-slate-800">
              {isOutward ? `${loadingLoads || 1} Load(s)` : `${reloadingLoads || 1} Load(s)`}
            </span>
          </div>
          <div>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">LOADING CHARGES</span>
            <span className="text-xs font-bold text-slate-800 font-mono">
              ₹ {loadingCharges?.toLocaleString('en-IN') || '0.00'}
            </span>
          </div>
          <div>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">DISPATCH CREW COUNT</span>
            <span className="text-xs font-bold text-slate-800">
              {loadingStaff.length || 0} Member(s)
            </span>
          </div>
        </div>

        {/* Section 1: Main Booked Items (Sales Order) Checklist */}
        {selectedEvent.items && selectedEvent.items.length > 0 && (
          <div className="mt-5">
            <div className="flex justify-between items-center pb-1.5 border-b border-black mb-2">
              <h3 className="text-[10px] font-black text-black uppercase tracking-wider">
                📦 {isOutward ? 'OUTWARD LOADING CHECKLIST (SALES ORDER ITEMS)' : 'INWARD RETURN RECEIPT CHECKLIST'}
              </h3>
              <span className="text-[8px] text-slate-400 font-mono">Verify actual quantities physically loaded</span>
            </div>
            
            <table className="w-full text-left text-xs border-2 border-black print-table border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[8px] font-extrabold uppercase text-slate-700 tracking-wider">
                  <th className="p-1.5 text-center w-8">S.No</th>
                  <th className="p-1.5 w-20">Item Code</th>
                  <th className="p-1.5">Item Description / Name</th>
                  {isOutward ? (
                    <>
                      <th className="p-1.5 text-center w-16">Ordered Qty</th>
                      <th className="p-1.5 text-center w-16">Loaded Qty</th>
                      <th className="p-1.5 text-center w-14">Shortage</th>
                    </>
                  ) : (
                    <>
                      <th className="p-1.5 text-center w-16">Dispatched</th>
                      <th className="p-1.5 text-center w-16">Returned</th>
                      <th className="p-1.5 text-center w-14">Missing</th>
                    </>
                  )}
                  <th className="p-1.5 w-32">Physical Store Remarks</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let serialNo = 0;
                  return selectedEvent.items.map((it: any) => {
                    const item = it.itemId;
                    if (!item) return null;
                    const id = item._id || item.id;
                    
                    const ordered = it.quantity;
                    const loaded = loadedQuantities[id] ?? ordered;
                    const short = Math.max(0, ordered - loaded);
                    
                    const returned = returnedQuantities[id] ?? loaded;
                    const missing = Math.max(0, loaded - returned);

                    // Filter: Only show loaded items
                    if (isOutward && loaded <= 0) return null;
                    if (!isOutward && returned <= 0) return null;

                    serialNo++;

                    return (
                      <tr key={id} className="text-[10px]">
                        <td className="p-1.5 text-center font-mono text-slate-500">{serialNo}</td>
                        <td className="p-1.5 font-mono font-black text-black">{item.itemCode}</td>
                        <td className="p-1.5 font-semibold text-slate-900">{item.name}</td>
                        {isOutward ? (
                          <>
                            <td className="p-1.5 text-center font-bold text-slate-400">{ordered}</td>
                            <td className="p-1.5 text-center font-black text-black bg-slate-50/50">{loaded}</td>
                            <td className={`p-1.5 text-center font-black ${short > 0 ? 'text-red-700 bg-red-50' : 'text-slate-300'}`}>
                              {short > 0 ? short : '-'}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-1.5 text-center font-bold text-slate-400">{loaded}</td>
                            <td className="p-1.5 text-center font-black text-black bg-slate-50/50">{returned}</td>
                            <td className={`p-1.5 text-center font-black ${missing > 0 ? 'text-red-700 bg-red-50' : 'text-slate-300'}`}>
                              {missing > 0 ? missing : '-'}
                            </td>
                          </>
                        )}
                        <td className="p-1.5 text-[9px] text-slate-400 italic">
                          {isOutward 
                            ? (short > 0 ? `Short by ${short} pcs` : '______________________') 
                            : (missing > 0 ? `Missing ${missing} pcs` : '______________________')}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 2: Additional Items Taken last-minute (Separated clearly) */}
        {additionalItems.length > 0 && (
          <div className="mt-5">
            <div className="flex justify-between items-center pb-1.5 border-b border-black mb-2">
              <h3 className="text-[10px] font-black text-black uppercase tracking-wider">
                ⚡ ADDITIONAL ITEMS DISPATCHED (GATE/SITE ADJUSTMENTS)
              </h3>
              <span className="text-[8px] text-slate-400 font-mono">Extra inventory authorized at loading gate</span>
            </div>
            
            <table className="w-full text-left text-xs border-2 border-black print-table border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[8px] font-extrabold uppercase text-slate-700 tracking-wider">
                  <th className="p-1.5 text-center w-8">S.No</th>
                  <th className="p-1.5 w-20">Item Code</th>
                  <th className="p-1.5">Item Description</th>
                  <th className="p-1.5 text-center w-16">Qty Taken</th>
                  <th className="p-1.5 w-44">Mandatory Reference / Reason</th>
                  <th className="p-1.5 w-32">Physical Store Remarks</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let serialNo = 0;
                  return additionalItems.map((item) => {
                    const details = getAdditionalItemDetails(item.itemCode);
                    if (item.quantity <= 0) return null;
                    serialNo++;
                    return (
                      <tr key={item.itemCode} className="text-[10px]">
                        <td className="p-1.5 text-center font-mono text-slate-500">{serialNo}</td>
                        <td className="p-1.5 font-mono font-black text-black">{item.itemCode}</td>
                        <td className="p-1.5 font-semibold text-slate-900">{details.name}</td>
                        <td className="p-1.5 text-center font-black text-black">{item.quantity}</td>
                        <td className="p-1.5 text-[9px] text-slate-600 font-medium italic">{item.referredBy || 'Emergency site requirement'}</td>
                        <td className="p-1.5 text-[9px] text-slate-400 italic">______________________</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </>
  );
}
