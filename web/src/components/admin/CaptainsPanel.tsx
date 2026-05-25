"use client";

import React from 'react';
import { SectionHeader } from '../ui/SectionHeader';
import { UserManagementTable } from './UserManagementTable';

interface CaptainsPanelProps {
  initialUsers?: any[];
}

export function CaptainsPanel({ initialUsers = [] }: CaptainsPanelProps) {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeader 
        title="Site Captains & Incharges" 
        description="Assign team leads to manage structural operations at physical event venues."
      />

      <UserManagementTable 
        role="SITE_INCHARGE" 
        roleDisplayName="Site Captain" 
        initialUsers={initialUsers} 
      />
    </div>
  );
}
