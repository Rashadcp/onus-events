"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  getEventsApi, 
  getInventoryApi, 
  getLogisticsLogApi, 
  updateLogisticsLogApi 
} from '../../services/api';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { 
  Truck, 
  CheckSquare, 
  Plus, 
  AlertCircle, 
  FileText, 
  LogOut, 
  Clock, 
  User, 
  Users, 
  Trash2, 
  ChevronRight, 
  Info,
  Calendar,
  CheckCircle2
} from 'lucide-react';

export default function LogisticsDashboard() {
  const queryClient = useQueryClient();
  const { user, logout, initializeSession } = useAuthStore();

  const [activeSubTab, setActiveSubTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // Notification states
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Logistics Log form states
  const [loadingStaff, setLoadingStaff] = useState<string[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [noOfLoads, setNoOfLoads] = useState<number>(1);
  const [loadingCharges, setLoadingCharges] = useState<number>(0);
  
  // Checked loaded/reloaded states
  const [checkedOutItems, setCheckedOutItems] = useState<Record<string, boolean>>({});
  const [checkedInItems, setCheckedInItems] = useState<Record<string, boolean>>({});
  
  // Additional items
  const [additionalItems, setAdditionalItems] = useState<{ itemCode: string; quantity: number; referredBy: string }[]>([]);
  const [addCode, setAddCode] = useState('');
  const [addQty, setAddQty] = useState('1');
  const [addReferral, setAddReferral] = useState('');

  // Shortage items (Outward)
  const [shortItems, setShortItems] = useState<{ itemId: string; quantity: number }[]>([]);
  
  // Missing items (Inward return)
  const [missingItems, setMissingItems] = useState<{ itemId: string; quantity: number }[]>([]);

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

  // Sync logistics log fields when fetched
  useEffect(() => {
    if (logisticsLog) {
      setLoadingStaff(logisticsLog.loadingStaff || []);
      setVehicleNo(logisticsLog.loadingVehicle?.vehicleNo || '');
      setNoOfLoads(logisticsLog.loadingVehicle?.noOfLoads || 1);
      setLoadingCharges(logisticsLog.loadingCharges || 0);

      // Map verifiedOut checklist
      const verifiedOutMap: Record<string, boolean> = {};
      if (logisticsLog.verifiedOut) {
        logisticsLog.verifiedOut.forEach((it: any) => {
          verifiedOutMap[it.itemId?._id || it.itemId] = true;
        });
      }
      setCheckedOutItems(verifiedOutMap);

      // Map reloaded / returned verification checklist
      const verifiedInMap: Record<string, boolean> = {};
      // In completed state or returning state
      if (logisticsLog.status === 'COMPLETED' || logisticsLog.status === 'RELOADING_IN') {
        const matchingEv = events.find((e) => e._id === selectedEventId);
        if (matchingEv?.items) {
          matchingEv.items.forEach((it: any) => {
            const isMissing = logisticsLog.missingItems?.find((mi: any) => (mi.itemId?._id || mi.itemId) === it.itemId?._id);
            if (!isMissing) {
              verifiedInMap[it.itemId?._id || it.itemId] = true;
            }
          });
        }
      }
      setCheckedInItems(verifiedInMap);

      // Additional items list
      setAdditionalItems(logisticsLog.additionalItems || []);
      
      // Shortages & Missing
      setShortItems(logisticsLog.shortItems?.map((s: any) => ({ itemId: s.itemId?._id || s.itemId, quantity: s.quantity })) || []);
      setMissingItems(logisticsLog.missingItems?.map((m: any) => ({ itemId: m.itemId?._id || m.itemId, quantity: m.quantity })) || []);
    } else {
      resetForm();
    }
  }, [logisticsLog, selectedEventId]);

  const resetForm = () => {
    setLoadingStaff([]);
    setNewStaffName('');
    setVehicleNo('');
    setNoOfLoads(1);
    setLoadingCharges(0);
    setCheckedOutItems({});
    setCheckedInItems({});
    setAdditionalItems([]);
    setShortItems([]);
    setMissingItems([]);
  };

  // Logistics Log updates mutation
  const updateLogisticsLogMutation = useMutation({
    mutationFn: ({ eventId, payload }: { eventId: string; payload: any }) => updateLogisticsLogApi(eventId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['logisticsLog', selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setMessage(data.message || 'Logistics load checklist saved and audited successfully!');
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update load checklist.');
    }
  });

  // Filters Events by horizons matching specs
  const filteredEvents = events.filter((e) => {
    if (e.isDeleted) return false;
    const eventStartDate = new Date(e.eventDate.start);
    const eventEndDate = new Date(e.eventDate.end);
    const today = new Date();
    
    // Compute date differences
    const diffTimeStart = eventStartDate.getTime() - today.getTime();
    const diffDaysStart = Math.ceil(diffTimeStart / (1000 * 60 * 60 * 24));

    const diffTimeEnd = today.getTime() - eventEndDate.getTime();
    const diffDaysEnd = Math.ceil(diffTimeEnd / (1000 * 60 * 60 * 24));

    if (activeSubTab === 'upcoming') {
      // 2-day upcoming horizon: Event starts in next 2 days or starts today
      return diffDaysStart <= 2 && e.eventStatus !== 'CLOSED' && e.eventStatus !== 'RETURNED';
    } else {
      // 1-day past horizon: Event ended within past 1 day
      return diffDaysEnd <= 1 && diffDaysEnd >= 0;
    }
  });

  const selectedEvent = events.find((e) => e._id === selectedEventId);

  const addStaffMember = () => {
    if (newStaffName.trim() && !loadingStaff.includes(newStaffName.trim())) {
      setLoadingStaff([...loadingStaff, newStaffName.trim()]);
      setNewStaffName('');
    }
  };

  const removeStaffMember = (name: string) => {
    setLoadingStaff(loadingStaff.filter((s) => s !== name));
  };

  const addAdditionalItem = () => {
    if (!addCode.trim() || !addReferral.trim()) {
      setErrorMessage('Additional items MUST have a compulsory referral name!');
      return;
    }
    const exists = additionalItems.find((i) => i.itemCode === addCode.toUpperCase().trim());
    if (exists) {
      setErrorMessage(`Item code ${addCode.toUpperCase()} already added as additional!`);
      return;
    }
    setAdditionalItems([
      ...additionalItems,
      {
        itemCode: addCode.toUpperCase().trim(),
        quantity: Number(addQty),
        referredBy: addReferral.trim()
      }
    ]);
    setAddCode('');
    setAddQty('1');
    setAddReferral('');
    setErrorMessage(null);
  };

  const removeAdditionalItem = (code: string) => {
    setAdditionalItems(additionalItems.filter((i) => i.itemCode !== code));
  };

  const handleOutwardChecklistSave = (statusOverride?: 'DISPATCHED') => {
    if (!selectedEventId || !selectedEvent) return;

    // Build verifiedOut items array
    const verifiedOut = selectedEvent.items
      ?.filter((it: any) => checkedOutItems[it.itemId?._id || it.itemId])
      .map((it: any) => ({
        itemId: it.itemId?._id || it.itemId,
        quantity: it.quantity
      })) || [];

    // Shortages items list: items that are assigned to event but NOT loaded checkedOut
    const shortItemsList = selectedEvent.items
      ?.filter((it: any) => !checkedOutItems[it.itemId?._id || it.itemId])
      .map((it: any) => ({
        itemId: it.itemId?._id || it.itemId,
        quantity: it.quantity
      })) || [];

    const payload = {
      status: statusOverride || 'LOADING_OUT',
      loadingStaff,
      loadingVehicle: {
        vehicleNo,
        noOfLoads
      },
      verifiedOut,
      additionalItems,
      shortItems: shortItemsList,
      loadingCharges
    };

    updateLogisticsLogMutation.mutate({ eventId: selectedEventId, payload });
  };

  const handleInwardChecklistSave = (statusOverride?: 'COMPLETED') => {
    if (!selectedEventId || !selectedEvent) return;

    // Missing items: Items in event list that are NOT checked reloaded IN
    const missingItemsList = selectedEvent.items
      ?.filter((it: any) => !checkedInItems[it.itemId?._id || it.itemId])
      .map((it: any) => ({
        itemId: it.itemId?._id || it.itemId,
        quantity: it.quantity
      })) || [];

    const payload = {
      status: statusOverride || 'RELOADING_IN',
      reloadingStaff: loadingStaff,
      reloadingVehicle: {
        vehicleNo,
        noOfLoads
      },
      missingItems: missingItemsList,
      loadingCharges
    };

    updateLogisticsLogMutation.mutate({ eventId: selectedEventId, payload });
  };

  const handleStoreCopyPrint = () => {
    window.print();
  };

  return (
    <AuthGuard allowedRoles={['ADMIN', 'LOADING_STAFF']}>
      <div className="erp-readable min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col font-sans overflow-x-hidden">
        
        {/* Logistics Header */}
        <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-40 px-8 py-4 flex items-center justify-between shadow-sm print:hidden">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-indigo-600 rounded-full" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#4F46E5] to-[#06B6D4] bg-clip-text text-transparent">
              ONUS LOGISTICS BOARD
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-[#0F172A]">{user?.fullName || 'Logistics Specialist'}</p>
              <p className="text-xs text-indigo-600 uppercase tracking-widest font-bold">Crew {user?.role || 'LOADING_STAFF'}</p>
            </div>
            <Button 
              variant="danger" 
              onClick={logout}
              className="flex items-center gap-2 text-xs py-2 px-3.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </Button>
          </div>
        </header>

        {/* Dashboard Workspace */}
        <div className="max-w-6xl mx-auto w-full p-8 flex flex-col gap-6 print:p-0">
          
          {/* Notifications */}
          {message && <Alert message={message} type="success" onClose={() => setMessage(null)} />}
          {errorMessage && <Alert message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />}

          {/* Main Dashboard Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block">
            
            {/* Sidebar Column: Horizons Lists */}
            <div className="lg:col-span-1 flex flex-col gap-6 print:hidden">
              <Card className="p-0 border border-slate-200 shadow-sm overflow-hidden bg-white">
                {/* Horizontal Navigation SubTabs */}
                <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50/50">
                  <button
                    onClick={() => {
                      setActiveSubTab('upcoming');
                      setSelectedEventId(null);
                    }}
                    className={`py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition ${
                      activeSubTab === 'upcoming' 
                        ? 'border-indigo-600 text-indigo-600 bg-white' 
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    🚚 Upcoming (2-Day)
                  </button>
                  <button
                    onClick={() => {
                      setActiveSubTab('past');
                      setSelectedEventId(null);
                    }}
                    className={`py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition ${
                      activeSubTab === 'past' 
                        ? 'border-indigo-600 text-indigo-600 bg-white' 
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    ⏪ Past (1-Day)
                  </button>
                </div>

                {/* Horizon Events List */}
                <div className="flex flex-col max-h-[500px] overflow-y-auto divide-y divide-slate-100">
                  {eventsLoading ? (
                    <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Loading events...</div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-400 italic">No events scheduled in this horizon.</div>
                  ) : (
                    filteredEvents.map((ev) => {
                      const isSelected = selectedEventId === ev._id;
                      return (
                        <button
                          key={ev._id}
                          onClick={() => setSelectedEventId(ev._id)}
                          className={`w-full text-left p-4 transition flex justify-between items-center ${
                            isSelected ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-slate-50/50 bg-white'
                          }`}
                        >
                          <div className="flex flex-col gap-1 min-w-0 pr-2">
                            <span className="text-sm font-bold text-slate-800 truncate">{ev.customerName}</span>
                            <span className="text-[11px] text-slate-400 font-medium truncate">{ev.place}</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                {new Date(ev.eventDate.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {ev.eventStatus}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 shrink-0 transition ${isSelected ? 'text-indigo-600' : 'text-slate-300'}`} />
                        </button>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>

            {/* Main Content Workspace Column: Checklist forms */}
            <div className="lg:col-span-2 flex flex-col gap-6 print:w-full">
              {selectedEvent ? (
                <div className="flex flex-col gap-6">
                  
                  {/* Selected Event Details banner */}
                  <Card className="border border-indigo-100 bg-indigo-50/40 p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4 shadow-sm print:border-none print:shadow-none print:bg-white print:p-0">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">Active Dispatch Log Sheet</span>
                      <h2 className="text-xl font-extrabold text-slate-900 leading-tight">{selectedEvent.customerName}</h2>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {new Date(selectedEvent.eventDate.start).toDateString()}</span>
                        <span className="flex items-center gap-1">🕒 {selectedEvent.timeWindow?.start || '10:00'} - {selectedEvent.timeWindow?.end || '18:00'}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 shrink-0 print:hidden">
                      <Button
                        onClick={handleStoreCopyPrint}
                        className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                      >
                        <FileText className="w-4 h-4 text-slate-400" />
                        Print Store Copy Only
                      </Button>
                    </div>
                  </Card>

                  {/* Print Store Copy Only Watermark - Visible strictly in browser print */}
                  <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-6">
                    <h2 className="text-2xl font-black uppercase tracking-wider">ONUS EVENT LOGISTICS</h2>
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">INTERNAL STORE COPY ONLY — DO NOT DISTRIBUTE TO CUSTOMER</p>
                    <p className="text-[10px] text-slate-400 mt-1">Verified Logistics sheet for warehouse dispatch and loading audit trails</p>
                  </div>

                  {logLoading ? (
                    <div className="py-32 text-center flex flex-col items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                      <p className="text-xs text-slate-400">Loading verified log details...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      
                      {/* Checklists (Verified OUT / IN) */}
                      <Card className="p-6 bg-white border border-slate-200 shadow-sm print:border-none print:shadow-none">
                        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                          {activeSubTab === 'upcoming' ? '📦 LOADING dispatch checklist [OUT]' : '⏪ reloaded inventory checklist [IN]'}
                        </h3>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                                <th className="p-3">Item Description</th>
                                <th className="p-3">Item Code</th>
                                <th className="p-3 text-center">Qty</th>
                                <th className="p-3 pr-4 text-right print:hidden">Verify Verification Checkmark</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedEvent.items && selectedEvent.items.map((it: any) => {
                                const item = it.itemId;
                                if (!item) return null;

                                const isCheckedOut = !!checkedOutItems[item._id];
                                const isCheckedIn = !!checkedInItems[item._id];

                                return (
                                  <tr key={item._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                                    <td className="p-3 font-bold text-slate-800">{item.name}</td>
                                    <td className="p-3 font-mono text-indigo-600 font-bold">{item.itemCode}</td>
                                    <td className="p-3 text-center font-extrabold text-slate-800 text-sm">{it.quantity}</td>
                                    
                                    {/* Action verification checkbox */}
                                    <td className="p-3 pr-4 text-right print:hidden">
                                      {activeSubTab === 'upcoming' ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setCheckedOutItems({
                                              ...checkedOutItems,
                                              [item._id]: !isCheckedOut
                                            });
                                          }}
                                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition flex items-center gap-1.5 ml-auto cursor-pointer ${
                                            isCheckedOut 
                                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                              : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                                          }`}
                                        >
                                          <CheckSquare className="w-3.5 h-3.5" />
                                          {isCheckedOut ? 'Loaded OUT ✓' : 'Unchecked'}
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setCheckedInItems({
                                              ...checkedInItems,
                                              [item._id]: !isCheckedIn
                                            });
                                          }}
                                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition flex items-center gap-1.5 ml-auto cursor-pointer ${
                                            isCheckedIn 
                                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                              : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                                          }`}
                                        >
                                          <CheckSquare className="w-3.5 h-3.5" />
                                          {isCheckedIn ? 'Reloaded IN ✓' : 'Unchecked'}
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </Card>

                      {/* Outward Specific forms: Additional / Shortages */}
                      {activeSubTab === 'upcoming' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
                          {/* Additional Items Log with compulsory referrals */}
                          <Card className="p-6 bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">
                              <Plus className="w-4 h-4 text-indigo-600" /> Additional items allocation
                            </div>

                            <div className="flex flex-col gap-3">
                              <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Item Code</label>
                                  <input 
                                    type="text" 
                                    placeholder="RNT-101"
                                    value={addCode}
                                    onChange={(e) => setAddCode(e.target.value)}
                                    className="glow-input w-full uppercase text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Qty</label>
                                  <input 
                                    type="number" 
                                    min="1"
                                    value={addQty}
                                    onChange={(e) => setAddQty(e.target.value)}
                                    className="glow-input w-full text-xs text-center"
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-1">Referred By (Compulsory Referral) *</label>
                                <input 
                                  type="text" 
                                  placeholder="Jane Admin / Akhil Sales"
                                  value={addReferral}
                                  onChange={(e) => setAddReferral(e.target.value)}
                                  className="glow-input w-full text-xs"
                                />
                              </div>

                              <Button
                                type="button"
                                onClick={addAdditionalItem}
                                className="w-full text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 py-2.5 font-bold flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add Additional Item
                              </Button>
                            </div>

                            {/* Additional list */}
                            {additionalItems.length > 0 && (
                              <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100 max-h-[150px] overflow-y-auto">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Added items list:</span>
                                {additionalItems.map((item) => (
                                  <div key={item.itemCode} className="flex justify-between items-center text-xs text-slate-600 bg-white border border-slate-150 p-2 rounded">
                                    <div>
                                      <span className="font-bold text-slate-800">{item.itemCode}</span> • Qty: <strong>{item.quantity}</strong>
                                      <p className="text-[10px] text-slate-400 font-medium">Ref: {item.referredBy}</p>
                                    </div>
                                    <button 
                                      onClick={() => removeAdditionalItem(item.itemCode)}
                                      className="text-red-500 hover:text-red-700 transition cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </Card>

                          {/* Shortages list */}
                          <Card className="p-6 bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">
                              <AlertCircle className="w-4 h-4 text-red-500" /> Shortages registry
                            </div>

                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs flex flex-col gap-2 max-h-[250px] overflow-y-auto">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Computed Shortage items:</span>
                              {selectedEvent.items?.filter((it: any) => !checkedOutItems[it.itemId?._id || it.itemId]).map((it: any) => (
                                <div key={it.itemId?._id} className="flex justify-between items-center text-slate-600 bg-white border border-slate-150 p-2.5 rounded shadow-sm">
                                  <span className="font-bold text-slate-800">{it.itemId?.name}</span>
                                  <span className="bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded font-black text-xs">Qty: {it.quantity}</span>
                                </div>
                              ))}
                              {selectedEvent.items?.filter((it: any) => !checkedOutItems[it.itemId?._id || it.itemId]).length === 0 && (
                                <div className="text-center py-6 text-slate-400 italic">No shortages computed. All items marked loaded!</div>
                              )}
                            </div>
                          </Card>
                        </div>
                      )}

                      {/* Inward Specific Forms: Missing registry */}
                      {activeSubTab === 'past' && (
                        <div className="grid grid-cols-1 gap-6 print:hidden">
                          <Card className="p-6 bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">
                              <AlertCircle className="w-4 h-4 text-red-500" /> Missing / Lost Items Registry
                            </div>

                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Computed Missing Items:</span>
                              {selectedEvent.items?.filter((it: any) => !checkedInItems[it.itemId?._id || it.itemId]).map((it: any) => (
                                <div key={it.itemId?._id} className="flex justify-between items-center text-slate-600 bg-white border border-slate-150 p-2.5 rounded shadow-sm">
                                  <span className="font-bold text-slate-800">{it.itemId?.name}</span>
                                  <span className="bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded font-black text-xs">Missing Qty: {it.quantity}</span>
                                </div>
                              ))}
                              {selectedEvent.items?.filter((it: any) => !checkedInItems[it.itemId?._id || it.itemId]).length === 0 && (
                                <div className="text-center py-6 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 rounded">
                                  ✓ Excellent! All stocks returned and reloaded successfully!
                                </div>
                              )}
                            </div>
                          </Card>
                        </div>
                      )}

                      {/* Team & Logistics Vehicle configurations */}
                      <Card className="p-6 bg-white border border-slate-200 shadow-sm flex flex-col gap-4 print:border-none print:shadow-none">
                        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">
                          🚛 Crew & Vehicle allocations
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          
                          {/* Staff selection */}
                          <div className="flex flex-col gap-2 print:hidden">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Specialists crew</label>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                placeholder="Staff Name"
                                value={newStaffName}
                                onChange={(e) => setNewStaffName(e.target.value)}
                                className="glow-input flex-1 text-xs"
                              />
                              <Button
                                onClick={addStaffMember}
                                className="bg-indigo-600 text-white font-bold"
                              >
                                Add
                              </Button>
                            </div>

                            <div className="flex flex-wrap gap-1.5 mt-2 max-h-[120px] overflow-y-auto p-1 border border-slate-100 rounded">
                              {loadingStaff.map((name) => (
                                <span key={name} className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-full shrink-0">
                                  {name}
                                  <button onClick={() => removeStaffMember(name)} className="text-slate-400 hover:text-red-500 font-black cursor-pointer text-[8px]">✕</button>
                                </span>
                              ))}
                              {loadingStaff.length === 0 && (
                                <span className="text-[10px] text-slate-400 italic">No crew assigned yet.</span>
                              )}
                            </div>
                          </div>

                          {/* Print layout Crew Display */}
                          <div className="hidden print:block text-xs border-r border-slate-200 pr-4">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Logistics Crew</span>
                            <p className="font-semibold text-slate-800 mt-1">{loadingStaff.join(', ') || 'No crew assigned'}</p>
                          </div>

                          {/* Vehicle Details */}
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Vehicle Number</label>
                            <input 
                              type="text" 
                              placeholder="KL-07-CD-1234"
                              value={vehicleNo}
                              onChange={(e) => setVehicleNo(e.target.value)}
                              className="glow-input text-xs font-mono font-bold"
                            />
                          </div>

                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Number of Loads</label>
                            <input 
                              type="number" 
                              min="1"
                              value={noOfLoads}
                              onChange={(e) => setNoOfLoads(Number(e.target.value))}
                              className="glow-input text-xs font-bold text-center"
                            />
                          </div>

                          <div className="flex flex-col gap-2 print:hidden">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Loading Charges (₹)</label>
                            <input 
                              type="number" 
                              min="0"
                              value={loadingCharges}
                              onChange={(e) => setLoadingCharges(Number(e.target.value))}
                              className="glow-input text-xs font-bold text-right"
                            />
                          </div>

                        </div>
                      </Card>

                      {/* Modification Audit History (Image 5 modification log check) */}
                      {logisticsLog?.modifiedBy && logisticsLog.modifiedBy.length > 0 && (
                        <Card className="p-6 bg-slate-50 border border-slate-200 shadow-sm print:hidden flex flex-col gap-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200/50 pb-2">
                            <Info className="w-4 h-4 text-indigo-500" /> Logistics Modification Logs (Accountability Trail)
                          </div>

                          <div className="flex flex-col gap-3 max-h-[160px] overflow-y-auto text-[11px] leading-relaxed text-slate-500">
                            {logisticsLog.modifiedBy.map((trail: any, idx: number) => (
                              <div key={idx} className="flex gap-2 border-b border-slate-100 last:border-0 pb-2.5">
                                <span className="font-black text-slate-700 shrink-0 uppercase tracking-wide bg-slate-200/60 px-2 py-0.5 rounded text-[9px] h-fit">
                                  {trail.userId?.name || 'Loader'}
                                </span>
                                <div>
                                  <p className="font-semibold text-slate-600">{trail.changeDetails}</p>
                                  <span className="text-[9px] text-slate-400">{new Date(trail.modifiedAt).toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}

                      {/* Print Layout Signature Section strictly for Store Copy */}
                      <div className="hidden print:grid grid-cols-2 mt-16 pt-8 text-[10px] border-t border-dashed border-slate-300">
                        <div className="flex flex-col justify-end gap-1">
                          <p className="font-bold uppercase tracking-wider text-slate-500">Verified Dispatcher Crew Sign-off</p>
                          <div className="w-40 h-8 border-b border-slate-300 mt-2" />
                          <p className="italic text-slate-400 mt-1">{loadingStaff[0] || 'Loading crew head'}</p>
                        </div>
                        <div className="flex flex-col items-end justify-end gap-1">
                          <p className="font-bold uppercase tracking-wider text-slate-500">Store Master Verification Seal</p>
                          <div className="w-24 h-12 border border-slate-200 bg-slate-50 rounded flex items-center justify-center font-mono text-[9px] text-indigo-500 border-dashed mt-2 font-bold uppercase tracking-wider">
                            LOGISTICS DISPATCHED
                          </div>
                        </div>
                      </div>

                      {/* Form submission controls */}
                      <div className="flex justify-between border-t border-[#E2E8F0] pt-6 print:hidden">
                        {activeSubTab === 'upcoming' ? (
                          <>
                            <Button
                              onClick={() => handleOutwardChecklistSave()}
                              disabled={updateLogisticsLogMutation.isPending}
                              className="bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 text-xs px-6 font-bold"
                            >
                              {updateLogisticsLogMutation.isPending ? 'Saving...' : '💾 Save load checklist draft'}
                            </Button>
                            
                            <Button
                              onClick={() => handleOutwardChecklistSave('DISPATCHED')}
                              disabled={updateLogisticsLogMutation.isPending}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-8 font-bold flex items-center gap-1.5"
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
                              className="bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 text-xs px-6 font-bold"
                            >
                              {updateLogisticsLogMutation.isPending ? 'Saving...' : '💾 Save reload checklist draft'}
                            </Button>
                            
                            <Button
                              onClick={() => handleInwardChecklistSave('COMPLETED')}
                              disabled={updateLogisticsLogMutation.isPending}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-8 font-bold flex items-center gap-1.5"
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
                <div className="py-24 text-center flex flex-col items-center justify-center gap-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                    <Truck className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-base">Select Event Dispatch Schedule</h3>
                  <p className="text-xs text-slate-400 max-w-sm">Please select a scheduled event in the left side-bar to audit and verify warehouse loading checkmarks.</p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </AuthGuard>
  );
}
