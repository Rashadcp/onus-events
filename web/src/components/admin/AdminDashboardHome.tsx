"use client";

import React from 'react';
import { Card } from '../ui/Card';

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
  
  // Calculate or mock widget data
  const totalEvents = activeEvents.filter((e: any) => !e.isDeleted).length;
  const upcomingEvents = activeEvents.filter((e: any) => !e.isDeleted && e.eventDate?.start && new Date(e.eventDate.start) >= new Date());
  const availableStock = activeItems.reduce((acc, item) => acc + (item.currentStock || 0), 0);
  const totalRevenue = "₹ 1,24,500"; // Mocked for UI template
  const pendingPayments = "₹ 12,350"; // Mocked for UI template

  return (
    <div className="flex flex-col gap-6 font-sans">
      
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-sm text-gray-500 mt-1">A simple overview of your ERP system.</p>
      </div>

      {/* 4 Simple Widget Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <Card className="p-5 flex flex-col gap-2 border border-gray-200 shadow-sm bg-white rounded-lg">
          <span className="text-sm font-medium text-gray-500">Total Events</span>
          <span className="text-3xl font-bold text-gray-900">{totalEvents}</span>
        </Card>

        <Card className="p-5 flex flex-col gap-2 border border-gray-200 shadow-sm bg-white rounded-lg">
          <span className="text-sm font-medium text-gray-500">Total Revenue</span>
          <span className="text-3xl font-bold text-gray-900">{totalRevenue}</span>
        </Card>

        <Card className="p-5 flex flex-col gap-2 border border-gray-200 shadow-sm bg-white rounded-lg">
          <span className="text-sm font-medium text-gray-500">Available Stock</span>
          <span className="text-3xl font-bold text-gray-900">{availableStock}</span>
        </Card>

        <Card className="p-5 flex flex-col gap-2 border border-gray-200 shadow-sm bg-white rounded-lg">
          <span className="text-sm font-medium text-gray-500">Pending Payments</span>
          <span className="text-3xl font-bold text-gray-900">{pendingPayments}</span>
        </Card>

      </div>

      {/* Simple Table for Upcoming Events */}
      <Card className="border border-gray-200 shadow-sm mt-2 bg-white rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Events ({upcomingEvents.length})</h3>
          <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded border border-blue-100 animate-pulse">Live Schedule</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Location / Venue</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {upcomingEvents.map((event: any) => (
                <tr key={event._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-gray-900">{event.program}</p>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">{event.customerName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{event.place}</td>
                  <td className="px-6 py-4 font-semibold">
                    {event.eventDate?.start ? new Date(event.eventDate.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      event.eventStatus === 'CONFIRMED' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-255' 
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {event.eventStatus || 'INQUIRY'}
                    </span>
                  </td>
                </tr>
              ))}
              {upcomingEvents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                    No upcoming events scheduled currently.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
    </div>
  );
}
