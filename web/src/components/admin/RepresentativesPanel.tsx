"use client";

import React from 'react';
import { SectionHeader } from '../ui/SectionHeader';
import { UserManagementTable } from './UserManagementTable';

interface RepresentativesPanelProps {
  initialUsers?: any[];
}

export function RepresentativesPanel({ initialUsers = [] }: RepresentativesPanelProps) {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeader 
        title="Sales Representatives Panel" 
        description="Manage client sales reps and track monthly billing incentive metrics." 
      />

      <UserManagementTable 
        role="REPRESENTATIVE" 
        roleDisplayName="Sales Representative" 
        initialUsers={initialUsers}
        renderExtraInfo={(user) => (
          <div className="text-left sm:text-right">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Monthly Billing</p>
            <p className="text-lg font-bold text-emerald-600">₹{(user.monthlyBilling || 0).toLocaleString()}</p>
            <p className="text-[10px] text-blue-600 font-semibold font-mono">
              Est. Incentive: ₹{((user.monthlyBilling || 0) * 0.05).toLocaleString()} (5%)
            </p>
          </div>
        )}
      />
    </div>
  );
}
