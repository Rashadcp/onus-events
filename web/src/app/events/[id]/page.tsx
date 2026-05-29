"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/useAuthStore';
import { 
  getEventByIdApi, 
  updateEventApi, 
  deleteEventApi,
  getInventoryApi,
  checkItemAvailabilityApi
} from '../../../services/api';
import { AuthGuard } from '../../../components/auth/AuthGuard';

// Icons
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  Trash2, 
  Plus, 
  FileText, 
  CheckCircle2, 
  ChevronLeft,
  ShoppingBag,
  Info,
  DollarSign,
  Edit,
  X,
  Printer,
  CalendarCheck
} from 'lucide-react';

// UI Components
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { Modal } from '../../../components/ui/Modal';

interface AddedItem {
  item: any;
  quantity: number;
  type: 'RENTAL' | 'SALE';
  subtotal: number;
}

const STATUS_FLOW = ['INQUIRY', 'QUOTATION', 'APPROVED', 'CONFIRMED'];

export default function EventDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const { initializeSession, user } = useAuthStore();

  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'SALES_REPRESENTATIVE';

  // Load session on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // States
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState('Wedding');
  const [place, setPlace] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('22:00');
  const [notes, setNotes] = useState('');
  const [editItems, setEditItems] = useState<AddedItem[]>([]);

  // Cancel Event Confirmation Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelSign, setCancelSign] = useState('');

  // Inventory Selection inside Edit Mode
  const [selectedDept, setSelectedDept] = useState('COUNTER_DECOR');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [itemType, setItemType] = useState<'RENTAL' | 'SALE'>('RENTAL');

  // Query: Fetch Event Details
  const { data: event, isLoading: isEventLoading, error: eventError } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEventByIdApi(id),
    enabled: !!id
  });

  // Query: Fetch entire Inventory
  const { data: inventory = [], isLoading: isInventoryLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: getInventoryApi,
    placeholderData: []
  });

  // Load event details into edit states when query resolves or when edit is toggled
  useEffect(() => {
    if (event) {
      document.title = `ERP | Event Details: ${event.customerName}`;
      
      // Parse additional info from program payload
      // Format: EventName [Type: EventType] | Phone: CustomerPhone | Notes: Notes
      const prog = event.program || '';
      let parsedEventName = prog;
      let parsedType = 'Wedding';
      let parsedPhone = '';
      let parsedNotes = '';

      if (prog.includes(' [Type: ')) {
        const parts = prog.split(' [Type: ');
        parsedEventName = parts[0];
        
        const subParts = parts[1].split(']');
        parsedType = subParts[0];

        const notesPart = subParts[1] || '';
        if (notesPart.includes(' | Phone: ')) {
          const phParts = notesPart.split(' | Phone: ');
          const detailParts = phParts[1].split(' | Notes: ');
          parsedPhone = detailParts[0];
          parsedNotes = detailParts[1] || '';
        } else if (notesPart.includes(' | Notes: ')) {
          parsedNotes = notesPart.split(' | Notes: ')[1];
        }
      }

      setCustomerName(event.customerName);
      setCustomerPhone(parsedPhone);
      setEventName(parsedEventName);
      setEventType(parsedType);
      setPlace(event.place);
      
      if (event.eventDate?.start) {
        setStartDate(new Date(event.eventDate.start).toISOString().split('T')[0]);
      }
      if (event.eventDate?.end) {
        setEndDate(new Date(event.eventDate.end).toISOString().split('T')[0]);
      }
      
      setStartTime(event.timeWindow?.start || '10:00');
      setEndTime(event.timeWindow?.end || '22:00');
      setNotes(parsedNotes);

      // Load items
      const loadedItems = (event.items || []).map((itObj: any) => {
        const itemObj = itObj.itemId;
        // Rental calculation
        const rate = itemObj.rentalRate || 0;
        const diffDays = getRentalDays();
        return {
          item: itemObj,
          quantity: itObj.quantity,
          type: 'RENTAL' as 'RENTAL' | 'SALE', // backend binds everything as rental by default
          subtotal: itObj.quantity * rate * diffDays
        };
      });
      setEditItems(loadedItems);
    }
  }, [event, isEditing]);

  // Inventory Filtering
  const filteredItems = inventory.filter((item: any) => item.department === selectedDept && item.isActive !== false);

  useEffect(() => {
    if (filteredItems.length > 0) {
      setSelectedItemId(filteredItems[0]._id || '');
    } else {
      setSelectedItemId('');
    }
  }, [selectedDept, inventory]);

  const selectedItemObj = inventory.find((item: any) => item._id === selectedItemId);

  // Live real-time stock availability check inside edit
  const [availableStock, setAvailableStock] = useState<number | null>(null);
  const [isStockChecking, setIsStockChecking] = useState(false);

  const fetchLiveStock = async () => {
    if (!selectedItemId || !startDate || !endDate) {
      setAvailableStock(null);
      return;
    }
    setIsStockChecking(true);
    try {
      const startIso = new Date(`${startDate}T${startTime}`).toISOString();
      const endIso = new Date(`${endDate}T${endTime}`).toISOString();
      const res = await checkItemAvailabilityApi(selectedItemId, startIso, endIso);
      setAvailableStock(res.data.availableQty);
    } catch {
      if (selectedItemObj) setAvailableStock(selectedItemObj.currentStock);
    } finally {
      setIsStockChecking(false);
    }
  };

  useEffect(() => {
    fetchLiveStock();
  }, [selectedItemId, startDate, endDate, startTime, endTime]);

  // Calculate rental duration in days (inclusive)
  const getRentalDays = () => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 1;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const rentalDays = getRentalDays();

  // Add Item in Edit mode
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !selectedItemObj) return;

    const stockLimit = availableStock !== null ? availableStock : selectedItemObj.currentStock;
    if (quantity > stockLimit) {
      setErrorMessage(`Stock clash: Only ${stockLimit} units available.`);
      return;
    }

    const existingIndex = editItems.findIndex((it) => it.item._id === selectedItemId && it.type === itemType);
    const rate = itemType === 'RENTAL' ? selectedItemObj.rentalRate : selectedItemObj.saleRate;
    const sub = itemType === 'RENTAL' ? quantity * rate * rentalDays : quantity * rate;

    if (existingIndex > -1) {
      const updated = [...editItems];
      const newQty = updated[existingIndex].quantity + quantity;
      if (newQty > stockLimit) {
        setErrorMessage(`Aggregated quantity exceeds stock limit of ${stockLimit}.`);
        return;
      }
      updated[existingIndex].quantity = newQty;
      updated[existingIndex].subtotal = itemType === 'RENTAL' ? newQty * rate * rentalDays : newQty * rate;
      setEditItems(updated);
    } else {
      setEditItems([...editItems, { item: selectedItemObj, quantity, type: itemType, subtotal: sub }]);
    }

    setQuantity(1);
    setErrorMessage(null);
  };

  const handleRemoveItem = (index: number) => {
    setEditItems(editItems.filter((_, idx) => idx !== index));
  };

  // Pricing calculations
  const subtotal = editItems.reduce((acc, curr) => acc + curr.subtotal, 0);
  const tax = Math.round(subtotal * 0.18);
  const grandTotal = subtotal + tax;

  // Mutation: Update status
  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => {
      if (!event) throw new Error("Event data not loaded.");
      return updateEventApi(id, {
        customerName: event.customerName,
        place: event.place,
        eventDate: event.eventDate,
        timeWindow: event.timeWindow,
        program: event.program,
        eventStatus: status,
        items: (event.items || []).map((it: any) => ({ itemId: it.itemId?._id || it.itemId || '', quantity: it.quantity }))
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      setSuccessMessage(`Lifecycle advanced to: ${data.event.eventStatus}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error || err.message || "Failed to update lifecycle status.");
    }
  });

  // Mutation: Generic Update
  const updateEventMutation = useMutation({
    mutationFn: (payload: any) => updateEventApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      setIsEditing(false);
      setSuccessMessage("Event booking updated successfully!");
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error || err.message || "Failed to update event booking.");
    }
  });

  // Mutation: Cancel (Soft delete)
  const cancelEventMutation = useMutation({
    mutationFn: () => deleteEventApi(id),
    onSuccess: () => {
      setSuccessMessage("Event booking cancelled successfully! Redirecting...");
      setIsCancelModalOpen(false);
      setTimeout(() => {
        router.push(user?.role === 'ADMIN' ? '/admin?tab=simple-events' : '/representative?tab=simple-events');
      }, 2000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error || err.message || "Failed to cancel event booking.");
    }
  });

  // Save changes handler
  const handleSaveChanges = () => {
    if (!customerName.trim() || !eventName.trim() || !place.trim() || !startDate || !endDate) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    const startVal = new Date(`${startDate}T${startTime}`);
    const endVal = new Date(`${endDate}T${endTime}`);
    if (isNaN(startVal.getTime()) || isNaN(endVal.getTime()) || endVal.getTime() < startVal.getTime()) {
      setErrorMessage("Please check your dates and timings scheduling bounds.");
      return;
    }

    const programPayload = `${eventName.trim()} [Type: ${eventType}]${
      customerPhone.trim() ? ` | Phone: ${customerPhone.trim()}` : ''
    }${notes.trim() ? ` | Notes: ${notes.trim()}` : ''}`;

    const itemsPayload = editItems.map((it) => ({
      itemId: it.item._id,
      quantity: it.quantity
    }));

    updateEventMutation.mutate({
      customerName: customerName.trim(),
      place: place.trim(),
      eventDate: {
        start: startVal.toISOString(),
        end: endVal.toISOString()
      },
      timeWindow: {
        start: startTime,
        end: endTime
      },
      program: programPayload,
      items: itemsPayload,
      eventStatus: event?.eventStatus
    });
  };

  // Status index mapping
  const currentStatus = event?.eventStatus || 'INQUIRY';
  const statusIndex = STATUS_FLOW.indexOf(currentStatus);

  const handleAdvanceStatus = () => {
    if (statusIndex < STATUS_FLOW.length - 1) {
      const nextStatus = STATUS_FLOW[statusIndex + 1];
      updateStatusMutation.mutate(nextStatus);
    }
  };

  const handleCancelClick = () => {
    setCancelSign('');
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = () => {
    if (cancelSign.trim()) {
      cancelEventMutation.mutate();
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  if (isEventLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6">
        <Card className="bg-white p-8 max-w-md border border-slate-200 shadow-sm text-center">
          <p className="text-red-500 font-bold mb-4">Event not found or failed to load details.</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans antialiased print:bg-white print:pb-0">
        
        {/* Navigation / Actions Top Header */}
        <header className="border-b border-slate-200 bg-white sticky top-0 z-45 px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-500 hover:text-slate-900"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
            <h1 className="text-xl font-bold tracking-tight text-slate-950">
              EVENT DETAIL CONSOLE
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Edit Trigger */}
            {isPrivileged && (
              isEditing ? (
                <Button 
                  onClick={() => setIsEditing(false)} 
                  variant="ghost"
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs py-2 px-3 font-bold"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Cancel Edit
                </Button>
              ) : (
                <Button 
                  onClick={() => setIsEditing(true)} 
                  variant="secondary"
                  className="bg-slate-900 border-slate-900 hover:bg-slate-800 text-white text-xs py-2 px-3 font-bold"
                >
                  <Edit className="w-3.5 h-3.5 mr-1 text-slate-400" /> Edit Event
                </Button>
              )
            )}

            {/* Print trigger */}
            <Button
              onClick={triggerPrint}
              variant="ghost"
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs py-2 px-3 font-bold"
            >
              <Printer className="w-3.5 h-3.5 mr-1" /> Print Quotation
            </Button>

            {/* Cancel Trigger */}
            {isPrivileged && (
              <Button 
                onClick={handleCancelClick} 
                variant="danger"
                className="text-xs py-2 px-3 font-bold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:text-red-700"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Cancel Booking
              </Button>
            )}
          </div>
        </header>

        {/* Printable quotation sheet area */}
        <div id="printable-quotation" className="hidden print:block p-10 bg-white font-sans text-slate-800">
          <div className="text-center border-b-2 border-slate-950 pb-4 mb-6">
            <img src="/logo.png" alt="Onus Events" className="h-14 mx-auto mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mt-1">Premium Stage Rentals & Decors</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-200 pb-4 mb-6">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Customer Details</span>
              <p className="font-bold text-slate-950 text-sm mt-0.5">{event.customerName}</p>
              <p className="text-slate-500 font-medium">{customerPhone ? `Phone: ${customerPhone}` : ''}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Quotation Details</span>
              <p className="font-semibold text-slate-700 mt-0.5">Place: {event.place}</p>
              <p className="text-slate-500">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <h3 className="text-xs font-black uppercase tracking-wider bg-slate-950 text-white px-3 py-1 text-center mb-4 rounded">
            ESTIMATION RECORD / QUOTATION
          </h3>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-900 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                <th className="pb-2">Allocated Item Description</th>
                <th className="pb-2">Item Code</th>
                <th className="pb-2 text-center">Qty</th>
                <th className="pb-2 text-right">Daily Rate</th>
                <th className="pb-2 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {editItems.map((itemObj, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-2.5 font-bold text-slate-900">{itemObj.item.name}</td>
                  <td className="py-2.5 font-mono text-slate-400">{itemObj.item.itemCode}</td>
                  <td className="py-2.5 text-center font-bold">{itemObj.quantity}</td>
                  <td className="py-2.5 text-right">₹{itemObj.item.rentalRate?.toLocaleString()}</td>
                  <td className="py-2.5 text-right font-semibold">₹{itemObj.subtotal.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t-2 border-slate-950 mt-6 pt-4 flex flex-col items-end text-xs gap-1.5">
            <div className="flex justify-between w-64">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Subtotal:</span>
              <span className="font-semibold text-slate-700">₹{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between w-64 border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">CGST / SGST (18%):</span>
              <span className="font-semibold text-slate-700">₹{tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between w-64 text-slate-950 font-black text-sm pt-1">
              <span className="uppercase tracking-widest text-[11px]">Grand Total:</span>
              <span>₹{grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Core Frame Wrapper */}
        <div className="max-w-7xl mx-auto px-6 mt-8 flex flex-col gap-6 print:hidden">
          
          {/* Notifications */}
          {successMessage && <Alert message={successMessage} type="success" onClose={() => setSuccessMessage(null)} />}
          {errorMessage && <Alert message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />}

          {/* Section: Event Status Timeline */}
          <Card className="bg-white border border-slate-200 shadow-sm p-6 rounded-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-1">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-blue-600" />
                <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Event Status Timeline</h2>
              </div>
              
              {/* Advance Status Button */}
              {isPrivileged && !isEditing && (
                <Button
                  onClick={handleAdvanceStatus}
                  disabled={statusIndex >= STATUS_FLOW.length - 1 || updateStatusMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-3 rounded shadow-sm font-semibold"
                >
                  {updateStatusMutation.isPending ? 'Updating...' : statusIndex < STATUS_FLOW.length - 1 ? `Advance to ${STATUS_FLOW[statusIndex + 1]}` : 'Completed'}
                </Button>
              )}
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-slate-50 p-4 border border-slate-200 rounded-xl">
              <div className="flex flex-wrap gap-3 items-center">
                {STATUS_FLOW.map((status, idx) => {
                  const isPast = idx < statusIndex;
                  const isCurrent = idx === statusIndex;
                  return (
                    <React.Fragment key={status}>
                      <div className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg border transition ${
                        isCurrent 
                          ? 'bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-offset-2 ring-blue-500/20' 
                          : isPast 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-white text-slate-300 border-slate-200'
                      }`}>
                        {status}
                      </div>
                      {idx < STATUS_FLOW.length - 1 && (
                        <span className="text-slate-300 text-xs hidden md:inline">→</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="text-xs">
                <span className="text-slate-400 font-medium">Current Status:</span>{' '}
                <strong className="text-blue-600 font-extrabold">{currentStatus}</strong>
              </div>
            </div>
          </Card>

          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* LEFT COLUMN: Event / Customer Information (span 2) */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Section 1: Customer Information */}
              <Card className="bg-white border border-slate-200 shadow-sm p-6 rounded-xl">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5">
                  <User className="w-4 h-4 text-blue-600" />
                  <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Customer Information</h2>
                </div>

                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input 
                      label="Customer Name *"
                      value={customerName}
                      onChange={(e: any) => setCustomerName(e.target.value)}
                    />
                    <Input 
                      label="Phone Number"
                      type="tel"
                      value={customerPhone}
                      onChange={(e: any) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Customer Name</span>
                      <p className="font-bold text-slate-800 text-base">{event.customerName}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Phone / Contact</span>
                      <p className="font-semibold text-slate-700 text-base flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-slate-400" /> {customerPhone || 'Not Provided'}
                      </p>
                    </div>
                  </div>
                )}
              </Card>

              {/* Section 2: Event Information */}
              <Card className="bg-white border border-slate-200 shadow-sm p-6 rounded-xl">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Event Information</h2>
                </div>

                {isEditing ? (
                  <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="md:col-span-2">
                        <Input 
                          label="Event Name / Program *" 
                          value={eventName}
                          onChange={(e: any) => setEventName(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Event Type</label>
                        <select 
                          value={eventType}
                          onChange={(e) => setEventType(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-semibold"
                        >
                          <option value="Wedding">Wedding</option>
                          <option value="Birthday">Birthday</option>
                          <option value="Corporate">Corporate</option>
                          <option value="Seminar">Seminar</option>
                          <option value="Inauguration">Inauguration</option>
                          <option value="Other">Other Program</option>
                        </select>
                      </div>
                    </div>

                    <Input 
                      label="Venue / Place *" 
                      value={place}
                      onChange={(e: any) => setPlace(e.target.value)}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex flex-col gap-3">
                        <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">📅 Date Schedule</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Start Date</span>
                            <input 
                              type="date" 
                              value={startDate} 
                              onChange={(e) => setStartDate(e.target.value)}
                              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">End Date</span>
                            <input 
                              type="date" 
                              value={endDate} 
                              onChange={(e) => setEndDate(e.target.value)}
                              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">⏰ Time Slots</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Start Time</span>
                            <input 
                              type="time" 
                              value={startTime} 
                              onChange={(e) => setStartTime(e.target.value)}
                              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">End Time</span>
                            <input 
                              type="time" 
                              value={endTime} 
                              onChange={(e) => setEndTime(e.target.value)}
                              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Notes & Special Requirements</label>
                      <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="w-full p-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100 pb-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Event Name (Program)</span>
                        <p className="font-bold text-slate-800 text-base">{eventName}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Event Type</span>
                        <p className="font-semibold text-slate-700 text-base">{eventType}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Venue / Place</span>
                      <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-slate-400" /> {event.place}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100 pb-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Duration</span>
                        <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-400" /> {new Date(event.eventDate.start).toLocaleDateString()} to {new Date(event.eventDate.end).toLocaleDateString()} ({rentalDays} {rentalDays === 1 ? 'day' : 'days'})
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Timings slot</span>
                        <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-slate-400" /> {event.timeWindow?.start} - {event.timeWindow?.end}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Special Notes</span>
                      <p className="text-slate-600 font-medium italic bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                        {notes || 'No special requirements detailed.'}
                      </p>
                    </div>
                  </div>
                )}
              </Card>

              {/* Section 3: Inventory Items Selection inside Edit Mode */}
              {isEditing && (
                <Card className="bg-white border border-slate-200 shadow-sm p-6 rounded-xl">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5">
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Edit Allocated Items</h2>
                  </div>

                  <form onSubmit={handleAddItem} className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Department</span>
                        <select 
                          value={selectedDept}
                          onChange={(e) => setSelectedDept(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold"
                        >
                          <option value="COUNTER_DECOR">Counter Decor</option>
                          <option value="CLOTH_DECOR">Cloth Decor</option>
                          <option value="RENTAL_ITEMS">Rental Items</option>
                          <option value="EXPENSE_CHARGES">Expense Charges</option>
                          <option value="STAFF">Staff Allocations</option>
                          <option value="OUTSIDE_RENTAL">Outside Rental</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Item Description</span>
                        <select 
                          value={selectedItemId}
                          onChange={(e) => setSelectedItemId(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold"
                        >
                          {filteredItems.map((item: any) => (
                            <option key={item._id} value={item._id}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {selectedItemObj && (
                      <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
                        <Info className="w-4 h-4 text-blue-500 shrink-0" />
                        <span>
                          Available Quantity: <strong className="text-slate-900">{availableStock !== null ? availableStock : selectedItemObj.currentStock}</strong>
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                      <Input 
                        label="Quantity Required" 
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e: any) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pricing Type</span>
                        <div className="flex gap-2">
                          <button 
                            type="button" 
                            onClick={() => setItemType('RENTAL')}
                            className={`flex-1 py-1.5 text-xs font-bold border rounded ${itemType === 'RENTAL' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border-slate-200'}`}
                          >
                            Rental
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setItemType('SALE')}
                            className={`flex-1 py-1.5 text-xs font-bold border rounded ${itemType === 'SALE' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border-slate-200'}`}
                          >
                            Sale
                          </button>
                        </div>
                      </div>
                      <Button type="submit" variant="secondary" className="bg-slate-900 hover:bg-slate-800 text-white text-xs py-2 uppercase font-bold tracking-wider">
                        <Plus className="w-4 h-4 mr-1" /> Add Item
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

            </div>

            {/* RIGHT COLUMN: Inventory items and Pricing Summary */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              
              {/* Sections: Inventory Items & Pricing Summary */}
              <Card className="bg-white border border-slate-200 shadow-sm p-6 rounded-xl flex flex-col gap-5 sticky top-24">
                
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Allocated Inventory</h2>
                </div>

                <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto pr-1">
                  {(isEditing ? editItems : (event.items || []).map((itObj: any) => {
                    const itemObj = itObj.itemId;
                    const diffDays = getRentalDays();
                    return {
                      item: itemObj,
                      quantity: itObj.quantity,
                      type: 'RENTAL' as const,
                      subtotal: itObj.quantity * (itemObj.rentalRate || 0) * diffDays
                    };
                  })).map((itemObj, index) => (
                    <div 
                      key={index}
                      className="p-3 border border-slate-200 bg-slate-50 rounded-lg flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-slate-800 truncate">{itemObj.item?.name || 'Unknown item'}</p>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ml-2 ${
                            itemObj.type === 'RENTAL' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {itemObj.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1 flex justify-between">
                          <span>
                            Qty: <strong className="text-slate-600">{itemObj.quantity}</strong> • ₹{
                              itemObj.type === 'RENTAL' 
                                ? `${itemObj.item?.rentalRate}/day × ${rentalDays}d` 
                                : `${itemObj.item?.saleRate} outright`
                            }
                          </span>
                          <strong className="text-slate-800">₹{itemObj.subtotal.toLocaleString()}</strong>
                        </p>
                      </div>
                      
                      {isEditing && (
                        <button 
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                          aria-label="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {(!isEditing && (!event.items || event.items.length === 0)) && (
                    <p className="text-xs text-slate-400 italic text-center py-6">No inventory items allocated.</p>
                  )}
                </div>

                {/* Subtotals & Taxes */}
                <div className="border-t border-slate-100 pt-4 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between text-slate-500 font-bold">
                    <span>ITEMS SUB-TOTAL:</span>
                    <span className="text-slate-700">₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-bold border-b border-slate-100 pb-2.5">
                    <span>CGST + SGST (18%):</span>
                    <span className="text-slate-700">₹{tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-black text-sm pt-1">
                    <span>GRAND TOTAL ESTIMATE:</span>
                    <span className="text-blue-600 font-extrabold text-base">₹{grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Save Trigger in Edit Mode */}
                {isEditing && (
                  <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-100">
                    <Button 
                      onClick={handleSaveChanges}
                      disabled={updateEventMutation.isPending}
                      className="w-full text-white bg-blue-600 hover:bg-blue-700 text-xs font-bold py-3 uppercase tracking-wider"
                    >
                      {updateEventMutation.isPending ? 'Saving...' : 'Save Changes ✔'}
                    </Button>
                    <Button 
                      onClick={() => setIsEditing(false)}
                      variant="ghost"
                      className="w-full text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-xs font-bold py-3 uppercase tracking-wider"
                    >
                      Cancel
                    </Button>
                  </div>
                )}

              </Card>

            </div>

          </div>

        </div>

        {/* Auditor Cancellation Modal */}
        {isCancelModalOpen && (
          <Modal
            isOpen={isCancelModalOpen}
            title="⚠️ Auditor Cancellation Verification"
            description="Releasing all associated Stage decors & warehouse rental stocks."
            onClose={() => setIsCancelModalOpen(false)}
          >
            <div className="flex flex-col gap-4">
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs leading-5">
                Are you sure you want to soft delete the event booking? This will cancel all warehouse inventory allocations and reserves permanently.
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Accountability Signature (Please type your full name / username) *
                </label>
                <input 
                  type="text"
                  value={cancelSign}
                  onChange={(e) => setCancelSign(e.target.value)}
                  placeholder="e.g. akhil_sales"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-800 font-semibold"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end border-t border-slate-100 pt-4 mt-2">
                <Button variant="ghost" onClick={() => setIsCancelModalOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button 
                  variant="danger" 
                  disabled={!cancelSign.trim() || cancelEventMutation.isPending}
                  onClick={handleConfirmCancel}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  {cancelEventMutation.isPending ? 'Cancelling...' : 'Confirm Booking Cancellation'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

      </main>
    </AuthGuard>
  );
}
