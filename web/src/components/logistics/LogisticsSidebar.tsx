"use client";

import React from 'react';
import { Truck, History, X } from 'lucide-react';

interface LogisticsSidebarProps {
  activeSubTab: 'upcoming' | 'past';
  setActiveSubTab: (tab: 'upcoming' | 'past') => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function LogisticsSidebar({
  activeSubTab,
  setActiveSubTab,
  mobileOpen,
  setMobileOpen
}: LogisticsSidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <button 
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden cursor-pointer" 
          onClick={() => setMobileOpen(false)} 
          aria-label="Close menu" 
        />
      )}

      {/* Left Sidebar Menu */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white p-4 print:hidden lg:sticky lg:top-[65px] lg:block lg:h-[calc(100vh-65px)] lg:overflow-y-auto ${mobileOpen ? 'block' : 'hidden'}`}>
        
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <span className="font-semibold text-slate-855">Menus</span>
          <button 
            onClick={() => setMobileOpen(false)} 
            className="rounded-md p-2 hover:bg-slate-100 cursor-pointer border border-slate-100" 
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="space-y-1 pb-4">
          <button
            onClick={() => {
              setActiveSubTab('upcoming');
              setMobileOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition cursor-pointer ${
              activeSubTab === 'upcoming' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Truck className="h-4 w-4" />
            Upcoming (Next 2 Days)
          </button>
          <button
            onClick={() => {
              setActiveSubTab('past');
              setMobileOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition cursor-pointer ${
              activeSubTab === 'past' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <History className="h-4 w-4" />
            Past Events
          </button>
        </div>
      </aside>
    </>
  );
}

