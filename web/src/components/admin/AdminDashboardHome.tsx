"use client";

import React from 'react';
import { Card } from '../ui/Card';
import { SectionHeader } from '../ui/SectionHeader';

interface AdminDashboardHomeProps {
  activeItems: any[];
  activeEvents: any[];
  activeUsers: any[];
}

export function AdminDashboardHome({ 
  activeItems = [], 
  activeEvents = [], 
  activeUsers = [] 
}: AdminDashboardHomeProps) {
  
  const upcomingEvents = activeEvents.filter((e: any) => !e.isDeleted);
  const reps = activeUsers.filter((u: any) => u.role === 'REPRESENTATIVE');
  const captains = activeUsers.filter((u: any) => u.role === 'SITE_INCHARGE');

  const stats = [
    { 
      title: 'Catalog Items', 
      value: activeItems.length, 
      label: 'Active items in database',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-100 text-blue-600',
      svg: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
      )
    },
    { 
      title: 'Active Bookings', 
      value: upcomingEvents.length, 
      label: 'Scheduled events this week',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 border-teal-100 text-teal-600',
      svg: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      )
    },
    { 
      title: 'Representatives', 
      value: reps.length, 
      label: 'Authorized sales users',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 border-indigo-100 text-indigo-600',
      svg: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
      )
    },
    { 
      title: 'Site Captains', 
      value: captains.length, 
      label: 'Allotted site incharges',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-100 text-emerald-600',
      svg: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader 
        title="Dashboard Overview" 
        description="Real-time operational statistics & weekly setup schedules." 
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((card, idx) => (
          <div key={idx} className="glass-panel p-5 flex flex-col gap-3 relative overflow-hidden glow-card hover-scale">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.title}</span>
              <div className={`p-1.5 rounded-lg border ${card.bgColor}`}>
                {card.svg}
              </div>
            </div>
            <div>
              <p className={`text-3xl font-black ${card.color}`}>{card.value}</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Schedule */}
      <div className="glass-panel p-6 bg-white">
        <h3 className="text-base font-black text-[#0F172A] mb-6 flex items-center gap-2">
          <span>🗓️</span> Scheduled Events This Week
        </h3>
        
        <div className="flex flex-col gap-4">
          {upcomingEvents.map((event: any) => (
            <div key={event._id} className="p-5 rounded-xl border border-[#E2E8F0] bg-white flex flex-col lg:flex-row justify-between lg:items-center hover-scale transition shadow-sm gap-4">
              <div className="flex flex-col gap-1">
                <h4 className="font-extrabold text-[#0F172A] text-base">{event.customerName}</h4>
                <p className="text-xs text-slate-500">📍 {event.place} • 🏷️ {event.program}</p>
                <p className="text-[11px] text-blue-600 font-bold mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  🕒 {new Date(event.eventDate.start).toDateString()} at {event.timeWindow.start} - {event.timeWindow.end}
                </p>
              </div>
              
              <div className="flex gap-2 flex-wrap items-center">
                {event.confirmations && Object.entries(event.confirmations).map(([dept, conf]: any) => (
                  <span 
                    key={dept} 
                    className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${ conf.confirmed ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-extrabold' : 'bg-slate-50 border-slate-200 text-slate-400' }`}
                  >
                    <span className={`w-1 h-1 rounded-full ${conf.confirmed ? 'bg-emerald-500 ' : 'bg-slate-300'}`} />
                    {dept.replace('_ITEMS', '').replace('_CHARGES', '')}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {upcomingEvents.length === 0 && (
            <p className="text-sm text-slate-400 italic text-center py-6">No scheduled events for this week.</p>
          )}
        </div>
      </div>
    </div>
  );
}
