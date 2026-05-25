"use client";

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { getInventoryApi, getEventsApi } from '../../services/api';

import { Item, Event } from '../../types';

// Atomic Reusable UI Components
import { Button } from '../../components/ui/Button';

// Reusable Dashboard Feature Components
import { FreeStockMonitor } from '../../components/dashboard/FreeStockMonitor';
import { CustomerLedgerPanel } from '../../components/dashboard/CustomerLedgerPanel';
import { InventoryCatalog } from '../../components/dashboard/InventoryCatalog';
import { CreateEventForm } from '../../components/dashboard/CreateEventForm';

// Admin-specific sub-panels
import { AdminDashboardHome } from '../../components/admin/AdminDashboardHome';
import { PastEventsLogs } from '../../components/admin/PastEventsLogs';
import { RepresentativesPanel } from '../../components/admin/RepresentativesPanel';
import { CaptainsPanel } from '../../components/admin/CaptainsPanel';
import { LoadingStaffPanel } from '../../components/admin/LoadingStaffPanel';

type TabType = 
  | 'dashboard' 
  | 'past-events' 
  | 'free-stock' 
  | 'ledgers' 
  | 'inventory' 
  | 'representatives' 
  | 'captains' 
  | 'create-event' 
  | 'loading-staff';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  const { user, logout, initializeSession } = useAuthStore();

  // Load Auth Session
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // ----------------------------------------------------
  // TanStack Queries (Fetched globally, cached automatically)
  // ----------------------------------------------------
  
  const { data: inventoryData = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: getInventoryApi,
    placeholderData: []
  });

  const { data: eventsData = [] } = useQuery({
    queryKey: ['events'],
    queryFn: getEventsApi,
    placeholderData: []
  });

  // Local Preset Fallbacks
  const mockCustomers = [
    { id: '1', name: 'Alwin Joy', place: 'Kochi', contact: '9876543210', historyCount: 2 },
    { id: '2', name: 'Jane Smith', place: 'Trivandrum', contact: '9876543211', historyCount: 1 },
    { id: '3', name: 'John Doe', place: 'Calicut', contact: '9876543212', historyCount: 1 }
  ];

  const activeUsers = [
    { id: 'usr-1', username: 'akhil_sales', fullName: 'Akhil Raj', role: 'REPRESENTATIVE', email: 'akhil@onus.com', monthlyBilling: 145000 },
    { id: 'usr-2', username: 'neeraj_rep', fullName: 'Neeraj Kumar', role: 'REPRESENTATIVE', email: 'neeraj@onus.com', monthlyBilling: 88000 },
    { id: 'usr-3', username: 'vinu_captain', fullName: 'Vinu Captain', role: 'SITE_INCHARGE', email: 'vinu@onus.com' },
    { id: 'usr-4', username: 'sabu_loading', fullName: 'Sabu Loader', role: 'LOADING_STAFF', email: 'sabu@onus.com' }
  ];

  const activeItems = (inventoryData.length > 0 ? inventoryData : [
    { itemCode: 'DEC-001', name: 'Luxury Counter Decor Floral Panel', department: 'COUNTER_DECOR', currentStock: 12, rentalRate: 1500, saleRate: 8000, subItems: ['DEC-002'], imageUrl: '', isActive: true, orderList: ['ev-101'] },
    { itemCode: 'DEC-002', name: 'Gilded Table Vase', department: 'COUNTER_DECOR', currentStock: 40, rentalRate: 200, saleRate: 1200, subItems: [], imageUrl: '', isActive: true, orderList: [] },
    { itemCode: 'CLO-001', name: 'Premium Velvet Backdrop Curtain 10x10', department: 'CLOTH_DECOR', currentStock: 8, rentalRate: 800, saleRate: 3500, subItems: [], imageUrl: '', isActive: true, orderList: [] }
  ]) as Item[];

  const activeEvents = (eventsData.length > 0 ? eventsData : [
    {
      _id: 'ev-101',
      customerName: 'Alwin Joy Wedding Reception',
      eventDate: { start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
      timeWindow: { start: '16:00', end: '23:30' },
      place: 'Grand Hyatt Convention Center, Kochi',
      program: 'Wedding Reception Ceremony & Banquet',
      isDeleted: false,
      confirmations: { COUNTER_DECOR: { confirmed: true }, RENTAL_ITEMS: { confirmed: true } }
    }
  ]) as Event[];

  return (
    <div className="h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col font-sans overflow-hidden">
      {/* Premium Header Component */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-40 px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 bg-blue-600 rounded-full" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#2563EB] to-[#14B8A6] bg-clip-text text-transparent">
            ONUS EVENT ADMIN CONSOLE
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-bold text-[#0F172A]">{user?.fullName || 'System Administrator'}</p>
            <p className="text-xs text-blue-600 uppercase tracking-widest font-bold">System {user?.role || 'ADMIN'}</p>
          </div>
          <Button 
            variant="danger" 
            onClick={logout}
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Navigation Sidebar Panel */}
        <aside className="w-[270px] border-r border-[#E2E8F0] bg-white p-6 flex flex-col gap-2 shrink-0 overflow-y-auto">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-4 px-3">Sections Console</p>
          
          {[
            { id: 'dashboard', label: '🏠 Dashboard Home' },
            { id: 'past-events', label: '📅 Past Events Logs' },
            { id: 'free-stock', label: '📦 Free Stock Monitor' },
            { id: 'ledgers', label: '👤 Customer Ledgers' },
            { id: 'inventory', label: '🛠️ Inventory Master' },
            { id: 'representatives', label: '👥 Representatives' },
            { id: 'captains', label: '💂 Captains / Incharges' },
            { id: 'create-event', label: '➕ Create New Event' },
            { id: 'loading-staff', label: '🚛 Loading Staff Log' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition duration-200 flex items-center justify-between hover:scale-[1.02] ${ activeTab === tab.id ? 'bg-blue-50 border border-blue-500/10 text-blue-600 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800' }`}
            >
              <span>{tab.label}</span>
              {activeTab === tab.id && <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
            </button>
          ))}
        </aside>

        {/* Content Viewer Body */}
        <main className="flex-1 p-8 overflow-y-auto max-w-6xl mx-auto w-full">
          
          {/* TAB Routing Content Panel */}
          {activeTab === 'dashboard' && (
            <AdminDashboardHome 
              activeItems={activeItems} 
              activeEvents={activeEvents} 
              activeUsers={activeUsers} 
            />
          )}

          {activeTab === 'past-events' && (
            <PastEventsLogs initialEvents={activeEvents} />
          )}

          {activeTab === 'free-stock' && (
            <FreeStockMonitor initialItems={activeItems} />
          )}

          {activeTab === 'ledgers' && (
            <CustomerLedgerPanel 
              initialCustomers={mockCustomers} 
              initialEvents={activeEvents} 
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryCatalog isAdmin={true} initialItems={activeItems} />
          )}

          {activeTab === 'representatives' && (
            <RepresentativesPanel initialUsers={activeUsers} />
          )}

          {activeTab === 'captains' && (
            <CaptainsPanel initialUsers={activeUsers} />
          )}

          {activeTab === 'create-event' && (
            <CreateEventForm initialItems={activeItems} />
          )}

          {activeTab === 'loading-staff' && (
            <LoadingStaffPanel initialUsers={activeUsers} />
          )}

        </main>
      </div>
    </div>
  );
}
