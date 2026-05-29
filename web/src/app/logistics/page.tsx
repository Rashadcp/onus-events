"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  getEventsApi, 
  getInventoryApi, 
  getLogisticsLogApi, 
  updateLogisticsLogApi 
} from '../../services/api';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { Button } from '../../components/ui/Button';
import { Truck, CheckCircle2, Calendar, Clock, MapPin } from 'lucide-react';

// Modular Sub-Components
import { LogisticsHeader } from '../../components/logistics/LogisticsHeader';
import { LogisticsSidebar } from '../../components/logistics/LogisticsSidebar';
import { EventBanner } from '../../components/logistics/EventBanner';
import { LogisticsTable } from '../../components/logistics/LogisticsTable';
import { AdditionalItemsManager } from '../../components/logistics/AdditionalItemsManager';
import { VehicleTeamManager } from '../../components/logistics/VehicleTeamManager';
import { PrintLayout } from '../../components/logistics/PrintLayout';

export default function LogisticsDashboard() {
  const queryClient = useQueryClient();
  const { user, logout, initializeSession } = useAuthStore();

  const [activeSubTab, setActiveSubTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Edit Option state
  const [isEditingMode, setIsEditingMode] = useState(false);

  // Loading / Outward crew and logistics details
  const [loadingStaff, setLoadingStaff] = useState<string[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [loadingVehicleNo, setLoadingVehicleNo] = useState('');
  const [loadingLoads, setLoadingLoads] = useState<number>(1);
  const [loadingCharges, setLoadingCharges] = useState<number>(0);

  // Reloading / Inward return crew and logistics details
  const [reloadingStaff, setReloadingStaff] = useState<string[]>([]);
  const [newReloadStaffName, setNewReloadStaffName] = useState('');
  const [reloadingVehicleNo, setReloadingVehicleNo] = useState('');
  const [reloadingLoads, setReloadingLoads] = useState<number>(1);
  
  // Quantities states (indexed by itemId or itemCode)
  const [loadedQuantities, setLoadedQuantities] = useState<Record<string, number>>({});
  const [returnedQuantities, setReturnedQuantities] = useState<Record<string, number>>({});
  
  // Additional items outward
  const [additionalItems, setAdditionalItems] = useState<{ itemCode: string; quantity: number; referredBy: string }[]>([]);
  const [addCode, setAddCode] = useState('');
  const [addQty, setAddQty] = useState('1');
  const [addReferral, setAddReferral] = useState('');

  // Silent session initialization
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Query all active events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: getEventsApi,
    placeholderData: []
  });

  // Query complete inventory catalog
  const { data: catalog = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: getInventoryApi,
    placeholderData: []
  });

  // Query selected event's logistics log sheet
  const { data: logisticsLog = null, isLoading: logLoading } = useQuery({
    queryKey: ['logisticsLog', selectedEventId],
    queryFn: () => selectedEventId ? getLogisticsLogApi(selectedEventId) : Promise.resolve(null),
    enabled: !!selectedEventId
  });

  // Helper to map additional item code to inventory details
  const getAdditionalItemDetails = (itemCode: string) => {
    const match = catalog.find((inv: any) => inv.itemCode.toUpperCase() === itemCode.toUpperCase());
    return {
      _id: match?._id || match?.id || itemCode,
      name: match?.name || `Item (${itemCode})`,
      itemCode: match?.itemCode || itemCode
    };
  };

  const selectedEvent = events.find((e) => e._id === selectedEventId);

  // Sync logistics log fields when fetched
  useEffect(() => {
    if (logisticsLog && selectedEvent) {
      setLoadingStaff(logisticsLog.loadingStaff || []);
      setReloadingStaff(logisticsLog.reloadingStaff || []);
      
      setLoadingVehicleNo(logisticsLog.loadingVehicle?.vehicleNo || '');
      setLoadingLoads(logisticsLog.loadingVehicle?.noOfLoads || 1);
      
      setReloadingVehicleNo(logisticsLog.reloadingVehicle?.vehicleNo || '');
      setReloadingLoads(logisticsLog.reloadingVehicle?.noOfLoads || 1);
      
      setLoadingCharges(logisticsLog.loadingCharges || 0);

      // Sync Outward Loaded Quantities
      const loadedMap: Record<string, number> = {};
      selectedEvent.items?.forEach((it: any) => {
        const id = it.itemId?._id || it.itemId;
        const savedVo = logisticsLog.verifiedOut?.find((vo: any) => (vo.itemId?._id || vo.itemId) === id);
        // Default to original booked quantity if not previously saved
        loadedMap[id] = savedVo ? savedVo.quantity : it.quantity;
      });
      setLoadedQuantities(loadedMap);

      // Sync Additional items outward
      setAdditionalItems(logisticsLog.additionalItems || []);

      // Sync Inward Returned Quantities
      const returnedMap: Record<string, number> = {};
      
      // 1. Return items mapping for original booked items
      selectedEvent.items?.forEach((it: any) => {
        const id = it.itemId?._id || it.itemId;
        const loadedQty = loadedMap[id] ?? it.quantity;
        const savedMissing = logisticsLog.missingItems?.find((mi: any) => (mi.itemId?._id || mi.itemId) === id);
        
        // Returned Qty = Loaded Qty - Missing Qty (defaults to loadedQty if not marked missing)
        returnedMap[id] = savedMissing ? Math.max(0, loadedQty - savedMissing.quantity) : loadedQty;
      });

      // 2. Return items mapping for additional items taken to site
      (logisticsLog.additionalItems || []).forEach((add: any) => {
        const details = getAdditionalItemDetails(add.itemCode);
        const id = details._id;
        const savedMissing = logisticsLog.missingItems?.find((mi: any) => (mi.itemId?._id || mi.itemId) === id);
        
        returnedMap[id] = savedMissing ? Math.max(0, add.quantity - savedMissing.quantity) : add.quantity;
      });

      setReturnedQuantities(returnedMap);
    } else {
      resetForm();
    }
    setIsEditingMode(false); // Default to locked view
  }, [logisticsLog, selectedEventId, selectedEvent]);

  const resetForm = () => {
    setLoadingStaff([]);
    setReloadingStaff([]);
    setNewStaffName('');
    setNewReloadStaffName('');
    setLoadingVehicleNo('');
    setReloadingVehicleNo('');
    setLoadingLoads(1);
    setReloadingLoads(1);
    setLoadingCharges(0);
    setLoadedQuantities({});
    setReturnedQuantities({});
    setAdditionalItems([]);
    setAddCode('');
    setAddQty('1');
    setAddReferral('');
  };

  // Logistics Log updates mutation
  const updateLogisticsLogMutation = useMutation({
    mutationFn: ({ eventId, payload }: { eventId: string; payload: any }) => updateLogisticsLogApi(eventId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['logisticsLog', selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(data.message || 'Logistics database updated and audit log recorded!');
      setIsEditingMode(false); // Lock editing after save
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to sync logistics data.');
    }
  });

  // Date filters based on specific requirements
  const getFilteredEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events.filter((e: any) => {
      if (e.isDeleted) return false;
      const eventStartDate = new Date(e.eventDate.start);
      eventStartDate.setHours(0, 0, 0, 0);
      const eventEndDate = new Date(e.eventDate.end);
      eventEndDate.setHours(23, 59, 59, 999);

      if (activeSubTab === 'upcoming') {
        // Show only upcoming events for the next 2 days + today
        const maxUpcomingDate = new Date(today);
        maxUpcomingDate.setDate(today.getDate() + 2);
        maxUpcomingDate.setHours(23, 59, 59, 999);

        return eventStartDate >= today && eventStartDate <= maxUpcomingDate && e.eventStatus !== 'CLOSED' && e.eventStatus !== 'RETURNED';
      } else {
        // Show all past events (started before today)
        return eventStartDate < today;
      }
    });
  };

  const filteredEvents = getFilteredEvents();

  // Loading Staff helpers
  const addStaffMember = () => {
    if (newStaffName.trim() && !loadingStaff.includes(newStaffName.trim())) {
      setLoadingStaff([...loadingStaff, newStaffName.trim()]);
      setNewStaffName('');
    }
  };

  const removeStaffMember = (name: string) => {
    setLoadingStaff(loadingStaff.filter((s) => s !== name));
  };

  // Reloading Staff helpers
  const addReloadStaffMember = () => {
    if (newReloadStaffName.trim() && !reloadingStaff.includes(newReloadStaffName.trim())) {
      setReloadingStaff([...reloadingStaff, newReloadStaffName.trim()]);
      setNewReloadStaffName('');
    }
  };

  const removeReloadStaffMember = (name: string) => {
    setReloadingStaff(reloadingStaff.filter((s) => s !== name));
  };

  // Additional items with mandatory Reference / Reason field
  const addAdditionalItem = () => {
    if (!addCode.trim()) {
      toast.error('Please select or enter an item code.');
      return;
    }
    if (!addReferral.trim()) {
      toast.error('WARNING: Reference / Reason field is absolutely mandatory to log additional items taken to site!');
      return;
    }
    const code = addCode.toUpperCase().trim();
    const exists = additionalItems.find((i) => i.itemCode === code);
    if (exists) {
      toast.error(`Item code ${code} is already in the additional items list.`);
      return;
    }

    setAdditionalItems([
      ...additionalItems,
      {
        itemCode: code,
        quantity: Number(addQty) || 1,
        referredBy: addReferral.trim()
      }
    ]);
    toast.success(`Added additional item ${code} successfully!`);
    setAddCode('');
    setAddQty('1');
    setAddReferral('');
  };

  const removeAdditionalItem = (code: string) => {
    setAdditionalItems(additionalItems.filter((i) => i.itemCode !== code));
  };

  // Checkbox Verify option toggles
  const handleVerifyLoadingToggle = (itemId: string, orderedQty: number) => {
    const currentVal = loadedQuantities[itemId] ?? orderedQty;
    const isFullyVerified = currentVal === orderedQty;
    
    setLoadedQuantities({
      ...loadedQuantities,
      [itemId]: isFullyVerified ? 0 : orderedQty // Toggles between fully verified or zero
    });
  };

  const handleVerifyReloadingToggle = (itemId: string, totalTakenQty: number) => {
    const currentVal = returnedQuantities[itemId] ?? totalTakenQty;
    const isFullyReturned = currentVal === totalTakenQty;

    setReturnedQuantities({
      ...returnedQuantities,
      [itemId]: isFullyReturned ? 0 : totalTakenQty // Toggles between fully returned or zero
    });
  };

  // Quantity input value changes
  const handleLoadedQtyChange = (itemId: string, maxVal: number, inputVal: number) => {
    const sanitized = Math.min(maxVal, Math.max(0, inputVal));
    setLoadedQuantities({
      ...loadedQuantities,
      [itemId]: sanitized
    });
  };

  const handleReturnedQtyChange = (itemId: string, maxVal: number, inputVal: number) => {
    const sanitized = Math.min(maxVal, Math.max(0, inputVal));
    setReturnedQuantities({
      ...returnedQuantities,
      [itemId]: sanitized
    });
  };

  // Outward dispatch saving triggers
  const handleOutwardChecklistSave = (statusOverride?: 'DISPATCHED') => {
    if (!selectedEventId || !selectedEvent) return;

    // Compile verifiedOut loads
    const verifiedOut = (selectedEvent.items || []).map((it: any) => {
      const id = it.itemId?._id || it.itemId;
      const loaded = loadedQuantities[id] ?? it.quantity;
      return {
        itemId: id,
        quantity: loaded
      };
    });

    // Compile shortages (Original - Loaded)
    const shortItems = (selectedEvent.items || [])
      .map((it: any) => {
        const id = it.itemId?._id || it.itemId;
        const loaded = loadedQuantities[id] ?? it.quantity;
        const short = Math.max(0, it.quantity - loaded);
        return { itemId: id, quantity: short };
      })
      .filter((s: any) => s.quantity > 0);

    const payload = {
      status: statusOverride === 'DISPATCHED' ? 'RELOADING_IN' : 'LOADING_OUT',
      loadingStaff,
      loadingVehicle: {
        vehicleNo: loadingVehicleNo,
        noOfLoads: loadingLoads
      },
      verifiedOut,
      additionalItems,
      shortItems,
      loadingCharges
    };

    updateLogisticsLogMutation.mutate({ eventId: selectedEventId, payload });
  };

  // Inward return saving triggers
  const handleInwardChecklistSave = (statusOverride?: 'COMPLETED') => {
    if (!selectedEventId || !selectedEvent) return;

    // Calculate missing items (Quantity Taken to Site - Returned Quantity)
    const missingItems: { itemId: string; quantity: number }[] = [];

    // 1. Check booked items
    selectedEvent.items?.forEach((it: any) => {
      const id = it.itemId?._id || it.itemId;
      const loaded = loadedQuantities[id] ?? it.quantity;
      const returned = returnedQuantities[id] ?? loaded;
      const missing = Math.max(0, loaded - returned);
      if (missing > 0) {
        missingItems.push({ itemId: id, quantity: missing });
      }
    });

    // 2. Check additional items
    additionalItems.forEach((add: any) => {
      const details = getAdditionalItemDetails(add.itemCode);
      const id = details._id;
      const returned = returnedQuantities[id] ?? add.quantity;
      const missing = Math.max(0, add.quantity - returned);
      if (missing > 0) {
        missingItems.push({ itemId: id, quantity: missing });
      }
    });

    const payload = {
      status: statusOverride || 'RELOADING_IN',
      reloadingStaff,
      reloadingVehicle: {
        vehicleNo: reloadingVehicleNo,
        noOfLoads: reloadingLoads
      },
      missingItems,
      loadingCharges
    };

    updateLogisticsLogMutation.mutate({ eventId: selectedEventId, payload });
  };

  const handleStoreCopyPrint = () => {
    window.print();
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        
        {/* Top Header Navigation */}
        <LogisticsHeader 
          user={user} 
          logout={logout} 
          onMenuClick={() => setMobileOpen(true)} 
        />

        {/* Dashboard Framework */}
        <div className="flex">
          
          {/* Sidebar Left Navigation */}
          <LogisticsSidebar
            activeSubTab={activeSubTab}
            setActiveSubTab={(tab) => {
              setActiveSubTab(tab);
              setSelectedEventId(null);
            }}
            mobileOpen={mobileOpen}
            setMobileOpen={setMobileOpen}
          />

          {/* Main Workspace Frame */}
          <main className="flex-1 min-w-0 p-4 lg:p-6 print:w-full print:p-0 bg-slate-50">
            <div className="mx-auto max-w-5xl flex flex-col gap-6 print:max-w-full">
              
              {selectedEvent ? (
                <div className="flex flex-col gap-6 print:w-full">
                  
                  {/* Back Navigation Button */}
                  <div className="print:hidden">
                    <button
                      onClick={() => setSelectedEventId(null)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 rounded-lg px-4 py-2.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                    >
                      <span>←</span> Back to {activeSubTab === 'upcoming' ? 'Upcoming' : 'Past'} Schedules List
                    </button>
                  </div>

                  {/* Master event metadata banner */}
                  <EventBanner 
                    selectedEvent={selectedEvent} 
                    onPrint={handleStoreCopyPrint} 
                  />

                  {/* Print layout sheet strictly visible in browser print mode */}
                  <PrintLayout
                    selectedEvent={selectedEvent}
                    activeSubTab={activeSubTab}
                    additionalItems={additionalItems}
                    getAdditionalItemDetails={getAdditionalItemDetails}
                    loadingVehicleNo={loadingVehicleNo}
                    loadingLoads={loadingLoads}
                    reloadingVehicleNo={reloadingVehicleNo}
                    reloadingLoads={reloadingLoads}
                    loadingCharges={loadingCharges}
                    loadingStaff={loadingStaff}
                    loadedQuantities={loadedQuantities}
                    returnedQuantities={returnedQuantities}
                  />

                  {logLoading ? (
                    <div className="py-36 text-center flex flex-col items-center justify-center gap-3 bg-white border border-slate-200 rounded-md shadow-sm">
                      <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                      <p className="text-xs text-slate-400 font-semibold">Syncing database logs...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6 print:hidden">
                      
                      {/* Main datagrid checklist table */}
                      <LogisticsTable
                        activeSubTab={activeSubTab}
                        selectedEvent={selectedEvent}
                        isEditingMode={isEditingMode}
                        setIsEditingMode={setIsEditingMode}
                        loadedQuantities={loadedQuantities}
                        returnedQuantities={returnedQuantities}
                        handleLoadedQtyChange={handleLoadedQtyChange}
                        handleReturnedQtyChange={handleReturnedQtyChange}
                        handleVerifyLoadingToggle={handleVerifyLoadingToggle}
                        handleVerifyReloadingToggle={handleVerifyReloadingToggle}
                      />

                      {/* Additional items entry and listings */}
                      {activeSubTab === 'upcoming' && (
                        <AdditionalItemsManager
                          catalog={catalog}
                          additionalItems={additionalItems}
                          addCode={addCode}
                          setAddCode={setAddCode}
                          addQty={addQty}
                          setAddQty={setAddQty}
                          addReferral={addReferral}
                          setAddReferral={setAddReferral}
                          addAdditionalItem={addAdditionalItem}
                          removeAdditionalItem={removeAdditionalItem}
                          getAdditionalItemDetails={getAdditionalItemDetails}
                        />
                      )}

                      {/* Site Return List for additional items taken */}
                      {activeSubTab === 'past' && additionalItems.length > 0 && (
                        <LogisticsTable
                          activeSubTab="past"
                          selectedEvent={{
                            ...selectedEvent,
                            items: additionalItems.map((ai) => {
                              const details = getAdditionalItemDetails(ai.itemCode);
                              return {
                                itemId: {
                                  _id: details._id,
                                  name: details.name,
                                  itemCode: details.itemCode
                                },
                                quantity: ai.quantity
                              };
                            })
                          }}
                          isEditingMode={isEditingMode}
                          setIsEditingMode={setIsEditingMode}
                          loadedQuantities={loadedQuantities}
                          returnedQuantities={returnedQuantities}
                          handleLoadedQtyChange={handleLoadedQtyChange}
                          handleReturnedQtyChange={handleReturnedQtyChange}
                          handleVerifyLoadingToggle={handleVerifyLoadingToggle}
                          handleVerifyReloadingToggle={handleVerifyReloadingToggle}
                        />
                      )}

                      {/* Crew team & vehicle registration details */}
                      <VehicleTeamManager
                        activeSubTab={activeSubTab}
                        loadingStaff={loadingStaff}
                        newStaffName={newStaffName}
                        setNewStaffName={setNewStaffName}
                        addStaffMember={addStaffMember}
                        removeStaffMember={removeStaffMember}
                        loadingVehicleNo={loadingVehicleNo}
                        setLoadingVehicleNo={setLoadingVehicleNo}
                        loadingLoads={loadingLoads}
                        setLoadingLoads={setLoadingLoads}
                        loadingCharges={loadingCharges}
                        setLoadingCharges={setLoadingCharges}
                        reloadingStaff={reloadingStaff}
                        newReloadStaffName={newReloadStaffName}
                        setNewReloadStaffName={setNewReloadStaffName}
                        addReloadStaffMember={addReloadStaffMember}
                        removeReloadStaffMember={removeReloadStaffMember}
                        reloadingVehicleNo={reloadingVehicleNo}
                        setReloadingVehicleNo={setReloadingVehicleNo}
                        reloadingLoads={reloadingLoads}
                        setReloadingLoads={setReloadingLoads}
                      />

                     

                      {/* Interactive save controls */}
                      <div className="flex justify-end gap-3 border-t border-[#E2E8F0] pt-6 print:hidden">
                        {activeSubTab === 'upcoming' ? (
                          <>
                            <Button
                              onClick={() => handleOutwardChecklistSave()}
                              disabled={updateLogisticsLogMutation.isPending}
                              className="bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 text-xs px-4 font-bold py-3 rounded cursor-pointer"
                            >
                              {updateLogisticsLogMutation.isPending ? 'Saving...' : '💾 Save load checklist draft'}
                            </Button>
                            
                            <Button
                              onClick={() => handleOutwardChecklistSave('DISPATCHED')}
                              disabled={updateLogisticsLogMutation.isPending}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5 font-semibold py-3 rounded flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <Truck className="w-4 h-4" />
                              {updateLogisticsLogMutation.isPending ? 'Processing...' : 'Finalize & Dispatch Vehicle 🚚'}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => handleInwardChecklistSave()}
                              disabled={updateLogisticsLogMutation.isPending}
                              className="bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 text-xs px-4 font-bold py-3 rounded cursor-pointer"
                            >
                              {updateLogisticsLogMutation.isPending ? 'Saving...' : '💾 Save reload checklist draft'}
                            </Button>
                            
                            <Button
                              onClick={() => handleInwardChecklistSave('COMPLETED')}
                              disabled={updateLogisticsLogMutation.isPending}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-5 font-semibold py-3 rounded flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              {updateLogisticsLogMutation.isPending ? 'Processing...' : 'Finalize & Return Stocks ✓'}
                            </Button>
                          </>
                        )}
                      </div>

                    </div>
                  )}

                </div>
                              ) : (
                  <div className="flex flex-col gap-6">
                    {/* Header Section */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-xs">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl flex items-center gap-2">
                          <Truck className="h-6 w-6 text-blue-600 animate-pulse" />
                          {activeSubTab === 'upcoming' ? 'Upcoming Dispatch Schedules' : 'Past Dispatch Schedules'}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          {activeSubTab === 'upcoming' 
                            ? 'Manage logistics checklist, loading sheets, and crew checkmarks for events scheduled in the next 2 days.' 
                            : 'Review and return stock checklists for past events.'}
                        </p>
                      </div>
                      <div className="bg-blue-50 text-blue-700 text-xs px-3.5 py-2 rounded-lg font-bold border border-blue-100 flex items-center gap-1.5 shadow-2xs">
                        <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                        {filteredEvents.length} {filteredEvents.length === 1 ? 'Schedule' : 'Schedules'} Available
                      </div>
                    </div>

                    {/* Schedules Listing Grid / List */}
                    {eventsLoading ? (
                      <div className="py-24 text-center flex flex-col items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-xs text-slate-400 font-semibold">Loading schedules from database...</p>
                      </div>
                    ) : filteredEvents.length === 0 ? (
                      <div className="py-24 text-center flex flex-col items-center justify-center gap-4 bg-white border border-slate-200 rounded-xl shadow-xs px-6">
                        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center border border-slate-100 shadow-2xs">
                          <Truck className="w-8 h-8" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-base">No schedules found</h3>
                        <p className="text-xs text-slate-400 max-w-xs font-semibold leading-relaxed">
                          {activeSubTab === 'upcoming' 
                            ? 'There are no active upcoming events scheduled for the next 2 days.' 
                            : 'There are no past events recorded.'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {filteredEvents.map((ev: any) => {
                          const eventStartDate = new Date(ev.eventDate?.start);
                          const isUpcoming = activeSubTab === 'upcoming';
                          
                          // Status color helper for status badges
                          const getStatusBadgeStyles = (status: string) => {
                            switch (status?.toUpperCase()) {
                              case 'CLOSED':
                              case 'RETURNED':
                              case 'COMPLETED':
                                return 'bg-emerald-50 text-emerald-700 border-emerald-100';
                              case 'RELOADING_IN':
                              case 'DISPATCHED':
                                return 'bg-blue-50 text-blue-700 border-blue-100';
                              case 'LOADING_OUT':
                              case 'INQUIRY':
                              default:
                                return 'bg-amber-50 text-amber-700 border-amber-100';
                            }
                          };

                          return (
                            <div
                              key={ev._id}
                              onClick={() => setSelectedEventId(ev._id)}
                              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-md hover:border-blue-400 hover:scale-[1.01] cursor-pointer transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
                            >
                              {/* Accent Bar */}
                              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isUpcoming ? 'from-blue-500 to-indigo-500' : 'from-slate-400 to-slate-500'} opacity-0 group-hover:opacity-100 transition-opacity`} />
                              
                              <div className="flex flex-col gap-3.5">
                                {/* Header */}
                                <div className="flex justify-between items-start gap-2">
                                  <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${getStatusBadgeStyles(ev.eventStatus)}`}>
                                    {ev.eventStatus}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    {eventStartDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>

                                {/* Customer & Location */}
                                <div>
                                  <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors line-clamp-1">{ev.customerName}</h3>
                                  <p className="text-xs text-slate-500 mt-1 font-semibold flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    {ev.place || 'Main Venue'}
                                  </p>
                                </div>

                                {/* Event Information Grid */}
                                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs font-semibold text-slate-500 mt-1">
                                  <div>
                                    <span className="text-[9px] text-slate-400 uppercase block tracking-wider mb-0.5">Time Window</span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-450" />
                                      {ev.timeWindow?.start || '09:00'} - {ev.timeWindow?.end || '18:00'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-400 uppercase block tracking-wider mb-0.5">Booked Items</span>
                                    📦 {ev.items?.length || 0} Types of Items
                                  </div>
                                </div>
                              </div>

                              {/* Action Button */}
                              <div className="mt-5 pt-3.5 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                                <span>Open Logistics Checklist</span>
                                <span className="transform translate-x-0 group-hover:translate-x-1 transition-transform">➔</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
            </div>
          </main>

        </div>

      </div>
    </AuthGuard>
  );
}
