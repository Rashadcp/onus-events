"use client";

import React from 'react';
import { SectionHeader } from '../ui/SectionHeader';
import { UserManagementTable } from './UserManagementTable';

interface LoadingStaffPanelProps {
  initialUsers?: any[];
}

export function LoadingStaffPanel({ initialUsers = [] }: LoadingStaffPanelProps) {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeader 
        title="Loading Staff Logistics" 
        description="Register and track logistics specialists managing outward/inward return schedules." 
      />

      <UserManagementTable 
        role="LOADING_STAFF" 
        roleDisplayName="Loading Staff" 
        initialUsers={initialUsers} 
      />
    </div>
  );
}
