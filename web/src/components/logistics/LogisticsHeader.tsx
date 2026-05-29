"use client";

import React from 'react';
import { Menu, LogOut } from 'lucide-react';

interface LogisticsHeaderProps {
  user: any;
  logout: () => void;
  onMenuClick: () => void;
}

export function LogisticsHeader({ user, logout, onMenuClick }: LogisticsHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 print:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            className="rounded-md border border-slate-350 p-2 lg:hidden hover:bg-slate-50" 
            onClick={onMenuClick} 
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Onus Events" className="h-10 w-auto" />
            <div>
              <h1 className="text-lg font-semibold">Logistics Console</h1>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium">{user?.fullName || 'Logistics Operator'}</p>
            <p className="text-xs text-slate-500">Staff ID: {user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 transition cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-slate-500" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
