"use client";

import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Truck } from 'lucide-react';

interface VehicleTeamManagerProps {
  activeSubTab: 'upcoming' | 'past';
  
  // Upcoming state variables
  loadingStaff: string[];
  newStaffName: string;
  setNewStaffName: (val: string) => void;
  addStaffMember: () => void;
  removeStaffMember: (name: string) => void;
  loadingVehicleNo: string;
  setLoadingVehicleNo: (val: string) => void;
  loadingLoads: number;
  setLoadingLoads: (val: number) => void;
  loadingCharges: number;
  setLoadingCharges: (val: number) => void;

  // Past state variables
  reloadingStaff: string[];
  newReloadStaffName: string;
  setNewReloadStaffName: (val: string) => void;
  addReloadStaffMember: () => void;
  removeReloadStaffMember: (name: string) => void;
  reloadingVehicleNo: string;
  setReloadingVehicleNo: (val: string) => void;
  reloadingLoads: number;
  setReloadingLoads: (val: number) => void;
}

export function VehicleTeamManager({
  activeSubTab,
  loadingStaff,
  newStaffName,
  setNewStaffName,
  addStaffMember,
  removeStaffMember,
  loadingVehicleNo,
  setLoadingVehicleNo,
  loadingLoads,
  setLoadingLoads,
  loadingCharges,
  setLoadingCharges,
  reloadingStaff,
  newReloadStaffName,
  setNewReloadStaffName,
  addReloadStaffMember,
  removeReloadStaffMember,
  reloadingVehicleNo,
  setReloadingVehicleNo,
  reloadingLoads,
  setReloadingLoads
}: VehicleTeamManagerProps) {
  return (
    <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-md print:border-none print:shadow-none print:p-0">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2 mb-4">
        <Truck className="w-4 h-4 text-blue-500" /> 
        Vehicle & Team Details
      </h3>

      {activeSubTab === 'upcoming' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Loading Staff crew */}
          <div className="flex flex-col gap-2 print:hidden lg:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Staff crew</label>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Staff Name"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                className="glow-input flex-1 min-w-0 text-xs"
              />
              <Button
                onClick={addStaffMember}
                className="bg-blue-600 text-white font-bold text-xs rounded-md px-4 shrink-0 cursor-pointer"
              >
                Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2 max-h-[110px] overflow-y-auto p-1.5 border border-slate-100 rounded-md bg-slate-50/50">
              {loadingStaff.map((name) => (
                <span key={name} className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded-full shrink-0 shadow-xs">
                  {name}
                  <button onClick={() => removeStaffMember(name)} className="text-slate-400 hover:text-red-500 font-bold cursor-pointer text-[8px]">✕</button>
                </span>
              ))}
              {loadingStaff.length === 0 && (
                <span className="text-[10px] text-slate-400 italic font-semibold">No loading staff crew registered.</span>
              )}
            </div>
          </div>

          {/* Print layout Loading Crew */}
          <div className="hidden print:block text-xs border-r border-slate-200 pr-4">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Loading Staff Details</span>
            <p className="font-semibold text-slate-800 mt-1">{loadingStaff.join(', ') || 'No crew registered'}</p>
          </div>

          {/* Vehicle Details Section */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Loading Vehicle No</label>
            <input 
              type="text" 
              placeholder="KL-07-CD-1234"
              value={loadingVehicleNo}
              onChange={(e) => setLoadingVehicleNo(e.target.value)}
              className="glow-input text-xs font-mono font-bold uppercase text-blue-700"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Number of Loads</label>
            <input 
              type="number" 
              min="1"
              value={loadingLoads}
              onChange={(e) => setLoadingLoads(Number(e.target.value) || 1)}
              className="glow-input text-xs font-bold text-center"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Loading Charges (₹)</label>
            <input 
              type="number" 
              min="0"
              value={loadingCharges}
              onChange={(e) => setLoadingCharges(Number(e.target.value) || 0)}
              className="glow-input text-xs font-bold text-right text-emerald-700 bg-emerald-50/30"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Reloading Crew */}
          <div className="flex flex-col gap-2 print:hidden lg:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reloading Staff Details</label>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Staff Name"
                value={newReloadStaffName}
                onChange={(e) => setNewReloadStaffName(e.target.value)}
                className="glow-input flex-1 min-w-0 text-xs"
              />
              <Button
                onClick={addReloadStaffMember}
                className="bg-blue-600 text-white font-bold text-xs rounded-md px-4 shrink-0 cursor-pointer"
              >
                Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2 max-h-[110px] overflow-y-auto p-1.5 border border-slate-100 rounded-md bg-slate-50/50">
              {reloadingStaff.map((name) => (
                <span key={name} className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded-full shrink-0 shadow-xs">
                  {name}
                  <button onClick={() => removeReloadStaffMember(name)} className="text-slate-400 hover:text-red-500 font-bold cursor-pointer text-[8px]">✕</button>
                </span>
              ))}
              {reloadingStaff.length === 0 && (
                <span className="text-[10px] text-slate-400 italic font-semibold">No reloading crew registered.</span>
              )}
            </div>
          </div>

          {/* Print layout Reloading Crew */}
          <div className="hidden print:block text-xs border-r border-slate-200 pr-4">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Reloading Staff Details</span>
            <p className="font-semibold text-slate-800 mt-1">{reloadingStaff.join(', ') || 'No crew registered'}</p>
          </div>

          {/* Vehicle Details */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Reloading Vehicle No</label>
            <input 
              type="text" 
              placeholder="KL-07-CD-1234"
              value={reloadingVehicleNo}
              onChange={(e) => setReloadingVehicleNo(e.target.value)}
              className="glow-input text-xs font-mono font-bold uppercase text-blue-700"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Number of Loads</label>
            <input 
              type="number" 
              min="1"
              value={reloadingLoads}
              onChange={(e) => setReloadingLoads(Number(e.target.value) || 1)}
              className="glow-input text-xs font-bold text-center"
            />
          </div>
        </div>
      )}
    </Card>
  );
}
