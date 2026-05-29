"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { getInventoryApi, createEventApi } from '../../services/api';
import { apiClient } from '../../utils/apiClient';
import { AuthGuard } from '../../components/auth/AuthGuard';

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
  DollarSign
} from 'lucide-react';

// UI Components
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';

interface AddedItem {
  item: any;
  quantity: number;
  type: 'RENTAL' | 'SALE';
  subtotal: number;
}

export default function CreateEventPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { initializeSession } = useAuthStore();

  // Load active session on page mount
  useEffect(() => {
    initializeSession();
    // Set dynamic page title
    document.title = "ERP | Create Event Booking";
  }, [initializeSession]);

  // Form States
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

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inventory Selection States
  const [selectedDept, setSelectedDept] = useState('COUNTER_DECOR');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [itemType, setItemType] = useState<'RENTAL' | 'SALE'>('RENTAL');

  // List of added items
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);

  // Fetch entire inventory catalog
  const { data: inventory = [], isLoading: isInventoryLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: getInventoryApi,
    placeholderData: []
  });

  // Filter items based on selected department
  const filteredItems = inventory.filter((item: any) => item.department === selectedDept && item.isActive !== false);

  // Set first item as default when department changes
  useEffect(() => {
    if (filteredItems.length > 0) {
      setSelectedItemId(filteredItems[0]._id || '');
    } else {
      setSelectedItemId('');
    }
  }, [selectedDept, inventory]);

  const selectedItemObj = inventory.find((item: any) => item._id === selectedItemId);

  // Live real-time stock availability check
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
      const res = await apiClient.get(`/api/inventory/${selectedItemId}/availability?startDate=${startIso}&endDate=${endIso}`);
      setAvailableStock(res.data.availableQty);
    } catch {
      // Fallback to absolute current stock if endpoint fails or parses invalid date
      if (selectedItemObj) {
        setAvailableStock(selectedItemObj.currentStock);
      }
    } finally {
      setIsStockChecking(false);
    }
  };

  // Trigger stock check when selected item or scheduling dates change
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays || 1;
  };

  const rentalDays = getRentalDays();

  // Add Item to Event Handler
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !selectedItemObj) {
      setErrorMessage("Please select a valid item to add.");
      return;
    }

    if (quantity <= 0) {
      setErrorMessage("Quantity must be greater than 0.");
      return;
    }

    // Check availability limit
    const stockLimit = availableStock !== null ? availableStock : selectedItemObj.currentStock;
    if (quantity > stockLimit) {
      setErrorMessage(`Insufficient stock: Only ${stockLimit} units of "${selectedItemObj.name}" are available.`);
      return;
    }

    // Check if item is already added
    const existingIndex = addedItems.findIndex(
      (itemObj) => itemObj.item._id === selectedItemId && itemObj.type === itemType
    );

    const rate = itemType === 'RENTAL' ? selectedItemObj.rentalRate : selectedItemObj.saleRate;
    const itemSubtotal = itemType === 'RENTAL' ? quantity * rate * rentalDays : quantity * rate;

    if (existingIndex > -1) {
      // Update quantity and subtotal of existing item
      const updated = [...addedItems];
      const newQty = updated[existingIndex].quantity + quantity;
      
      if (newQty > stockLimit) {
        setErrorMessage(`Insufficient stock: Aggregated quantity (${newQty}) exceeds availability limit (${stockLimit}).`);
        return;
      }

      updated[existingIndex].quantity = newQty;
      updated[existingIndex].subtotal = itemType === 'RENTAL' ? newQty * rate * rentalDays : newQty * rate;
      setAddedItems(updated);
    } else {
      // Add new item to array
      setAddedItems([
        ...addedItems,
        {
          item: selectedItemObj,
          quantity,
          type: itemType,
          subtotal: itemSubtotal
        }
      ]);
    }

    // Reset selection defaults
    setQuantity(1);
    setErrorMessage(null);
    setSuccessMessage(`Added "${selectedItemObj.name}" to summary successfully.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Remove Item from summary
  const handleRemoveItem = (index: number) => {
    const updated = addedItems.filter((_, idx) => idx !== index);
    setAddedItems(updated);
  };

  // Pricing calculations
  const subtotal = addedItems.reduce((acc, curr) => acc + curr.subtotal, 0);
  const tax = Math.round(subtotal * 0.18);
  const grandTotal = subtotal + tax;

  // React Query Mutation to submit Event Creation
  const createEventMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await createEventApi(payload);
      return res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSuccessMessage(`Event booked successfully with status: ${data.event.eventStatus}! Redirecting...`);
      setErrorMessage(null);
      
      // Navigate after success delay
      setTimeout(() => {
        const userStr = localStorage.getItem('auth-storage');
        let isAdmin = false;
        if (userStr) {
          try {
            const parsed = JSON.parse(userStr);
            isAdmin = parsed.state?.user?.role === 'ADMIN';
          } catch {}
        }
        router.push(isAdmin ? '/admin?tab=simple-events' : '/representative?tab=simple-events');
      }, 2000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error || err.message || "Failed to create event booking.");
    }
  });

  // Main Submit Handler
  const handleCreateEvent = (status: 'INQUIRY' | 'QUOTATION' | 'CONFIRMED') => {
    setErrorMessage(null);

    // Validations
    if (!customerName.trim()) {
      setErrorMessage("Customer Name is required.");
      return;
    }
    if (!eventName.trim()) {
      setErrorMessage("Event Name (Program) is required.");
      return;
    }
    if (!place.trim()) {
      setErrorMessage("Venue / Location is required.");
      return;
    }
    if (!startDate || !endDate) {
      setErrorMessage("Event start and end dates are required.");
      return;
    }

    const startVal = new Date(`${startDate}T${startTime}`);
    const endVal = new Date(`${endDate}T${endTime}`);
    if (isNaN(startVal.getTime()) || isNaN(endVal.getTime())) {
      setErrorMessage("Invalid dates or timings entered.");
      return;
    }
    if (endVal.getTime() < startVal.getTime()) {
      setErrorMessage("End date & time must be after start date & time.");
      return;
    }

    // Build program string by combining form inputs
    const programPayload = `${eventName.trim()} [Type: ${eventType}]${
      customerPhone.trim() ? ` | Phone: ${customerPhone.trim()}` : ''
    }${notes.trim() ? ` | Notes: ${notes.trim()}` : ''}`;

    const itemsPayload = addedItems.map((itemObj) => ({
      itemId: itemObj.item._id,
      quantity: itemObj.quantity
    }));

    createEventMutation.mutate({
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
      eventStatus: status,
      items: itemsPayload
    });
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans antialiased">
        
        {/* Navigation Top Header */}
        <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
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
              CREATE EVENT BOOKING
            </h1>
          </div>
          
          <span className="text-[10px] font-bold text-blue-600 tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase">
            Onus ERP System
          </span>
        </header>

        {/* Outer Frame Wrapper */}
        <div className="max-w-7xl mx-auto px-6 mt-8 flex flex-col gap-6">
          
          {/* Notification Banners */}
          {successMessage && (
            <Alert message={successMessage} type="success" onClose={() => setSuccessMessage(null)} />
          )}
          {errorMessage && (
            <Alert message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />
          )}

          {/* Main 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* LEFT COLUMN: Input Forms (span 2) */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Section 1: Customer Details */}
              <Card className="bg-white border border-slate-200 shadow-sm p-6 rounded-xl">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5">
                  <User className="w-4 h-4 text-blue-600" />
                  <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">1. Customer Details</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input 
                    label="Customer Name *" 
                    placeholder="Alwin Joy"
                    value={customerName}
                    onChange={(e: any) => setCustomerName(e.target.value)}
                    required
                  />
                  <Input 
                    label="Phone Number" 
                    placeholder="e.g. 9876543210"
                    type="tel"
                    value={customerPhone}
                    onChange={(e: any) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </Card>

              {/* Section 2: Event Details */}
              <Card className="bg-white border border-slate-200 shadow-sm p-6 rounded-xl">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">2. Event Details</h2>
                </div>

                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="md:col-span-2">
                      <Input 
                        label="Event Name / Program *" 
                        placeholder="Wedding Reception Ceremony"
                        value={eventName}
                        onChange={(e: any) => setEventName(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Event Type</label>
                      <select 
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-700 font-semibold"
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
                    label="Venue / Location *" 
                    placeholder="Grand Hyatt Convention Center, Kochi"
                    value={place}
                    onChange={(e: any) => setPlace(e.target.value)}
                    required
                  />

                  {/* Dates & Timings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    
                    {/* Dates block */}
                    <div className="flex flex-col gap-4">
                      <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Date Schedule
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
                          <input 
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">End Date</label>
                          <input 
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>
                      
                      {startDate && endDate && (
                        <p className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2.5 py-1 rounded border border-blue-100 self-start">
                          📅 Rental Duration: {rentalDays} {rentalDays === 1 ? 'Day' : 'Days'}
                        </p>
                      )}
                    </div>

                    {/* Timings block */}
                    <div className="flex flex-col gap-4 md:border-l md:border-slate-200 md:pl-5">
                      <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Time Slots
                      </h3>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Start Time</label>
                          <input 
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">End Time</label>
                          <input 
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Notes */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Notes & Special Requirements</label>
                    <textarea 
                      placeholder="Add stage height guidelines, extra cloth specifications, or transport constraints..."
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </Card>

              {/* Section 3: Inventory Selection */}
              <Card className="bg-white border border-slate-200 shadow-sm p-6 rounded-xl">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">3. Inventory Selection</h2>
                </div>

                <form onSubmit={handleAddItem} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Department Dropdown */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Department</label>
                      <select 
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-700 font-semibold"
                      >
                        <option value="COUNTER_DECOR">Counter Decor</option>
                        <option value="CLOTH_DECOR">Cloth Decor</option>
                        <option value="RENTAL_ITEMS">Rental Items</option>
                        <option value="EXPENSE_CHARGES">Expense Charges</option>
                        <option value="STAFF">Staff Allocations</option>
                        <option value="OUTSIDE_RENTAL">Outside Rental</option>
                      </select>
                    </div>

                    {/* Item Dropdown */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Item Description</label>
                      <select 
                        value={selectedItemId}
                        onChange={(e) => setSelectedItemId(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-700 font-semibold"
                        disabled={filteredItems.length === 0 || isInventoryLoading}
                      >
                        {isInventoryLoading ? (
                          <option>Loading Inventory Catalog...</option>
                        ) : filteredItems.length === 0 ? (
                          <option>No active items in this department</option>
                        ) : (
                          filteredItems.map((item: any) => (
                            <option key={item._id} value={item._id}>
                              {item.name} ({item.itemCode})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                  </div>

                  {/* Stock Availability Info Panel */}
                  {selectedItemObj && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <Info className="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="flex-1">
                        <p className="font-bold text-slate-700">
                          Stock Availability Summary for &quot;{selectedItemObj.name}&quot;:
                        </p>
                        <div className="flex items-center gap-4 mt-1 font-semibold">
                          <span className="text-slate-500">
                            Core Stock: <strong className="text-slate-800">{selectedItemObj.currentStock}</strong>
                          </span>
                          
                          {/* Live dates specific check */}
                          {startDate && endDate ? (
                            isStockChecking ? (
                              <span className="text-blue-500 animate-pulse">Checking live availability...</span>
                            ) : (
                              <span className="text-slate-500">
                                Available on Selected Dates: {' '}
                                <strong className={availableStock === 0 ? 'text-red-600 font-extrabold animate-pulse' : 'text-emerald-600'}>
                                  {availableStock !== null ? availableStock : selectedItemObj.currentStock}
                                </strong>
                              </span>
                            )
                          ) : (
                            <span className="text-amber-600 italic">Select event dates to confirm real-time stock allocation bounds.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Qty and Type Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                    
                    {/* Quantity Input */}
                    <div className="md:col-span-1">
                      <Input 
                        label="Quantity Required *" 
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e: any) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        required
                      />
                    </div>

                    {/* Rental/Sale Switcher */}
                    <div className="flex flex-col gap-2 md:col-span-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pricing Model</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setItemType('RENTAL')}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${
                            itemType === 'RENTAL' 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Rental
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemType('SALE')}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${
                            itemType === 'SALE' 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Sale
                        </button>
                      </div>
                    </div>

                    {/* Add to Summary Button */}
                    <Button 
                      type="submit"
                      variant="secondary"
                      className="md:col-span-1 py-2.5 bg-slate-900 border-slate-900 hover:bg-slate-800 text-white font-bold tracking-wider uppercase text-xs"
                      disabled={!selectedItemId}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add to Event
                    </Button>

                  </div>
                </form>
              </Card>

            </div>

            {/* RIGHT COLUMN: Summary and Actions (span 1) */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              
              {/* Section 4: Added Items & Pricing Summary */}
              <Card className="bg-white border border-slate-200 shadow-sm p-6 rounded-xl flex flex-col gap-5 sticky top-24">
                
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">4. Pricing Summary</h2>
                </div>

                {/* Added Items table/list */}
                <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto pr-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Allocated Items ({addedItems.length})</span>
                  
                  {addedItems.map((itemObj, index) => (
                    <div 
                      key={index} 
                      className="p-3 border border-slate-200 bg-slate-50 rounded-lg flex items-center justify-between gap-3 text-xs shadow-sm hover:border-slate-300 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-slate-800 truncate">{itemObj.item.name}</p>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ml-2 ${
                            itemObj.type === 'RENTAL' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {itemObj.type}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mt-1">
                          <span>
                            Qty: <strong className="text-slate-600">{itemObj.quantity}</strong> • {
                              itemObj.type === 'RENTAL' 
                                ? `₹${itemObj.item.rentalRate}/day × ${rentalDays}d` 
                                : `₹${itemObj.item.saleRate} outright`
                            }
                          </span>
                          <span className="text-slate-800 font-bold">₹{itemObj.subtotal.toLocaleString()}</span>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition shrink-0"
                        aria-label="Remove Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {addedItems.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-8">
                      No items allocated to summary yet. Select items from list to assign them.
                    </p>
                  )}
                </div>

                {/* Subtotal, Tax and Grand Total calculations */}
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

                {/* Submission Action Buttons */}
                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-100">
                  
                  {/* Save Draft */}
                  <Button
                    onClick={() => handleCreateEvent('INQUIRY')}
                    disabled={createEventMutation.isPending}
                    variant="ghost"
                    className="w-full text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-xs font-bold py-3 uppercase tracking-wider"
                  >
                    Save Event Draft
                  </Button>

                  {/* Generate Quotation */}
                  <Button
                    onClick={() => handleCreateEvent('QUOTATION')}
                    disabled={createEventMutation.isPending}
                    variant="secondary"
                    className="w-full text-slate-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-xs font-bold py-3 uppercase tracking-wider"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1 text-amber-600" /> Generate Quotation
                  </Button>

                  {/* Confirm Event Booking */}
                  <Button
                    onClick={() => handleCreateEvent('CONFIRMED')}
                    disabled={createEventMutation.isPending}
                    className="w-full text-white bg-blue-600 hover:bg-blue-700 text-xs font-bold py-3 uppercase tracking-wider shadow-sm shadow-blue-500/10"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirm Event
                  </Button>

                </div>

              </Card>

            </div>

          </div>

        </div>

      </main>
    </AuthGuard>
  );
}
