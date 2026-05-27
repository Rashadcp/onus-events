"use client";

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { getInventoryApi, getEventsApi } from '../../services/api';
import { 
  Plus, 
  LayoutDashboard, 
  History, 
  Package, 
  Receipt, 
  Wrench, 
  Users, 
  BadgeCheck, 
  Truck,
  LogOut,
  Menu,
  X,
  Layers,
  Trash2
} from 'lucide-react';

import { Item, Event, User } from '../../types';
import { AuthGuard } from '../../components/auth/AuthGuard';

// Admin-specific sub-panels
import { AdminDashboardHome } from '../../components/admin/AdminDashboardHome';
import { RepresentativesPanel } from '../../components/admin/RepresentativesPanel';
import { CaptainsPanel } from '../../components/admin/CaptainsPanel';
import { LoadingStaffPanel } from '../../components/admin/LoadingStaffPanel';
import { SimpleInventory } from '../../components/admin/SimpleInventory';
import { DeletedEventsRecovery } from '../../components/admin/DeletedEventsRecovery';
import SalesRepresentativeModule from '../representative/page';

type TabType = 
  | 'dashboard' 
  | 'past-events' 
  | 'free-stock' 
  | 'ledgers' 
  | 'inventory'
  | 'deleted-events'
  | 'representatives' 
  | 'captains' 
  | 'create-event' 
  | 'loading-staff';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const { user, logout, initializeSession } = useAuthStore();

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState(null, '', url.pathname + url.search);
    }
  };

  // Load Auth Session and read initial tab from URL query parameter
  useEffect(() => {
    initializeSession();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && adminMenus.some((menu) => menu.id === tab)) {
        setActiveTab(tab as TabType);
      }
    }
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

  const activeUsers: User[] = [
    { id: 'usr-1', username: 'akhil_sales', fullName: 'Akhil Raj', role: 'SALES_REPRESENTATIVE', email: 'akhil@onus.com', monthlyBilling: 145000 },
    { id: 'usr-2', username: 'neeraj_rep', fullName: 'Neeraj Kumar', role: 'SALES_REPRESENTATIVE', email: 'neeraj@onus.com', monthlyBilling: 88000 },
    { id: 'usr-3', username: 'vinu_captain', fullName: 'Vinu Captain', role: 'SITE_INCHARGE', email: 'vinu@onus.com' },
    { id: 'usr-4', username: 'sabu_loading', fullName: 'Sabu Loader', role: 'LOADING_STAFF', email: 'sabu@onus.com' }
  ];

  const activeItems = (inventoryData.length > 0 ? inventoryData : [
    { itemCode: 'DEC-001', name: 'Luxury Counter Decor Floral Panel', department: 'COUNTER_DECOR', currentStock: 12, rentalRate: 1500, saleRate: 8000, subItems: ['DEC-002'], imageUrl: '', isActive: true, orderList: ['5f9f1b9b9b9b9b9b9b9b9b9b'] },
    { itemCode: 'DEC-002', name: 'Gilded Table Vase', department: 'COUNTER_DECOR', currentStock: 40, rentalRate: 200, saleRate: 1200, subItems: [], imageUrl: '', isActive: true, orderList: [] },
    { itemCode: 'CLO-001', name: 'Premium Velvet Backdrop Curtain 10x10', department: 'CLOTH_DECOR', currentStock: 8, rentalRate: 800, saleRate: 3500, subItems: [], imageUrl: '', isActive: true, orderList: [] }
  ]) as Item[];

  const activeEvents = (eventsData.length > 0 ? eventsData : [
    {
      _id: '5f9f1b9b9b9b9b9b9b9b9b9b',
      customerName: 'Alwin Joy Wedding Reception',
      eventDate: { start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
      timeWindow: { start: '16:00', end: '23:30' },
      place: 'Grand Hyatt Convention Center, Kochi',
      program: 'Wedding Reception Ceremony & Banquet',
      isDeleted: false,
      confirmations: { COUNTER_DECOR: { confirmed: true }, RENTAL_ITEMS: { confirmed: true } }
    }
  ]) as Event[];

  const adminMenus: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create-event', label: 'Create Events', icon: Plus },
    { id: 'past-events', label: 'Past Events', icon: History },
    { id: 'free-stock', label: 'Free Stock', icon: Package },
    { id: 'ledgers', label: 'Ledgers / Customer A/C', icon: Receipt },
    { id: 'inventory', label: 'Inventory', icon: Wrench },
    { id: 'representatives', label: 'Representatives', icon: Users },
    { id: 'captains', label: 'Captains', icon: BadgeCheck },
    { id: 'loading-staff', label: 'Loading Staff', icon: Truck },
    { id: 'deleted-events', label: 'Deleted Events', icon: Trash2 },
  ];

  return (
    <AuthGuard allowedRoles={['ADMIN']}>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="rounded-md border border-slate-300 p-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold"> Admin Console</h1>
                <p className="text-xs text-slate-500">ONUS Event Rental ERP</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium">{user?.fullName || 'System Administrator'}</p>
                <p className="text-xs text-slate-500">Admin ID: {user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="flex">
          {mobileOpen && <button className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}

          <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white p-4 print:hidden lg:sticky lg:top-[65px] lg:block lg:h-[calc(100vh-65px)] lg:overflow-y-auto ${mobileOpen ? 'block' : 'hidden'}`}>
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <span className="font-semibold">Menus</span>
              <button onClick={() => setMobileOpen(false)} className="rounded-md p-2 hover:bg-slate-100" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {adminMenus.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      switchTab(tab.id);
                      setMobileOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="w-full p-4 lg:p-6 print:hidden">
            <div className="mx-auto max-w-7xl">
            
            {/* TAB Routing Content Panel */}
            {activeTab === 'dashboard' && (
              <AdminDashboardHome 
                activeItems={activeItems} 
                activeEvents={activeEvents} 
                activeUsers={activeUsers} 
              />
            )}

            {activeTab === 'past-events' && (
              <SalesRepresentativeModule initialTab="past-events" hideLayout={true} />
            )}

            {activeTab === 'free-stock' && (
              <SalesRepresentativeModule initialTab="free-stock" hideLayout={true} />
            )}

            {activeTab === 'ledgers' && (
              <SalesRepresentativeModule initialTab="customer-accounts" hideLayout={true} />
            )}

            {activeTab === 'inventory' && (
              <SimpleInventory />
            )}

            {activeTab === 'deleted-events' && (
              <DeletedEventsRecovery />
            )}

            {activeTab === 'representatives' && (
              <RepresentativesPanel initialUsers={activeUsers} />
            )}

            {activeTab === 'captains' && (
              <CaptainsPanel initialUsers={activeUsers} />
            )}

            {activeTab === 'create-event' && (
              <SalesRepresentativeModule initialTab="create-event" hideLayout={true} />
            )}

            {activeTab === 'loading-staff' && (
              <LoadingStaffPanel initialUsers={activeUsers} />
            )}

            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
