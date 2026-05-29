"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  LogOut,
  Menu,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
  MapPin,
  AlertCircle,
  Layers,
  User,
  Users,
  Mail,
  Phone,
  Activity,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { Field, SectionCard, SelectInput, SimpleButton, TextInput } from '../../components/representative/RepresentativeUI';
import { PrintSlipTemplate } from '../../components/representative/PrintSlipTemplate';
import { TimeRangePickerModal } from '../../components/ui/TimeRangePickerModal';
import {
  DepartmentKey,
  MenuKey,
  departments,
  programTypes,
  representativeMenuItems
} from '../../components/representative/representativeShared';
import {
  getEventsApi,
  getInventoryApi,
  getCustomersApi,
  createEventApi,
  updateEventApi,
  deleteEventApi,
  confirmDepartmentApi,
  createBillingDocumentApi,
  convertQuotationToInvoiceApi,
  getGroupsApi,
  ItemGroup
} from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Item, Event } from '../../types';

export default function SalesRepresentativeModule({
  initialTab,
  hideLayout = false
}: {
  initialTab?: MenuKey;
  hideLayout?: boolean;
} = {}) {
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const [activeMenu, setActiveMenu] = useState<MenuKey>(initialTab || 'dashboard');

  const switchTab = (tab: MenuKey) => {
    setActiveMenu(tab);
    if (!hideLayout && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState(null, '', url.pathname + url.search);
    }
  };

  useEffect(() => {
    if (initialTab) {
      setActiveMenu(initialTab);
    } else if (!hideLayout && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) {
        setActiveMenu(tab as MenuKey);
      }
    }
  }, [initialTab, hideLayout]);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Search/Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  
  // Past events filtering
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // One week ago
  const [dateTo, setDateTo] = useState(todayStr);

  // Free stock filtering
  const [freeStockDept, setFreeStockDept] = useState('All Departments');
  const [freeStockDateFrom, setFreeStockDateFrom] = useState(todayStr);
  const [freeStockDateTo, setFreeStockDateTo] = useState(todayStr);
  const [freeStockTimeFrom, setFreeStockTimeFrom] = useState('09:00');
  const [freeStockTimeTo, setFreeStockTimeTo] = useState('18:00');
  const [freeStockSearch, setFreeStockSearch] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedViewEvent, setSelectedViewEvent] = useState<Event | null>(null);
  const [isSetupTimeModalOpen, setIsSetupTimeModalOpen] = useState(false);

  // Customer accounts State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  // Modals / Confirmations
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [currentEditingEvent, setCurrentEditingEvent] = useState<Partial<Event> | null>(null);
  const [selectedPrintType, setSelectedPrintType] = useState<'OFFICE_COPY' | 'CUSTOMER_COPY' | 'CUSTOMER_COPY_EXTRA' | 'STORE_COPY' | 'DEPARTMENT_COPY'>('OFFICE_COPY');
  const [selectedPrintDept, setSelectedPrintDept] = useState<DepartmentKey>('RENTAL_ITEMS');
  const [activeSearchDept, setActiveSearchDept] = useState<DepartmentKey | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  // Load Data using react-query
  const { data: events = [], refetch: refetchEvents } = useQuery({
    queryKey: ['events', activeMenu, search, statusFilter, dateFilter, dateFrom, dateTo],
    queryFn: () => {
      if (activeMenu === 'past-events') {
        return getEventsApi({ fromDate: dateFrom, toDate: dateTo, search: search || undefined });
      }
      return getEventsApi({ search: search || undefined, status: statusFilter !== 'All' ? statusFilter : undefined });
    }
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => getInventoryApi()
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', activeMenu],
    queryFn: getCustomersApi
  });

  // Load groups dynamically from backend (admin-created + default)
  const { data: dynamicGroups = [] } = useQuery<ItemGroup[]>({
    queryKey: ['groups'],
    queryFn: () => getGroupsApi(false),
    placeholderData: []
  });

  // Use dynamic groups if loaded, else fall back to hardcoded defaults
  const activeDepartments = dynamicGroups.length > 0
    ? dynamicGroups
    : departments.map(d => ({ ...d, _id: d.key, color: '#3b82f6', sortOrder: 0, isActive: true, isDefault: true } as any));

  // Query inventory with availability for current edit event dates or free stock filters
  const editEventStart = currentEditingEvent?.eventDate?.start ? new Date(currentEditingEvent.eventDate.start).toISOString() : '';
  const editEventEnd = currentEditingEvent?.eventDate?.end ? new Date(currentEditingEvent.eventDate.end).toISOString() : '';

  const { data: inventoryWithAvailability = [] } = useQuery({
    queryKey: ['inventory-availability', editEventStart, editEventEnd],
    queryFn: () => getInventoryApi({ startDate: editEventStart, endDate: editEventEnd }),
    enabled: !!editEventStart && !!editEventEnd
  });

  // Query inventory with availability for free stock tab
  const freeStockStart = `${freeStockDateFrom}T${freeStockTimeFrom}:00`;
  const freeStockEnd = `${freeStockDateTo}T${freeStockTimeTo}:00`;
  const { data: freeStockInventory = [], isLoading: freeStockLoading } = useQuery({
    queryKey: ['free-stock-inventory', freeStockDept, freeStockStart, freeStockEnd, freeStockSearch],
    queryFn: () => getInventoryApi({
      department: freeStockDept !== 'All Departments' ? freeStockDept : undefined,
      startDate: freeStockStart,
      endDate: freeStockEnd,
      search: freeStockSearch || undefined
    }),
    enabled: activeMenu === 'free-stock'
  });

  // Filter lists based on states
  const upcomingEvents = useMemo(() => {
    return events.filter(e => {
      const eventDate = new Date(e.eventDate.start).toISOString().split('T')[0];
      return eventDate >= todayStr && e.eventStatus !== 'CLOSED';
    });
  }, [events, todayStr]);

  const pastEventsList = useMemo(() => {
    return events.filter(e => {
      const eventDate = new Date(e.eventDate.start).toISOString().split('T')[0];
      return eventDate < todayStr || e.eventStatus === 'CLOSED';
    });
  }, [events, todayStr]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || customers[0] || null;
  }, [customers, selectedCustomerId]);

  const customerEvents = useMemo(() => {
    if (!selectedCustomer) return [];
    return events.filter(e => e.customerName.toLowerCase() === selectedCustomer.name.toLowerCase());
  }, [events, selectedCustomer]);

  // Mutations
  const createEventMutation = useMutation({
    mutationFn: createEventApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-availability'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      switchTab('upcoming-events');
      setCurrentEditingEvent(null);
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to create event');
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateEventApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-availability'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      switchTab('upcoming-events');
      setCurrentEditingEvent(null);
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to update event');
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: deleteEventApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-availability'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setConfirmDeleteId(null);
    }
  });

  const confirmDeptMutation = useMutation({
    mutationFn: ({ eventId, dept }: { eventId: string; dept: string }) => confirmDepartmentApi(eventId, dept),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-availability'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      if (currentEditingEvent?._id) {
        // Trigger local state updates to show checked department instantly
        const newConfirmations = { ...currentEditingEvent.confirmations };
        newConfirmations[variables.dept] = { 
          confirmed: true, 
          confirmedBy: { name: user?.fullName || user?.name || 'You' }, 
          confirmedAt: new Date() 
        };
        setCurrentEditingEvent({ ...currentEditingEvent, confirmations: newConfirmations });
      }
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to confirm department');
    }
  });

  // Event Items CRUD for Create/Edit workflow
  const [eventItems, setEventItems] = useState<Array<{ itemId: string; quantity: number; description?: string; unitRate?: number; discountType?: 'FLAT' | 'PERCENTAGE'; discountValue?: number; gstRate?: number }>>([]);
  const [confirmingDepts, setConfirmingDepts] = useState<Record<string, boolean>>({});

  const formatTimeHHMM = (timeStr?: string) => {
    if (!timeStr) return '';
    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const hour = match[1].padStart(2, '0');
      const min = match[2];
      return `${hour}:${min}`;
    }
    return timeStr;
  };

  const openSetupTimeModal = () => {
    if (!currentEditingEvent) return;

    setIsSetupTimeModalOpen(true);
  };

  const handleSetupTimeSave = (start: string, end: string) => {
    if (!currentEditingEvent) return;

    const newConfirmations = { ...currentEditingEvent.confirmations };
    Object.keys(newConfirmations).forEach((key) => {
      newConfirmations[key] = { ...newConfirmations[key], confirmed: false };
    });

    setCurrentEditingEvent({
      ...currentEditingEvent,
      timeWindow: { start, end },
      confirmations: newConfirmations
    });
  };

  useEffect(() => {
    if (activeMenu !== 'create-event' || currentEditingEvent) return;

    setCurrentEditingEvent({
      customerName: '',
      eventDate: { start: todayStr, end: todayStr },
      timeWindow: { start: '09:00', end: '18:00' },
      place: '',
      program: 'Wedding',
      eventStatus: 'INQUIRY'
    });
    setEventItems([]);
  }, [activeMenu, currentEditingEvent, todayStr]);

  const addEventItem = (department: DepartmentKey) => {
    setEventItems([...eventItems, { itemId: '', quantity: 1, tempDepartment: department, discountType: 'FLAT', discountValue: 0, gstRate: 18 } as any]);
    
    // Automatically reset confirmation for this department since new items are added
    if (currentEditingEvent?.confirmations?.[department]?.confirmed) {
      const newConfirmations = { ...currentEditingEvent.confirmations };
      newConfirmations[department] = { ...newConfirmations[department], confirmed: false };
      setCurrentEditingEvent({ ...currentEditingEvent, confirmations: newConfirmations });
    }
  };

  const updateEventItem = (index: number, patch: Partial<(typeof eventItems)[0]>) => {
    const updated = [...eventItems];
    const oldItem = updated[index];
    updated[index] = { ...updated[index], ...patch };
    
    // Auto-fill from inventory selection
    if (patch.itemId) {
      const activeInventory = inventoryWithAvailability.length ? inventoryWithAvailability : inventoryItems;
      const matching = activeInventory.find(i => i._id === patch.itemId || i.id === patch.itemId);
      if (matching) {
        updated[index].description = matching.name;
        updated[index].unitRate = matching.rentalRate;
      }
    }
    setEventItems(updated);

    // Auto-reset confirmation status of the affected department
    const activeInventory = inventoryWithAvailability.length ? inventoryWithAvailability : inventoryItems;
    const itemRef = patch.itemId 
      ? activeInventory.find(i => i._id === patch.itemId || i.id === patch.itemId) 
      : activeInventory.find(i => i._id === oldItem.itemId || i.id === oldItem.itemId);
    const dept = itemRef?.department || (oldItem as any).tempDepartment;
    if (dept && currentEditingEvent?.confirmations?.[dept]?.confirmed) {
      const newConfirmations = { ...currentEditingEvent.confirmations };
      newConfirmations[dept] = { ...newConfirmations[dept], confirmed: false };
      setCurrentEditingEvent({ ...currentEditingEvent, confirmations: newConfirmations });
    }
  };

  const removeEventItem = (index: number) => {
    const itemToRemove = eventItems[index];
    setEventItems(eventItems.filter((_, i) => i !== index));

    // Auto-reset confirmation status of the affected department
    const activeInventory = inventoryWithAvailability.length ? inventoryWithAvailability : inventoryItems;
    const dbItem = activeInventory.find(i => i._id === itemToRemove.itemId || i.id === itemToRemove.itemId);
    const dept = dbItem?.department || (itemToRemove as any).tempDepartment;
    if (dept && currentEditingEvent?.confirmations?.[dept]?.confirmed) {
      const newConfirmations = { ...currentEditingEvent.confirmations };
      newConfirmations[dept] = { ...newConfirmations[dept], confirmed: false };
      setCurrentEditingEvent({ ...currentEditingEvent, confirmations: newConfirmations });
    }
  };

  const handleConfirmDept = async (deptKey: string) => {
    if (!currentEditingEvent?._id) return;

    setConfirmingDepts(prev => ({ ...prev, [deptKey]: true }));

    // Filter out unselected empty rows
    const validItems = eventItems.filter(i => i.itemId);

    const payload = {
      customerName: currentEditingEvent.customerName,
      eventDate: currentEditingEvent.eventDate,
      timeWindow: currentEditingEvent.timeWindow || { start: '09:00', end: '18:00' },
      place: currentEditingEvent.place || 'Main Venue',
      program: currentEditingEvent.program || 'General',
      items: validItems.map(i => ({ itemId: i.itemId, quantity: i.quantity })),
      eventStatus: currentEditingEvent.eventStatus || 'INQUIRY'
    };

    try {
      await updateEventApi(currentEditingEvent._id, payload);
      confirmDeptMutation.mutate(
        { eventId: currentEditingEvent._id, dept: deptKey },
        {
          onSettled: () => {
            setConfirmingDepts(prev => ({ ...prev, [deptKey]: false }));
          }
        }
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update event details before confirmation');
      setConfirmingDepts(prev => ({ ...prev, [deptKey]: false }));
    }
  };

  // Group current selections by department (using dynamic groups)
  const groupedItemsForEdit = useMemo(() => {
    const groups: Record<string, typeof eventItems> = {};
    activeDepartments.forEach(d => {
      groups[d.key] = [];
    });

    eventItems.forEach((item, index) => {
      const activeInventory = inventoryWithAvailability.length ? inventoryWithAvailability : inventoryItems;
      const dbItem = activeInventory.find(i => i._id === item.itemId || i.id === item.itemId);
      const dept = (dbItem?.department || (item as any).tempDepartment || 'RENTAL_ITEMS') as string;
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push({ ...item, originalIndex: index } as any);
    });

    return groups;
  }, [eventItems, inventoryItems, inventoryWithAvailability, activeDepartments]);

  // Load event to edit mode
  const handleStartEdit = (event: Event) => {
    setCurrentEditingEvent({
      ...event,
      timeWindow: event.timeWindow || { start: '09:00', end: '18:00' }
    });
    const mappedItems = (event.items || []).map(i => ({
      itemId: (i.itemId as any)?._id || (i.itemId as any),
      quantity: i.quantity,
      description: (i.itemId as any)?.name || '',
      unitRate: (i.itemId as any)?.rentalRate || 0,
      discountType: 'FLAT' as const,
      discountValue: 0,
      gstRate: 18
    }));
    setEventItems(mappedItems);
    switchTab('create-event');
  };

  // Setup print config modal without redirecting
  const handleStartPrint = (event: Event) => {
    setCurrentEditingEvent({
      ...event,
      timeWindow: event.timeWindow || { start: '09:00', end: '18:00' }
    });
    const mappedItems = (event.items || []).map(i => ({
      itemId: (i.itemId as any)?._id || (i.itemId as any),
      quantity: i.quantity,
      description: (i.itemId as any)?.name || '',
      unitRate: (i.itemId as any)?.rentalRate || 0,
      discountType: 'FLAT' as const,
      discountValue: 0,
      gstRate: 18
    }));
    setEventItems(mappedItems);
    setIsPrintModalOpen(true);
  };

  const handleAddFromModal = (selectedItem: Item) => {
    const itemId = selectedItem._id || selectedItem.id || '';
    const existsIdx = eventItems.findIndex(i => i.itemId === itemId);
    if (existsIdx > -1) {
      const updated = [...eventItems];
      updated[existsIdx].quantity += 1;
      setEventItems(updated);
    } else {
      setEventItems([...eventItems, {
        itemId,
        quantity: 1,
        description: selectedItem.name,
        unitRate: selectedItem.rentalRate || selectedItem.saleRate || 0,
        discountType: 'FLAT',
        discountValue: 0,
        gstRate: 18
      }]);
    }

    // Auto-reset confirmation status of the added item's department
    const dept = selectedItem.department;
    if (dept && currentEditingEvent?.confirmations?.[dept]?.confirmed) {
      const newConfirmations = { ...currentEditingEvent.confirmations };
      newConfirmations[dept] = { ...newConfirmations[dept], confirmed: false };
      setCurrentEditingEvent({ ...currentEditingEvent, confirmations: newConfirmations });
    }

    setActiveSearchDept(null);
  };

  // Pricing Engine calculations for UI preview
  const pricingPreview = useMemo(() => {
    let subTotal = 0;
    let discountTotal = 0;
    let gstTotal = 0;
    
    const lines = eventItems.map(line => {
      const qty = line.quantity || 1;
      const rate = line.unitRate || 0;
      const gross = qty * 1 * rate; // 1 day default in simple checkout
      const discount = line.discountType === 'PERCENTAGE'
        ? gross * ((line.discountValue || 0) / 100)
        : (line.discountValue || 0);
      const taxable = Math.max(0, gross - discount);
      const gst = taxable * ((line.gstRate || 18) / 100);
      const total = taxable + gst;

      subTotal += gross;
      discountTotal += discount;
      gstTotal += gst;

      return {
        ...line,
        taxable,
        gst,
        total
      };
    });

    return {
      lines,
      subTotal,
      discountTotal,
      taxableTotal: subTotal - discountTotal,
      gstTotal,
      grandTotal: subTotal - discountTotal + gstTotal
    };
  }, [eventItems]);

  // Dynamic Pricing Engine for read-only View Details Modal
  const viewEventTotals = useMemo(() => {
    if (!selectedViewEvent) return { subTotal: 0, tax: 0, grandTotal: 0 };
    let subTotal = 0;
    (selectedViewEvent.items || []).forEach(itemRef => {
      const dbItem = itemRef.itemId as any;
      if (dbItem) {
        subTotal += itemRef.quantity * (dbItem.rentalRate || 0);
      }
    });
    const tax = subTotal * 0.18;
    return {
      subTotal,
      tax,
      grandTotal: subTotal + tax
    };
  }, [selectedViewEvent]);

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEditingEvent?.customerName) {
      alert('Customer Name is required');
      return;
    }

    const activeInventory = inventoryWithAvailability.length ? inventoryWithAvailability : inventoryItems;
    const shortages: string[] = [];
    const sufficientStockItems: string[] = [];

    // Filter out unselected empty rows
    const validItems = eventItems.filter(i => i.itemId);

    validItems.forEach(i => {
      const match = activeInventory.find(inv => inv._id === i.itemId || inv.id === i.itemId);
      if (match) {
        const avail = (match as any).availableStock ?? match.currentStock;
        if (i.quantity > avail) {
          shortages.push(`${match.name} (Requested: ${i.quantity}, Available: ${avail})`);
        } else {
          sufficientStockItems.push(`${match.name} (Requested: ${i.quantity}, In Stock: ${avail})`);
        }
      }
    });

    if (shortages.length > 0) {
      const confirmProceed = window.confirm(
        `⚠️ Inventory Shortage Warning:\n\n` +
        `The requested quantity exceeds the available stock for the following items:\n` +
        shortages.map(s => `- ${s}`).join('\n') +
        `\n\nDo you still want to proceed with reserving these items anyway?`
      );
      if (!confirmProceed) return;
    } else if (sufficientStockItems.length > 0) {
      // Satisfy "If quantity is less than stock, show confirmation/alert"
      const confirmProceed = window.confirm(
        `✅ Stock Level Verification:\n\n` +
        `All selected items are fully in stock and reserved quantities are below available limits!\n\n` +
        `Are you sure you want to lock these reservations and save the event details?`
      );
      if (!confirmProceed) return;
    }
    
    const payload = {
      customerName: currentEditingEvent.customerName,
      eventDate: currentEditingEvent.eventDate,
      timeWindow: currentEditingEvent.timeWindow || { start: '09:00', end: '18:00' },
      place: currentEditingEvent.place || 'Main Venue',
      program: currentEditingEvent.program || 'General',
      items: validItems.map(i => ({ itemId: i.itemId, quantity: i.quantity })),
      eventStatus: currentEditingEvent.eventStatus || 'INQUIRY'
    };

    if (currentEditingEvent._id) {
      updateEventMutation.mutate({ id: currentEditingEvent._id, payload });
    } else {
      createEventMutation.mutate(payload);
    }
  };

  // Printing Filter calculations
  const printItemsFiltered = useMemo(() => {
    if (!currentEditingEvent) return [];
    
    // Map live selected eventItems to the same structure as populated items
    const activeInventory = inventoryWithAvailability.length ? inventoryWithAvailability : inventoryItems;
    
    const mappedItems = eventItems.map(item => {
      const dbItem = activeInventory.find(i => i._id === item.itemId || i.id === item.itemId);
      return {
        itemId: dbItem || {
          _id: item.itemId,
          name: item.description || 'Unknown Item',
          rentalRate: item.unitRate || 0,
          department: (item as any).tempDepartment || 'RENTAL_ITEMS'
        },
        quantity: item.quantity
      };
    });

    return mappedItems.filter(itemRef => {
      const dbItem = itemRef.itemId as any;
      if (!dbItem) return false;

      // Strictly only allow items from confirmed departments to show up in print
      const deptConf = currentEditingEvent.confirmations?.[dbItem.department];
      const isConfirmed = deptConf && deptConf.confirmed;
      if (!isConfirmed) return false;

      if (selectedPrintType === 'DEPARTMENT_COPY') {
        // ONLY the selected department
        return dbItem.department === selectedPrintDept;
      }
      return true;
    });
  }, [currentEditingEvent, eventItems, inventoryItems, inventoryWithAvailability, selectedPrintType, selectedPrintDept]);

  const printTotals = useMemo(() => {
    let subTotal = 0;
    printItemsFiltered.forEach(itemRef => {
      const dbItem = itemRef.itemId as any;
      if (dbItem) {
        subTotal += itemRef.quantity * dbItem.rentalRate;
      }
    });
    const tax = subTotal * 0.18;
    return {
      subTotal,
      tax,
      grandTotal: subTotal + tax
    };
  }, [printItemsFiltered]);

  const anyDeptConfirmed = useMemo(() => {
    if (!currentEditingEvent?.confirmations) return false;
    return Object.values(currentEditingEvent.confirmations).some((c: any) => c.confirmed);
  }, [currentEditingEvent?.confirmations]);

  const screenContent = (
        <div className="space-y-6">

          {/* SCREEN 1: DASHBOARD (HOME) */}
          {activeMenu === 'dashboard' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{hideLayout ? 'Dashboard' : 'Sales Representative Dashboard'}</h2>
                  <p className="text-sm text-slate-500 font-medium">Quick overview of upcoming bookings, statistics, and pending quotations.</p>
                </div>
                {!hideLayout && (
                <SimpleButton
                  onClick={() => {
                    setCurrentEditingEvent({
                      customerName: '',
                      eventDate: { start: todayStr, end: todayStr },
                      timeWindow: { start: '09:00', end: '18:00' },
                      place: '',
                      program: 'Wedding',
                      eventStatus: 'INQUIRY'
                    });
                    setEventItems([]);
                    switchTab('create-event');
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Create New Booking
                </SimpleButton>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Upcoming Bookings</p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900">{upcomingEvents.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Active Clients</p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900">{customers.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Draft Inquiries</p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900">{events.filter(e => e.eventStatus === 'INQUIRY').length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Active Inventory Items</p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900">{inventoryItems.length}</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <SectionCard title="Recent Active Bookings">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/70 text-xs uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Client Name</th>
                            <th className="px-4 py-3 font-semibold">Venue / Place</th>
                            <th className="px-4 py-3 font-semibold">Event Date</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {events.slice(0, 5).map((event) => (
                            <tr key={event._id} className="border-t border-slate-100 hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-bold text-slate-900">{event.customerName}</td>
                              <td className="px-4 py-3 text-slate-600">{event.place}</td>
                              <td className="px-4 py-3 text-slate-600">
                                {new Date(event.eventDate.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  event.eventStatus === 'CONFIRMED' || event.eventStatus === 'APPROVED'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}>
                                  {event.eventStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {events.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-medium">No events currently scheduled.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                </div>

                <div>
                  <SectionCard title="Upcoming Overviews">
                    <div className="space-y-3">
                      {upcomingEvents.slice(0, 4).map((event) => (
                        <div key={event._id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 hover:border-blue-100 hover:bg-blue-50/10 transition-all">
                          <p className="font-bold text-slate-900">{event.customerName}</p>
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                            <Calendar className="h-3.5 w-3.5 text-blue-500" />
                            {new Date(event.eventDate.start).toLocaleDateString('en-IN')}
                            <MapPin className="ml-2 h-3.5 w-3.5 text-red-400" />
                            {event.place}
                          </div>
                          <p className="mt-1 text-xs text-slate-500 font-medium">{event.program}</p>
                        </div>
                      ))}
                      {upcomingEvents.length === 0 && (
                        <p className="text-center text-sm text-slate-400 font-medium py-10">No upcoming events scheduled.</p>
                      )}
                    </div>
                  </SectionCard>
                </div>
              </div>
            </>
          )}

          {/* SCREEN 2: CREATE & EDIT EVENTS */}
          {activeMenu === 'create-event' && currentEditingEvent && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    {currentEditingEvent._id ? 'Edit Event Booking Details' : 'Create New Event Inquiry'}
                  </h2>
                  <p className="text-sm text-slate-500 font-medium">Enter customer demographics, reserve inventory dates, and verify stocks.</p>
                </div>
                <div className="flex items-center gap-3">
                  <SimpleButton
                    type="submit"
                    form="event-booking-form"
                    disabled={createEventMutation.isPending || updateEventMutation.isPending}
                    variant="primary"
                    className="flex items-center gap-1.5"
                  >
                    {currentEditingEvent._id ? 'Update Active Booking' : 'Register Draft Inquiry'}
                  </SimpleButton>
                  {currentEditingEvent._id && (
                    <SimpleButton
                      type="button"
                      onClick={() => setIsPrintModalOpen(true)}
                      variant="secondary"
                      className="flex items-center gap-1.5"
                    >
                      <Printer className="w-4 h-4 text-blue-600 animate-pulse" />
                      Configure & Print Slip
                    </SimpleButton>
                  )}
                </div>
              </div>

              <form id="event-booking-form" onSubmit={handleSaveEvent} className="grid gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2 space-y-6">
                  
                  {/* Customer & Event Details */}
                  <SectionCard title="1. Customer & Event Demographics">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Customer / Client Name">
                        <TextInput
                          required
                          value={currentEditingEvent.customerName || ''}
                          onChange={(e) => setCurrentEditingEvent({ ...currentEditingEvent, customerName: e.target.value })}
                          placeholder="Client Full Name"
                        />
                      </Field>
                      <Field label="Program / Event Type">
                        <SelectInput
                          value={currentEditingEvent.program || ''}
                          onChange={(e) => setCurrentEditingEvent({ ...currentEditingEvent, program: e.target.value })}
                        >
                          {programTypes.map(p => <option key={p} value={p}>{p}</option>)}
                        </SelectInput>
                      </Field>
                      <Field label="Start Date">
                        <TextInput
                          required
                          type="date"
                          value={currentEditingEvent.eventDate?.start ? new Date(currentEditingEvent.eventDate.start).toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            const start = new Date(e.target.value);
                            const currentEnd = currentEditingEvent.eventDate?.end ? new Date(currentEditingEvent.eventDate.end) : null;
                            const end = currentEnd && currentEnd >= start ? currentEnd : start;
                            const newConfirmations = { ...currentEditingEvent.confirmations };
                            Object.keys(newConfirmations).forEach(key => {
                              newConfirmations[key] = { ...newConfirmations[key], confirmed: false };
                            });
                            setCurrentEditingEvent({
                              ...currentEditingEvent,
                              eventDate: { start, end },
                              confirmations: newConfirmations
                            });
                          }}
                        />
                      </Field>
                      <Field label="End Date">
                        <TextInput
                          required
                          type="date"
                          value={currentEditingEvent.eventDate?.end ? new Date(currentEditingEvent.eventDate.end).toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            const end = new Date(e.target.value);
                            const currentStart = currentEditingEvent.eventDate?.start ? new Date(currentEditingEvent.eventDate.start) : null;
                            const start = currentStart && currentStart <= end ? currentStart : end;
                            const newConfirmations = { ...currentEditingEvent.confirmations };
                            Object.keys(newConfirmations).forEach(key => {
                              newConfirmations[key] = { ...newConfirmations[key], confirmed: false };
                            });
                            setCurrentEditingEvent({
                              ...currentEditingEvent,
                              eventDate: { start, end },
                              confirmations: newConfirmations
                            });
                          }}
                        />
                      </Field>
                      <Field label="Setup Time Window">
                        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <TextInput
                                type="time"
                                value={formatTimeHHMM(currentEditingEvent.timeWindow?.start) || '09:00'}
                                onChange={(e) => {
                                  const newConfirmations = { ...currentEditingEvent.confirmations };
                                  Object.keys(newConfirmations).forEach((key) => {
                                    newConfirmations[key] = { ...newConfirmations[key], confirmed: false };
                                  });
                                  setCurrentEditingEvent({
                                    ...currentEditingEvent,
                                    timeWindow: { start: e.target.value, end: currentEditingEvent.timeWindow?.end || '18:00' },
                                    confirmations: newConfirmations
                                  });
                                }}
                              />
                              <TextInput
                                type="time"
                                value={formatTimeHHMM(currentEditingEvent.timeWindow?.end) || '18:00'}
                                onChange={(e) => {
                                  const newConfirmations = { ...currentEditingEvent.confirmations };
                                  Object.keys(newConfirmations).forEach((key) => {
                                    newConfirmations[key] = { ...newConfirmations[key], confirmed: false };
                                  });
                                  setCurrentEditingEvent({
                                    ...currentEditingEvent,
                                    timeWindow: { start: currentEditingEvent.timeWindow?.start || '09:00', end: e.target.value },
                                    confirmations: newConfirmations
                                  });
                                }}
                              />
                            </div>
                            <SimpleButton
                              type="button"
                              variant="secondary"
                              onClick={openSetupTimeModal}
                              className="h-fit w-full md:w-auto px-3 py-2 text-xs font-semibold"
                            >
                              <Clock className="w-3.5 h-3.5" /> Timer
                            </SimpleButton>
                          </div>
                          <p className="text-[10px] text-slate-500">Use the timer option to pick the setup window quickly.</p>
                        </div>
                      </Field>
                      <Field label="Event Place / Venue">
                        <TextInput
                          required
                          value={currentEditingEvent.place || ''}
                          onChange={(e) => setCurrentEditingEvent({ ...currentEditingEvent, place: e.target.value })}
                          placeholder="Auditorium, Grounds or Venue Place"
                        />
                      </Field>
                      <Field label="Auditor Identity (Created By)">
                        <TextInput
                          disabled
                          value={
                            currentEditingEvent.createdBy?.name ||
                            currentEditingEvent.createdBy?.email ||
                            user?.fullName || 'Sales Representative'
                          }
                        />
                      </Field>
                    </div>
                  </SectionCard>

                  {/* Department Wise Item Selection (Dynamic groups from admin) */}
                  <SectionCard title="2. All Item Groups (Select Items)">
                    <div className="space-y-6">
                      {activeDepartments.map((dept) => {
                        const deptItems = groupedItemsForEdit[dept.key] || [];
                        const availableInventoryOptions = (inventoryWithAvailability.length ? inventoryWithAvailability : inventoryItems).filter(
                          (i) => i.department === dept.key
                        );

                        return (
                          <div key={dept.key} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: (dept as any).color || '#3b82f6' }}
                                />
                                <h4 className="text-sm font-extrabold text-slate-800">{dept.label}</h4>
                              </div>
                              <div className="flex items-center gap-2">
                                {currentEditingEvent?._id && deptItems.length > 0 && (
                                  <>
                                    {currentEditingEvent.confirmations?.[dept.key]?.confirmed ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                                        ✅ Confirmed
                                      </span>
                                    ) : (
                                      <SimpleButton
                                        type="button"
                                        variant="success"
                                        onClick={() => handleConfirmDept(dept.key)}
                                        className="!py-1.5 !px-2.5 text-xs font-bold"
                                        disabled={confirmDeptMutation.isPending || confirmingDepts[dept.key]}
                                      >
                                        {confirmingDepts[dept.key] ? 'Confirming...' : 'Confirm to Print'}
                                      </SimpleButton>
                                    )}
                                  </>
                                )}
                                <SimpleButton
                                  type="button"
                                  variant="secondary"
                                  onClick={() => addEventItem(dept.key as DepartmentKey)}
                                  className="!py-1.5 !px-2.5 text-xs font-bold"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add Group Item
                                </SimpleButton>
                              </div>
                            </div>

                            {deptItems.length === 0 ? (
                              <p className="text-xs text-slate-400 font-semibold py-2">No items listed under this group.</p>
                            ) : (
                              <div className="space-y-3">
                                {deptItems.map((item: any) => {
                                  const matchingInv = availableInventoryOptions.find(i => i._id === item.itemId || i.id === item.itemId);
                                  
                                  // Find if there is a saved reservation for this item in the database
                                  const savedItem = currentEditingEvent?.items?.find((i: any) => {
                                    const savedId = i.itemId?._id || i.itemId;
                                    return savedId === item.itemId;
                                  });
                                  const savedQty = savedItem ? savedItem.quantity : 0;

                                  // Sum up all other local selections of this item in the checkout form (excluding current row)
                                  const otherSelectedQty = eventItems
                                    .filter((_, idx) => idx !== item.originalIndex && eventItems[idx].itemId === item.itemId)
                                    .reduce((sum, i) => sum + (i.quantity || 0), 0);

                                  const dbAvailStock = matchingInv ? (matchingInv as any).availableStock ?? matchingInv.currentStock : 0;
                                  const availStock = Math.max(0, dbAvailStock + savedQty - otherSelectedQty);

                                  return (
                                    <div key={item.originalIndex} className="grid items-end gap-3 sm:grid-cols-[1.5fr_100px_120px_40px]">
                                      <Field label="Item Selection">
                                        <SelectInput
                                          value={item.itemId || ''}
                                          onChange={(e) => updateEventItem(item.originalIndex, { itemId: e.target.value })}
                                        >
                                          <option value="">Choose item...</option>
                                          {availableInventoryOptions
                                            .filter((inv) => {
                                              // Only show items that are not selected in other rows
                                              const otherSelectedIds = eventItems
                                                .filter((_, idx) => idx !== item.originalIndex)
                                                .map(i => i.itemId)
                                                .filter(Boolean) as string[];
                                              return !otherSelectedIds.includes(inv._id || inv.id || '');
                                            })
                                            .map((inv) => (
                                              <option key={inv._id || inv.id} value={inv._id || inv.id}>
                                                {inv.name} ({inv.itemCode})
                                              </option>
                                            ))}
                                        </SelectInput>
                                      </Field>
                                      <Field label="Quantity">
                                        <TextInput
                                          type="number"
                                          min={1}
                                          value={item.quantity === 0 ? '' : item.quantity}
                                          onChange={(e) => updateEventItem(item.originalIndex, { quantity: Number(e.target.value) })}
                                        />
                                      </Field>
                                      <div className="flex flex-col gap-1 text-sm font-semibold">
                                        <span className="text-slate-500 text-xs">Available Stock</span>
                                        {availStock <= 0 ? (
                                          <span className="px-2 py-2 rounded-lg text-center text-[10px] font-black bg-red-650 text-red-600 animate-pulse uppercase tracking-wider">
                                            Out of Stock
                                          </span>
                                        ) : (
                                          <span className={`px-2 py-2 rounded-lg text-center text-xs font-bold ${
                                            availStock >= item.quantity
                                              ? 'bg-emerald-50 text-emerald-700'
                                              : 'bg-amber-50 text-amber-705 border border-amber-150'
                                          }`}>
                                            {availStock} remaining
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => removeEventItem(item.originalIndex)}
                                        className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50"
                                        aria-label="Remove item"
                                      >
                                        <Trash2 className="h-4.5 w-4.5" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </SectionCard>
                </div>

                <div className="space-y-6">
                  
                
                  

                  {/* Inline group confirmations are now integrated into the headers above */}

                  {/* Live Pricing Preview */}
                  <SectionCard title="Live Pricing Preview">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between font-semibold">
                        <span>Subtotal</span>
                        <span>Rs. {pricingPreview.subTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-slate-500">
                        <span>Discount Total</span>
                        <span>- Rs. {pricingPreview.discountTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-slate-500">
                        <span>GST (18%)</span>
                        <span>Rs. {pricingPreview.gstTotal.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-3 flex justify-between font-extrabold text-lg text-slate-900">
                        <span>Grand Total</span>
                        <span>Rs. {pricingPreview.grandTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </SectionCard>

                  {/* Printing configurations are now managed inside a premium modal accessed via the top 'Configure & Print Slip' button */}
                </div>
              </form>
            </>
          )}

          {/* SCREEN 3: UPCOMING EVENTS */}
          {activeMenu === 'upcoming-events' && (
            <>
              <div>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Upcoming Events Calendar</h2>
                <p className="text-sm text-slate-500 font-medium">Verify upcoming client-side schedules, filter, and reprint billing slips.</p>
              </div>

              <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 print:hidden">
                <Field label="Search Customers / Venues">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 h-4 w-4 text-slate-400" />
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-blue-500/20 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Search customer, venue or program..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </Field>
                <Field label="Filter by Status">
                  <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="All">All Statuses</option>
                    <option value="INQUIRY">Draft Inquiry</option>
                    <option value="QUOTATION">Quotation Sent</option>
                    <option value="APPROVED">Approved Booking</option>
                    <option value="CONFIRMED">Confirmed Department</option>
                  </SelectInput>
                </Field>
                <Field label="Filter by Date">
                  <TextInput type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                </Field>
              </div>

              <SectionCard title="Active Scheduled Events">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Client Name</th>
                        <th className="px-4 py-3 font-semibold">Venue Place</th>
                        <th className="px-4 py-3 font-semibold">Event Dates</th>
                        <th className="px-4 py-3 font-semibold">Time Slot</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingEvents.map((event) => (
                        <tr key={event._id} className="border-t border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-900">{event.customerName}</td>
                          <td className="px-4 py-3 text-slate-600 font-medium">{event.place}</td>
                          <td className="px-4 py-3 text-slate-600 font-medium">
                            {new Date(event.eventDate.start).toLocaleDateString('en-IN')} to {new Date(event.eventDate.end).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-medium">
                            {event.timeWindow?.start} - {event.timeWindow?.end}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              event.eventStatus === 'CONFIRMED' || event.eventStatus === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {event.eventStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                             <div className="flex items-center justify-end gap-2">
                              <SimpleButton variant="secondary" onClick={() => handleStartEdit(event)} className="!py-1 !px-2 text-xs">
                                Edit Details
                              </SimpleButton>
                              <SimpleButton
                                variant="danger"
                                onClick={() => setConfirmDeleteId(event._id)}
                                className="!py-1 !px-2 text-xs"
                              >
                                Delete
                              </SimpleButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {upcomingEvents.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium">
                            No upcoming event schedules found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </>
          )}

          {/* SCREEN 4: PAST EVENTS */}
          {activeMenu === 'past-events' && (
            <>
              <div>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Archived & Past Events</h2>
                <p className="text-sm text-slate-500 font-medium">Search for past client bookings and review billing histories.</p>
              </div>

              <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 print:hidden">
                <Field label="Search Customers">
                  <TextInput placeholder="Search client name..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </Field>
                <Field label="From Date">
                  <TextInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </Field>
                <Field label="To Date">
                  <TextInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </Field>
              </div>

              <SectionCard title="Past Events Directory">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Client Name</th>
                        <th className="px-4 py-3 font-semibold">Venue Place</th>
                        <th className="px-4 py-3 font-semibold">Event Date</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastEventsList.map((event) => (
                        <tr key={event._id} className="border-t border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-900">{event.customerName}</td>
                          <td className="px-4 py-3 text-slate-600 font-medium">{event.place}</td>
                          <td className="px-4 py-3 text-slate-600 font-medium">
                            {new Date(event.eventDate.start).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                              {event.eventStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                             <div className="flex items-center justify-end gap-2">
                              <SimpleButton
                                variant="secondary"
                                onClick={() => setSelectedViewEvent(event)}
                                className="!py-1 !px-2.5 text-xs font-bold"
                              >
                                View Details
                              </SimpleButton>
                              <SimpleButton
                                variant="success"
                                onClick={() => handleStartPrint(event)}
                                className="!py-1 !px-2.5 text-xs font-bold flex items-center gap-1"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                Print Slip
                              </SimpleButton>
                              <SimpleButton
                                variant="secondary"
                                onClick={() => handleStartEdit(event)}
                                className="!py-1 !px-2 text-xs text-blue-650 hover:text-blue-700 hover:underline font-bold"
                              >
                                Edit/Duplicate
                              </SimpleButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {pastEventsList.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">
                            No past events found in selected dates.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </>
          )}

          {/* SCREEN 5: FREE STOCK */}
          {activeMenu === 'free-stock' && (
            <>
              <div>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Real-time dynamic Stock Checker</h2>
                <p className="text-sm text-slate-500 font-medium">Check available inventory quantities dynamically over custom event windows.</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs print:hidden space-y-4">
                {/* Dynamic search bar */}
                <div className="relative flex items-center print:hidden">
                  <Search className="absolute left-3 h-4 w-4 text-slate-400" />
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-12 text-sm text-slate-800 outline-none focus:border-blue-500/20 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Search items by name or item code instantly..."
                    value={freeStockSearch}
                    onChange={(e) => setFreeStockSearch(e.target.value)}
                  />
                  {freeStockSearch && (
                    <button
                      type="button"
                      onClick={() => setFreeStockSearch('')}
                      className="absolute right-3 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer transition"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Filters Row */}
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5 pt-3 border-t border-slate-100">
                  <Field label="Item Group / Department">
                    <SelectInput value={freeStockDept} onChange={(e) => setFreeStockDept(e.target.value)}>
                      <option value="All Departments">All Departments</option>
                      {activeDepartments.map(d => <option key={d.key || d._id} value={d.key}>{d.label}</option>)}
                    </SelectInput>
                  </Field>
                  <Field label="From Date">
                    <TextInput type="date" value={freeStockDateFrom} onChange={(e) => setFreeStockDateFrom(e.target.value)} />
                  </Field>
                  <Field label="To Date">
                    <TextInput type="date" value={freeStockDateTo} onChange={(e) => setFreeStockDateTo(e.target.value)} />
                  </Field>
                  <Field label="From Time">
                    <TextInput type="time" value={freeStockTimeFrom} onChange={(e) => setFreeStockTimeFrom(e.target.value)} />
                  </Field>
                  <Field label="To Time">
                    <TextInput type="time" value={freeStockTimeTo} onChange={(e) => setFreeStockTimeTo(e.target.value)} />
                  </Field>
                </div>
              </div>

              <SectionCard title="Dynamic Stocks Available">
                {freeStockLoading ? (
                  <div className="py-20 text-center text-sm font-semibold text-slate-400">Loading dynamic inventories...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Item Name</th>
                          <th className="px-4 py-3 font-semibold">Group Code</th>
                          <th className="px-4 py-3 font-semibold">Department</th>
                          <th className="px-4 py-3 font-semibold text-center">Available Stock</th>
                          <th className="px-4 py-3 text-center font-semibold">Reserved Quantity</th>
                          <th className="px-4 py-3 text-center font-semibold">Total Physical stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {freeStockInventory.map((item: any) => (
                          <tr key={item._id} className="border-t border-slate-100 hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-bold text-slate-900">{item.name}</td>
                            <td className="px-4 py-3 text-slate-500 font-mono font-bold">{item.itemCode}</td>
                            <td className="px-4 py-3 text-slate-600 font-semibold">
                              {activeDepartments.find(d => d.key === item.department)?.label || item.department}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {item.availableStock > 0 ? (
                                <span className="inline-flex rounded-lg px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-150">
                                  {item.availableStock} available
                                </span>
                              ) : (
                                <span className="inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black bg-red-650 text-red-600 animate-pulse uppercase tracking-wider">
                                  Out of Stock
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-500 font-bold">{item.reservedStock || 0}</td>
                            <td className="px-4 py-3 text-center text-slate-700 font-bold">{item.currentStock}</td>
                          </tr>
                        ))}
                        {freeStockInventory.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium">No items found matching the selected group.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </>
          )}

          {/* SCREEN 6: CUSTOMER ACCOUNTS */}
          {activeMenu === 'customer-accounts' && (
            <>
              {/* Header section with Stats */}
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl flex items-center gap-2">
                    <Users className="w-6 h-6 text-blue-600 animate-pulse" />
                    Client & Customer Ledgers
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Track client event diaries, pending dues, balances, and history summaries.</p>
                </div>

                {/* Premium Metrics Summary Grid */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex items-center justify-between transition hover:shadow-md duration-300">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Clients</p>
                      <p className="mt-1.5 text-2xl font-black text-slate-900">{customers.length}</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex items-center justify-between transition hover:shadow-md duration-300">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Outstanding Dues</p>
                      <p className="mt-1.5 text-2xl font-black text-rose-600">
                        Rs. {customers.reduce((sum, c) => sum + (c.pendingAmount || 0), 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-rose-600" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex items-center justify-between transition hover:shadow-md duration-300">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Settled Accounts</p>
                      <p className="mt-1.5 text-2xl font-black text-emerald-600">
                        {customers.filter(c => (c.pendingAmount || 0) === 0).length} <span className="text-xs text-slate-400 font-semibold">/ {customers.length}</span>
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                </div>

                {/* Main Content Layout Grid - Full Width List */}
                <div className="w-full">
                  <SectionCard title="Active Client Accounts">
                    <div className="mb-4 relative flex items-center print:hidden">
                      <Search className="absolute left-3 h-4 w-4 text-slate-400" />
                      <input
                        className="w-full text-xs rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-slate-800 outline-none focus:border-blue-500/20 focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Search customers by name..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                    </div>
                    
                    <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                            <th className="p-4 pl-5">Client Name</th>
                            <th className="p-4">Contact</th>
                            <th className="p-4 text-center">Bookings</th>
                            <th className="p-4 text-right">Outstanding Dues</th>
                            <th className="p-4 pr-5">Last Booking</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customers
                            .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                            .map((customer) => {
                              const isSelected = selectedCustomerId === customer.id;
                              const hasDues = (customer.pendingAmount || 0) > 0;
                              return (
                                <tr
                                  key={customer.id}
                                  onClick={() => {
                                    setSelectedCustomerId(customer.id);
                                    setIsLedgerModalOpen(true);
                                  }}
                                  className={`cursor-pointer border-b border-slate-100/70 hover:bg-slate-50/50 transition-colors ${
                                    isSelected ? 'bg-blue-50/40 hover:bg-blue-50/40 font-bold' : ''
                                  }`}
                                >
                                  <td className="p-4 pl-5 font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${isSelected ? 'bg-blue-500' : 'bg-transparent'}`} />
                                    {customer.name}
                                  </td>
                                  <td className="p-4 text-slate-500 font-semibold">{customer.phone}</td>
                                  <td className="p-4 text-center text-slate-700 font-extrabold">{customer.totalEvents}</td>
                                  <td className="p-4 text-right font-extrabold">
                                    {hasDues ? (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-100">
                                        Rs. {customer.pendingAmount.toLocaleString()}
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                        Settled
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-4 text-slate-400 font-semibold">
                                    {customer.lastEventDate ? new Date(customer.lastEventDate).toLocaleDateString('en-IN') : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          {customers.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-slate-400 font-medium italic">
                                No client profiles created yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                </div>
              </div>

              {/* Client Ledger Summary Modal */}
              {isLedgerModalOpen && selectedCustomer && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200" role="dialog" aria-modal="true">
                  {/* Clickable backdrop */}
                  <div className="absolute inset-0 cursor-default" onClick={() => setIsLedgerModalOpen(false)} aria-hidden="true" />

                  {/* Main modal container */}
                  <div className="relative bg-white border border-slate-200/80 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden z-10 animate-in zoom-in-95 duration-200">
                    
                    {/* Modal Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <h3 className="font-extrabold text-slate-800 text-sm leading-tight">Client Ledger Summary</h3>
                      </div>
                      <button 
                        onClick={() => setIsLedgerModalOpen(false)} 
                        className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-450 hover:text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer transition shadow-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Modal Body - Scrollable */}
                    <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
                      {/* Client Information Header Card */}
                      <div className="bg-slate-50/75 border border-slate-100 p-4 rounded-2xl flex flex-col gap-2 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600 shrink-0" />
                          <p className="text-sm font-extrabold text-slate-800">{selectedCustomer.name}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{selectedCustomer.phone}</span>
                        </div>

                        <div className="flex items-start gap-2 text-xs text-slate-500 font-semibold mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="leading-normal">Address: {selectedCustomer.address}</span>
                        </div>
                      </div>
                      
                      {/* Dues Balance Pill Block */}
                      {selectedCustomer.pendingAmount > 0 ? (
                        <div className="rounded-2xl bg-rose-50/50 border border-rose-100 p-4 flex items-center justify-between shadow-2xs">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Outstanding balance due</p>
                            <p className="text-xl font-black text-rose-600 mt-1">
                              Rs. {selectedCustomer.pendingAmount.toLocaleString('en-IN')}
                            </p>
                          </div>
                          <div className="h-10 w-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-5 h-5 text-rose-500" />
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100 p-4 flex items-center justify-between shadow-2xs">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Account status</p>
                            <p className="text-base font-extrabold text-emerald-700 mt-1">
                              Fully Settled (No Dues)
                            </p>
                          </div>
                          <div className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-250 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          </div>
                        </div>
                      )}

                      {/* Event Timeline History */}
                      <div>
                        <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Event Diary History</span>
                        </h4>
                        
                        <div className="relative border-l border-slate-200 ml-2.5 pl-4 space-y-4 pr-1">
                          {customerEvents.map(event => {
                            const start = new Date(event.eventDate.start);
                            const isClosed = event.eventStatus === 'CLOSED';
                            return (
                              <div key={event._id} className="relative">
                                {/* Circle dot on the line */}
                                <span className="absolute -left-[22.5px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-white bg-slate-300 ring-2 ring-slate-100" />
                                
                                <div className="rounded-xl border border-slate-100 bg-white p-3 hover:shadow-xs transition">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-800 leading-tight">{event.program}</p>
                                      <p className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-slate-300" />
                                        <span className="truncate">{event.place}</span>
                                      </p>
                                    </div>
                                    
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                      isClosed 
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                        : 'bg-blue-50 text-blue-600 border border-blue-100'
                                    }`}>
                                      {event.eventStatus}
                                    </span>
                                  </div>
                                  
                                  <div className="mt-3.5 pt-2.5 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-400">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-slate-300" />
                                      {start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setIsLedgerModalOpen(false);
                                        setCurrentEditingEvent(event);
                                        switchTab('create-event');
                                      }}
                                      className="text-blue-600 hover:text-blue-700 font-extrabold underline transition cursor-pointer"
                                    >
                                      View / Edit Details
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {customerEvents.length === 0 && (
                            <p className="text-xs text-slate-400 font-semibold py-4 text-center">No associated booking history.</p>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </>
          )}

        </div>
  );

  const printAndModals = (
    <>
        {/* Dynamic CONFIRMED Print Layout strictly filtered based on requirements */}
        {currentEditingEvent && (
          <div className="hidden print:block w-full text-slate-950 font-sans p-6 bg-white absolute top-0 left-0 right-0 z-50">
            {selectedPrintType === 'CUSTOMER_COPY_EXTRA' ? (
              <div className="space-y-12">
                <div>
                  <div className="text-right text-[10px] uppercase font-bold text-slate-400 mb-2">CUSTOMER ORIGINAL COPY</div>
                  <PrintSlipTemplate currentEditingEvent={currentEditingEvent} selectedPrintType="CUSTOMER_COPY" printItemsFiltered={printItemsFiltered} printTotals={printTotals} departments={activeDepartments as any} />
                </div>
                
                {/* dashed divider line */}
                <div className="border-t-2 border-dashed border-slate-350 py-6 text-center text-xs text-slate-500 select-none">
                  - - - - - - - - - - - - - - - Cut Along Line - - - - - - - - - - - - - - -
                </div>

                <div>
                  <div className="text-right text-[10px] uppercase font-bold text-slate-400 mb-2">EXTRA BILLING COPY</div>
                  <PrintSlipTemplate currentEditingEvent={currentEditingEvent} selectedPrintType="CUSTOMER_COPY" printItemsFiltered={printItemsFiltered} printTotals={printTotals} departments={activeDepartments as any} />
                </div>
              </div>
            ) : (
              <PrintSlipTemplate currentEditingEvent={currentEditingEvent} selectedPrintType={selectedPrintType} printItemsFiltered={printItemsFiltered} printTotals={printTotals} departments={activeDepartments as any} />
            )}
          </div>
        )}

        {/* MODAL: Printing Configuration Setup */}
        {isPrintModalOpen && currentEditingEvent && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200" role="dialog" aria-modal="true">
            {/* Clickable backdrop */}
            <div className="absolute inset-0 cursor-default" onClick={() => setIsPrintModalOpen(false)} aria-hidden="true" />

            {/* Main modal container */}
            <div className="relative bg-white border border-slate-200/80 rounded-2xl shadow-2xl w-full max-w-md flex flex-col z-10 animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-blue-600" />
                  <h3 className="font-extrabold text-slate-800 text-sm leading-tight">Print Slip Configurations</h3>
                </div>
                <button 
                  onClick={() => setIsPrintModalOpen(false)} 
                  className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-650 flex items-center justify-center font-bold text-xs cursor-pointer transition shadow-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Configure billing copies, filter items based on confirmation states, and print dynamic slips instantly.
                </p>

                <div className="space-y-4">
                  <Field label="Print Document Type">
                    <SelectInput
                      value={selectedPrintType}
                      onChange={(e) => setSelectedPrintType(e.target.value as any)}
                    >
                      <option value="OFFICE_COPY">Office Copy (Complete Items)</option>
                      <option value="CUSTOMER_COPY">Customer Copy (Confirmed Depts Only)</option>
                      <option value="CUSTOMER_COPY_EXTRA">Customer Copy + Extra Copy</option>
                      <option value="STORE_COPY">Store / Warehouse Copy</option>
                      <option value="DEPARTMENT_COPY">Department Copy (Single Dept)</option>
                    </SelectInput>
                  </Field>

                  {selectedPrintType === 'DEPARTMENT_COPY' && (
                    <Field label="Select Target Department">
                      <SelectInput
                        value={selectedPrintDept}
                        onChange={(e) => setSelectedPrintDept(e.target.value as any)}
                      >
                        {activeDepartments.map(d => <option key={d.key || d._id} value={d.key}>{d.label}</option>)}
                      </SelectInput>
                    </Field>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
                <SimpleButton
                  type="button"
                  variant="secondary"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </SimpleButton>
                <SimpleButton
                  type="button"
                  onClick={() => {
                    setIsPrintModalOpen(false);
                    window.setTimeout(() => window.print(), 150);
                  }}
                  className="text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Print Custom Copy
                </SimpleButton>
              </div>

            </div>
          </div>
        )}

        {/* MODAL: Read-Only Event Details View */}
        {selectedViewEvent && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200" role="dialog" aria-modal="true">
            {/* Clickable backdrop */}
            <div className="absolute inset-0 cursor-default" onClick={() => setSelectedViewEvent(null)} aria-hidden="true" />

            {/* Main modal container */}
            <div className="relative bg-white border border-slate-200/80 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden z-10 animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600 animate-pulse" />
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm leading-tight">Event Booking Breakdown</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Reference ID: {selectedViewEvent._id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedViewEvent(null)} 
                  className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-450 hover:text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer transition shadow-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-xs">
                
                {/* Client & Place Demographics */}
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Client / Customer</p>
                    <p className="font-extrabold text-slate-900 text-sm mt-1">{selectedViewEvent.customerName}</p>
                    
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mt-3">Venue / Setup Place</p>
                    <p className="font-bold text-slate-700 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      {selectedViewEvent.place}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Event Dates & Times</p>
                    <p className="font-bold text-slate-800 mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      {new Date(selectedViewEvent.eventDate.start).toLocaleDateString('en-IN')} to {new Date(selectedViewEvent.eventDate.end).toLocaleDateString('en-IN')}
                    </p>
                    <p className="text-slate-500 mt-0.5 font-semibold pl-4.5">
                      ⏳ Setup: {selectedViewEvent.timeWindow?.start || '09:00'} - {selectedViewEvent.timeWindow?.end || '18:00'}
                    </p>

                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mt-2">Program Type & Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-bold text-slate-700">{selectedViewEvent.program}</span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        selectedViewEvent.eventStatus === 'CONFIRMED' || selectedViewEvent.eventStatus === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {selectedViewEvent.eventStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items breakdown list */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reserved Equipment & Services</h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-455 font-bold uppercase tracking-wider text-[9px]">
                          <th className="p-3 pl-4">Item Name / Details</th>
                          <th className="p-3">Department</th>
                          <th className="p-3 text-right">Quantity</th>
                          <th className="p-3 text-right">Rate</th>
                          <th className="p-3 pr-4 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedViewEvent.items || []).map((itemRef, idx) => {
                          const dbItem = itemRef.itemId as any;
                          if (!dbItem) return null;
                          const rate = dbItem.rentalRate || 0;
                          const total = itemRef.quantity * rate;
                          return (
                            <tr key={idx} className="border-b border-slate-100/70 hover:bg-slate-50/20 last:border-b-0">
                              <td className="p-3 pl-4 font-bold text-slate-800">{dbItem.name}</td>
                              <td className="p-3">
                                <span className="text-[10px] bg-slate-100 text-slate-500 font-extrabold uppercase px-1.5 py-0.5 rounded">
                                  {dbItem.department?.replace('_', ' ') || 'RENTAL'}
                                </span>
                              </td>
                              <td className="p-3 text-right font-extrabold text-slate-700">{itemRef.quantity}</td>
                              <td className="p-3 text-right text-slate-500 font-semibold">Rs. {rate.toLocaleString()}</td>
                              <td className="p-3 pr-4 text-right font-extrabold text-slate-950">Rs. {total.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                        {(selectedViewEvent.items || []).length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400 italic">No reserved equipment items found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Confirmations breakdown */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Department Confirmation Checks</h4>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {activeDepartments.map(dept => {
                      const conf = selectedViewEvent.confirmations?.[dept.key];
                      const isConfirmed = conf?.confirmed;
                      return (
                        <div key={dept.key} className={`rounded-xl p-3 border flex flex-col justify-between ${
                          isConfirmed ? 'bg-emerald-50/40 border-emerald-100 text-emerald-800' : 'bg-slate-50 border-slate-150 text-slate-500'
                        }`}>
                          <p className="font-bold text-[11px] truncate">{dept.label}</p>
                          <p className="text-[9px] font-medium mt-1 leading-tight">
                            {isConfirmed ? (
                              <span>✅ Confirmed by {conf.confirmedBy?.name || 'Staff'}</span>
                            ) : (
                              <span>⏳ Awaiting Confirmation</span>
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Audit Context */}
                <div className="text-[10px] text-slate-400 font-semibold border-t border-slate-100 pt-4 flex flex-wrap justify-between gap-2">
                  <span>Created By: {selectedViewEvent.createdBy?.name || selectedViewEvent.createdBy?.email || 'Authorized Representative'}</span>
                  {selectedViewEvent.updatedAt && (
                    <span>Last Synced: {new Date(selectedViewEvent.updatedAt).toLocaleString()}</span>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center rounded-b-2xl">
                <div className="flex flex-col text-slate-605">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-none">Invoice Grand Total</span>
                  <span className="text-base font-black text-slate-900 mt-1">
                    Rs. {viewEventTotals.grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex gap-2">
                  <SimpleButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const viewEvent = selectedViewEvent;
                      setSelectedViewEvent(null);
                      handleStartPrint(viewEvent);
                    }}
                    className="text-xs flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4 text-blue-600" />
                    Configure & Print
                  </SimpleButton>
                  <SimpleButton
                    type="button"
                    onClick={() => setSelectedViewEvent(null)}
                    className="text-xs"
                  >
                    Close Directory
                  </SimpleButton>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* MODAL: Delete event confirmation */}
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-100">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-6 w-6" />
                <h3 className="text-lg font-bold text-slate-900">Soft Delete Booking</h3>
              </div>
              <p className="mt-3 text-sm text-slate-500 font-medium">
                Are you absolutely sure you want to cancel this event schedule? Active item reservations will be instantly released back to general stock levels.
              </p>
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 font-semibold border border-red-150">
                Warning - Deleting User: <span className="font-bold">{user?.fullName || user?.name || user?.email || 'System / Logged-in User'}</span>
                <br />
                This soft-delete action will be recorded and audited in system logs.
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <SimpleButton variant="secondary" onClick={() => setConfirmDeleteId(null)}>
                  Cancel
                </SimpleButton>
                <SimpleButton variant="danger" onClick={() => deleteEventMutation.mutate(confirmDeleteId)}>
                  Confirm Delete
                </SimpleButton>
              </div>
            </div>
          </div>
        )}

        <TimeRangePickerModal
          isOpen={isSetupTimeModalOpen}
          onClose={() => setIsSetupTimeModalOpen(false)}
          initialStartTime={formatTimeHHMM(currentEditingEvent?.timeWindow?.start) || '09:00'}
          initialEndTime={formatTimeHHMM(currentEditingEvent?.timeWindow?.end) || '18:00'}
          onSave={handleSetupTimeSave}
        />
    </>
  );
  if (hideLayout) {
    return (
      <div className="w-full">
        <div className="print:hidden">
          {screenContent}
        </div>
        {printAndModals}
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
        
        {/* Navigation Top Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 print:hidden">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5 text-slate-700" />
              </button>
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Onus Events" className="h-10 w-auto" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden text-right lg:block">
                <p className="text-sm font-bold text-slate-900">{user?.fullName || user?.name || 'Sales Representative'}</p>
                <p className="text-xs text-slate-500 font-medium">Rep ID: {user?.email}</p>
              </div>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => window.location.href = '/admin'}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Admin Panel
                </button>
              )}
              <SimpleButton variant="secondary" onClick={logout} className="!py-1.5 !px-3 text-xs">
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </SimpleButton>
            </div>
          </div>
        </header>

        <div className="flex w-full">
          
          {/* Mobile Overlay menu background */}
          {mobileOpen && (
            <button
              className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu overlay"
            />
          )}

          {/* Sidebar Navigation */}
          <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white p-4 transition-all duration-300 print:hidden lg:sticky lg:top-[65px] lg:self-start lg:h-[calc(100vh-65px)] lg:overflow-y-auto ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}>
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <span className="font-bold text-slate-900">ERP Navigation</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 hover:bg-slate-100 border border-slate-100"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="space-y-1.5">
              {representativeMenuItems.map((menu) => {
                const Icon = menu.icon;
                const active = activeMenu === menu.key;
                return (
                  <button
                    key={menu.key}
                    onClick={() => {
                      if (menu.key !== 'create-event') {
                        setCurrentEditingEvent(null);
                        setEventItems([]);
                      } else if (!currentEditingEvent) {
                        setCurrentEditingEvent({
                          customerName: '',
                          eventDate: { start: todayStr, end: todayStr },
                          timeWindow: { start: '09:00', end: '18:00' },
                          place: '',
                          program: 'Wedding',
                          eventStatus: 'INQUIRY'
                        });
                        setEventItems([]);
                      }
                      switchTab(menu.key as MenuKey);
                      setMobileOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-all ${
                      active
                        ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent hover:text-slate-950'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    {menu.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main ERP Screens */}
          <main className="w-full flex-1 p-4 lg:p-6 print:hidden">
            {screenContent}
          </main>
        </div>

        {printAndModals}

      </div>
    </AuthGuard>
  );
}
