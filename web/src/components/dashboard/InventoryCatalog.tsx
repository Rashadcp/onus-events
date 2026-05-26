"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';
import { SectionHeader } from '../ui/SectionHeader';
import { Item } from '../../types';
import { apiClient } from '../../utils/apiClient';
import { useInventoryWebSocket } from '../../hooks/useWebSocket';

interface InventoryCatalogProps {
  isAdmin?: boolean;
  initialItems?: Item[];
}

type TabType = 'grid' | 'table' | 'logs';

export function InventoryCatalog({ 
  isAdmin = false,
  initialItems = [] 
}: InventoryCatalogProps) {
  const queryClient = useQueryClient();
  
  // Establish real-time WebSocket sync
  useInventoryWebSocket();

  const [activeTab, setActiveTab] = useState<TabType>('grid');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Notifications
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Link sub-items modal
  const [subItemModalItem, setSubItemModalItem] = useState<Item | null>(null);
  const [subItemInput, setSubItemInput] = useState('');

  // Add Item form states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemDept, setNewItemDept] = useState('COUNTER_DECOR');
  const [newItemCategory, setNewItemCategory] = useState('Decorations');
  const [newItemWarehouse, setNewItemWarehouse] = useState('Main Warehouse');
  const [newItemStock, setNewItemStock] = useState('');
  const [newItemMinStock, setNewItemMinStock] = useState('5');
  const [newItemRent, setNewItemRent] = useState('');
  const [newItemSale, setNewItemSale] = useState('');
  const [newItemStatus, setNewItemStatus] = useState<'AVAILABLE' | 'RESERVED' | 'LOADED' | 'DISPATCHED' | 'RETURNED' | 'DAMAGED'>('AVAILABLE');
  const [newItemImage, setNewItemImage] = useState('');

  // Edit Item form states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('COUNTER_DECOR');
  const [editCategory, setEditCategory] = useState('Decorations');
  const [editWarehouse, setEditWarehouse] = useState('Main Warehouse');
  const [editStock, setEditStock] = useState('');
  const [editMinStock, setEditMinStock] = useState('5');
  const [editRent, setEditRent] = useState('');
  const [editSale, setEditSale] = useState('');
  const [editStatus, setEditStatus] = useState<'AVAILABLE' | 'RESERVED' | 'LOADED' | 'DISPATCHED' | 'RETURNED' | 'DAMAGED'>('AVAILABLE');
  const [editImage, setEditImage] = useState('');

  // Query: Fetch Inventory Catalog
  const { data: inventoryData = [], isLoading } = useQuery<Item[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await apiClient.get('/api/inventory');
      return res.data;
    },
    placeholderData: initialItems
  });

  // Query: Fetch Stock Logs (Admin Only)
  const { data: stockLogs = [] } = useQuery<any[]>({
    queryKey: ['stockLogs'],
    queryFn: async () => {
      const res = await apiClient.get('/api/inventory/logs');
      return res.data;
    },
    placeholderData: [],
    enabled: isAdmin
  });

  const activeItems = inventoryData.length > 0 ? inventoryData : initialItems;

  // Mutation: Create catalog item
  const createItemMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/api/inventory', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stockLogs'] });
      setMessage(`Item ${data.item.name} created successfully in Master Catalog!`);
      setErrorMessage(null);
      resetCreateForm();
      setIsCreateModalOpen(false);
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create catalog item.';
      setErrorMessage(errorMsg);
    }
  });

  // Mutation: Update catalog item
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemCode, payload }: { itemCode: string; payload: any }) => {
      const res = await apiClient.put(`/api/inventory/${itemCode}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stockLogs'] });
      setMessage(`Item ${data.item.name} updated successfully!`);
      setErrorMessage(null);
      setIsEditModalOpen(false);
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to update catalog item.';
      setErrorMessage(errorMsg);
    }
  });

  // Mutation: Soft-disable catalog item
  const deleteItemMutation = useMutation({
    mutationFn: async (itemCode: string) => {
      const res = await apiClient.delete(`/api/inventory/${itemCode}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stockLogs'] });
      setMessage('Inventory item successfully disabled.');
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to disable item.');
    }
  });

  // Mutation: Link subitems
  const saveSubitemsMutation = useMutation({
    mutationFn: async ({ itemCode, codes }: { itemCode: string; codes: string[] }) => {
      const res = await apiClient.post(`/api/inventory/${itemCode}/sub-items`, { subItemCodes: codes });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setMessage('Sub-item grouping linked successfully!');
      setErrorMessage(null);
      setSubItemModalItem(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to link sub-items.');
    }
  });

  const resetCreateForm = () => {
    setNewItemCode('');
    setNewItemName('');
    setNewItemDept('COUNTER_DECOR');
    setNewItemCategory('Decorations');
    setNewItemWarehouse('Main Warehouse');
    setNewItemStock('');
    setNewItemMinStock('5');
    setNewItemRent('');
    setNewItemSale('');
    setNewItemStatus('AVAILABLE');
    setNewItemImage('');
  };

  const handleCreateItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemCode || !newItemName || !newItemStock || !newItemRent || !newItemSale) {
      setErrorMessage('Please fill in all required inventory details.');
      return;
    }
    createItemMutation.mutate({
      itemCode: newItemCode.toUpperCase(),
      name: newItemName,
      department: newItemDept,
      category: newItemCategory,
      warehouse: newItemWarehouse,
      currentStock: Number(newItemStock),
      minimumStock: Number(newItemMinStock),
      rentalRate: Number(newItemRent),
      saleRate: Number(newItemSale),
      status: newItemStatus,
      imageUrl: newItemImage || undefined
    });
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDept(item.department);
    setEditCategory(item.category || 'Decorations');
    setEditWarehouse(item.warehouse || 'Main Warehouse');
    setEditStock(String(item.currentStock));
    setEditMinStock(String(item.minimumStock || 5));
    setEditRent(String(item.rentalRate));
    setEditSale(String(item.saleRate));
    setEditStatus(item.status || 'AVAILABLE');
    setEditImage(item.imageUrl || '');
    setIsEditModalOpen(true);
  };

  const handleEditItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    updateItemMutation.mutate({
      itemCode: editingItem.itemCode,
      payload: {
        name: editName,
        department: editDept,
        category: editCategory,
        warehouse: editWarehouse,
        currentStock: Number(editStock),
        minimumStock: Number(editMinStock),
        rentalRate: Number(editRent),
        saleRate: Number(editSale),
        status: editStatus,
        imageUrl: editImage || ''
      }
    });
  };

  const handleDisable = (itemCode: string) => {
    if (confirm(`Are you sure you want to disable item ${itemCode}?`)) {
      deleteItemMutation.mutate(itemCode);
    }
  };

  // Filter and Search Logic
  const filteredItems = activeItems.filter((item) => {
    const nameStr = item.name.toLowerCase();
    const codeStr = item.itemCode.toLowerCase();
    const categoryStr = (item.category || '').toLowerCase();
    const matchesSearch =
      nameStr.includes(searchTerm.toLowerCase()) ||
      codeStr.includes(searchTerm.toLowerCase()) ||
      categoryStr.includes(searchTerm.toLowerCase());

    const matchesDept = deptFilter === 'ALL' || item.department === deptFilter;
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

    return matchesSearch && matchesDept && matchesCategory && matchesStatus;
  });

  // Extract unique categories for filter dropdown
  const uniqueCategories = Array.from(new Set(activeItems.map((i) => i.category || 'Decorations')));

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'AVAILABLE':
      case 'RETURNED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'RESERVED':
      case 'LOADED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DISPATCHED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'DAMAGED':
        return 'bg-red-50 text-red-700 border-red-200 animate-pulse';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader 
        title="Event ERP Stock Registry" 
        description="Monitor physical stock levels, manage warehousing records, configure minimum reserves, and check transaction logs."
      >
        {isAdmin && (
          <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 text-xs py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm">
            <span>➕</span> Add Inventory Item
          </Button>
        )}
      </SectionHeader>

      {message && <Alert message={message} type="success" onClose={() => setMessage(null)} />}
      {errorMessage && <Alert message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />}

      {/* Dynamic Filters & Tab Control */}
      <div className="flex flex-col gap-4 bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E2E8F0] pb-3 gap-3">
          {/* Navigation Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('grid')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${ activeTab === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60' }`}
            >
              🖼️ Grid Cards
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${ activeTab === 'table' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60' }`}
            >
              📊 Excel Table View
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition ${ activeTab === 'logs' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60' }`}
              >
                📜 Stock Audit History
              </button>
            )}
          </div>
          
          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
            Showing {filteredItems.length} registry items
          </span>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <input
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              placeholder="Search by keywords (e.g. curtains, chairs)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              <option value="COUNTER_DECOR">Counter Decor</option>
              <option value="CLOTH_DECOR">Cloth Decor</option>
              <option value="RENTAL_ITEMS">Rental Items</option>
              <option value="EXPENSE_CHARGES">Expense & Charges</option>
              <option value="STAFF">Staff</option>
              <option value="OUTSIDE_RENTAL">Outside Rental</option>
            </select>
          </div>

          <div>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Render blocks */}
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading master catalog registries...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: Grid Cards View */}
          {activeTab === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredItems.map((item) => {
                const isUnderStock = item.currentStock < item.minimumStock;
                const progressPercentage = Math.min(100, (item.currentStock / item.minimumStock) * 100);

                return (
                  <Card key={item.itemCode} className={`flex flex-col gap-4 p-5 hover:shadow-md border transition relative ${isUnderStock ? 'border-red-200 bg-red-50/10' : 'border-[#E2E8F0] bg-white'}`}>
                    
                    {/* Flashing Reorder Indicator */}
                    {isUnderStock && (
                      <span className="absolute top-3 right-3 bg-red-100 text-red-700 border border-red-200 font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider animate-pulse flex items-center gap-1 z-10">
                        <span>⚠️</span> Reorder Alert
                      </span>
                    )}

                    {/* Image Block */}
                    <div className="w-full h-36 bg-slate-50 border border-slate-100 rounded-lg overflow-hidden flex items-center justify-center text-xs text-slate-400 relative">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>No Attached Photograph</span>
                      )}
                      
                      {/* Location Badge */}
                      <span className="absolute bottom-2 left-2 bg-slate-900/75 text-white px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase">
                        📍 {item.warehouse || 'Main Warehouse'}
                      </span>
                    </div>

                    {/* Metadata Details */}
                    <div className="flex flex-col gap-1 flex-1">
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        {item.category || 'General'}
                      </p>
                      <h4 className="font-extrabold text-slate-900 text-sm">{item.name}</h4>
                      <p className="font-mono text-xs text-blue-600 font-semibold mt-0.5">
                        CODE: {item.itemCode}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                        <div>Rent: <span className="font-bold text-slate-800">₹{item.rentalRate}/day</span></div>
                        <div>Sale: <span className="font-bold text-slate-800">₹{item.saleRate}</span></div>
                      </div>

                      {/* Stock indicator tracking bar */}
                      <div className="mt-3 flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                          <span>Stock: {item.currentStock} / {item.minimumStock} min</span>
                          <span className={isUnderStock ? 'text-red-600' : 'text-slate-500'}>
                            {Math.round(progressPercentage)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${isUnderStock ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} 
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-auto">
                      <span className={`px-2.5 py-0.5 border text-[9px] font-bold rounded uppercase tracking-wider ${getStatusBadgeClass(item.status)}`}>
                        {item.status || 'AVAILABLE'}
                      </span>

                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button
                            variant="secondary"
                            onClick={() => openEditModal(item)}
                            className="text-[9px] py-1 px-2 font-bold"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSubItemModalItem(item);
                              setSubItemInput(item.subItems ? item.subItems.join(', ') : '');
                            }}
                            className="text-[9px] py-1 px-2 font-bold text-blue-600"
                          >
                            Link
                          </Button>
                          <Button
                            onClick={() => handleDisable(item.itemCode)}
                            className="text-[9px] py-1 px-2 font-bold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
                          >
                            Disable
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
              {filteredItems.length === 0 && (
                <div className="col-span-full py-16 text-center">
                  <p className="text-slate-400 italic text-sm">No inventory items match search filters.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Table Excel Spread View */}
          {activeTab === 'table' && (
            <Card className="overflow-x-auto p-0 border border-[#E2E8F0] shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                    <th className="p-3">Item Detail</th>
                    <th className="p-3">Code</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Warehouse</th>
                    <th className="p-3 text-center">Stock Indicators</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Rates (Rent/Sale)</th>
                    {isAdmin && <th className="p-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const isUnderStock = item.currentStock < item.minimumStock;
                    return (
                      <tr key={item.itemCode} className={`border-b border-[#E2E8F0] hover:bg-slate-50/50 transition ${isUnderStock ? 'bg-red-50/5' : ''}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded border bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center text-[10px] text-slate-400">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>No Img</span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{item.name}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">{item.department.replace('_', ' ')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-blue-600 font-semibold">{item.itemCode}</td>
                        <td className="p-3 font-medium text-slate-500">{item.category || 'General'}</td>
                        <td className="p-3 text-slate-500 font-medium">📍 {item.warehouse || 'Main Warehouse'}</td>
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-bold px-2 py-0.5 rounded ${isUnderStock ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
                              {item.currentStock} / {item.minimumStock} min
                            </span>
                            {isUnderStock && <span className="text-[9px] text-red-500 font-bold uppercase">⚠️ Reorder stock</span>}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 border text-[9px] font-bold rounded uppercase tracking-wider ${getStatusBadgeClass(item.status)}`}>
                            {item.status || 'AVAILABLE'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <p className="font-bold text-slate-800">Rent: ₹{item.rentalRate}</p>
                          <p className="text-[10px] text-slate-400">Sale: ₹{item.saleRate}</p>
                        </td>
                        {isAdmin && (
                          <td className="p-3 text-right">
                            <div className="flex gap-1.5 justify-end">
                              <Button variant="secondary" onClick={() => openEditModal(item)} className="px-2 py-1 text-[10px] font-bold">
                                Edit
                              </Button>
                              <Button variant="danger" onClick={() => handleDisable(item.itemCode)} className="px-2 py-1 text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100">
                                Disable
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 7} className="py-12 text-center text-slate-400 italic">
                        No inventory registry records match current search parameters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          )}

          {/* TAB 3: Stock Transactions Audit History */}
          {activeTab === 'logs' && isAdmin && (
            <Card className="overflow-x-auto p-0 border border-[#E2E8F0] shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Item Code</th>
                    <th className="p-3">Adjustment</th>
                    <th className="p-3">State Log</th>
                    <th className="p-3">Warehouse</th>
                    <th className="p-3">Reason / Details</th>
                    <th className="p-3 text-right">Auditor</th>
                  </tr>
                </thead>
                <tbody>
                  {stockLogs.map((log) => {
                    const isPositive = log.difference >= 0;
                    return (
                      <tr key={log._id} className="border-b border-[#E2E8F0] bg-white hover:bg-slate-50 transition">
                        <td className="p-3 text-slate-500 font-medium">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="p-3 font-mono font-bold text-slate-700">{log.itemCode}</td>
                        <td className="p-3">
                          <div className="flex flex-col gap-0.5">
                            <span className={`font-extrabold text-xs ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                              {isPositive ? '+' : ''}{log.difference}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              (Stock: {log.previousStock} → {log.newStock})
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 border text-[9px] font-bold rounded uppercase ${getStatusBadgeClass(log.state)}`}>
                            {log.state}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-500">📍 {log.warehouse}</td>
                        <td className="p-3 font-semibold text-[#0F172A]">{log.reason}</td>
                        <td className="p-3 text-right">
                          <p className="font-bold text-slate-800">{log.modifiedBy?.name || 'System Auditor'}</p>
                          <p className="text-[10px] text-slate-400">{log.modifiedBy?.email || ''}</p>
                        </td>
                      </tr>
                    );
                  })}
                  {stockLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                        No recent stock log transactions found in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {/* Add Item Modal - Admin Only */}
      {isAdmin && (
        <Modal
          isOpen={isCreateModalOpen}
          title="📦 Register Catalog Item"
          description="Register a new inventory item to the master catalog database."
          onClose={() => setIsCreateModalOpen(false)}
        >
          <form onSubmit={handleCreateItemSubmit} className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Item Code"
                placeholder="DEC-105"
                value={newItemCode}
                onChange={(e: any) => setNewItemCode(e.target.value)}
                required
              />
              <Input
                label="Item Category"
                placeholder="Decorations"
                value={newItemCategory}
                onChange={(e: any) => setNewItemCategory(e.target.value)}
                required
              />
            </div>

            <Input
              label="Item Name"
              placeholder="Luxury Velvet Backdrop Curtain"
              value={newItemName}
              onChange={(e: any) => setNewItemName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Department</label>
                <select
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={newItemDept}
                  onChange={(e) => setNewItemDept(e.target.value)}
                >
                  <option value="COUNTER_DECOR">Counter Decor</option>
                  <option value="CLOTH_DECOR">Cloth Decor</option>
                  <option value="RENTAL_ITEMS">Rental Items</option>
                  <option value="EXPENSE_CHARGES">Expense & Charges</option>
                  <option value="STAFF">Staff</option>
                  <option value="OUTSIDE_RENTAL">Outside Rental</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Stock State Status</label>
                <select
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={newItemStatus}
                  onChange={(e: any) => setNewItemStatus(e.target.value)}
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="RESERVED">RESERVED</option>
                  <option value="LOADED">LOADED</option>
                  <option value="DISPATCHED">DISPATCHED</option>
                  <option value="RETURNED">RETURNED</option>
                  <option value="DAMAGED">DAMAGED</option>
                </select>
              </div>
            </div>

            <Input
              label="Warehouse Storage Location"
              placeholder="Warehouse A - Shelf 3"
              value={newItemWarehouse}
              onChange={(e: any) => setNewItemWarehouse(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Current Stock"
                type="number"
                placeholder="25"
                value={newItemStock}
                onChange={(e: any) => setNewItemStock(e.target.value)}
                required
              />
              <Input
                label="Minimum Stock Indicator"
                type="number"
                placeholder="5"
                value={newItemMinStock}
                onChange={(e: any) => setNewItemMinStock(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Rental Rate (₹/day)"
                type="number"
                placeholder="1500"
                value={newItemRent}
                onChange={(e: any) => setNewItemRent(e.target.value)}
                required
              />
              <Input
                label="Estimated Sale Value (₹)"
                type="number"
                placeholder="8000"
                value={newItemSale}
                onChange={(e: any) => setNewItemSale(e.target.value)}
                required
              />
            </div>

            <Input
              label="Photograph URL"
              placeholder="https://example.com/curtain.png"
              value={newItemImage}
              onChange={(e: any) => setNewItemImage(e.target.value)}
            />

            <Button type="submit" className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold" loading={createItemMutation.isPending}>
              Register Catalog Item
            </Button>
          </form>
        </Modal>
      )}

      {/* Edit Item Modal - Admin Only */}
      {isAdmin && editingItem && (
        <Modal
          isOpen={isEditModalOpen}
          title={`✏️ Edit: ${editingItem.name}`}
          description={`Update details for stock code: ${editingItem.itemCode}`}
          onClose={() => setIsEditModalOpen(false)}
        >
          <form onSubmit={handleEditItemSubmit} className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto pr-1">
            <Input
              label="Item Name"
              placeholder="Name"
              value={editName}
              onChange={(e: any) => setEditName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Department</label>
                <select
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={editDept}
                  onChange={(e: any) => setEditDept(e.target.value)}
                >
                  <option value="COUNTER_DECOR">Counter Decor</option>
                  <option value="CLOTH_DECOR">Cloth Decor</option>
                  <option value="RENTAL_ITEMS">Rental Items</option>
                  <option value="EXPENSE_CHARGES">Expense & Charges</option>
                  <option value="STAFF">Staff</option>
                  <option value="OUTSIDE_RENTAL">Outside Rental</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Stock State Status</label>
                <select
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={editStatus}
                  onChange={(e: any) => setEditStatus(e.target.value)}
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="RESERVED">RESERVED</option>
                  <option value="LOADED">LOADED</option>
                  <option value="DISPATCHED">DISPATCHED</option>
                  <option value="RETURNED">RETURNED</option>
                  <option value="DAMAGED">DAMAGED</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Item Category"
                placeholder="Decorations"
                value={editCategory}
                onChange={(e: any) => setEditCategory(e.target.value)}
                required
              />
              <Input
                label="Warehouse Storage Location"
                placeholder="Warehouse A"
                value={editWarehouse}
                onChange={(e: any) => setEditWarehouse(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Current Stock"
                type="number"
                placeholder="Stock"
                value={editStock}
                onChange={(e: any) => setEditStock(e.target.value)}
                required
              />
              <Input
                label="Minimum Stock Indicator"
                type="number"
                placeholder="Min Stock"
                value={editMinStock}
                onChange={(e: any) => setEditMinStock(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Rental Rate (₹/day)"
                type="number"
                placeholder="Rent Rate"
                value={editRent}
                onChange={(e: any) => setEditRent(e.target.value)}
                required
              />
              <Input
                label="Estimated Sale Value (₹)"
                type="number"
                placeholder="Sale Value"
                value={editSale}
                onChange={(e: any) => setEditSale(e.target.value)}
                required
              />
            </div>

            <Input
              label="Photograph URL"
              placeholder="https://example.com/curtain.png"
              value={editImage}
              onChange={(e: any) => setEditImage(e.target.value)}
            />

            <Button type="submit" className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold" loading={updateItemMutation.isPending}>
              Save Item Details
            </Button>
          </form>
        </Modal>
      )}

      {/* Sub Items Modal Window */}
      {isAdmin && subItemModalItem && (
        <Modal
          isOpen={!!subItemModalItem}
          title="🔗 Link Sub-Item Codes"
          description={`Associate supplementary item codes for: ${subItemModalItem?.name}`}
          onClose={() => setSubItemModalItem(null)}
        >
          <div className="flex flex-col gap-4">
            <Input
              label="Item Codes (comma-separated)"
              placeholder="DEC-002, DEC-003"
              value={subItemInput}
              onChange={(e: any) => setSubItemInput(e.target.value)}
            />
            <div className="flex gap-3 justify-end mt-2">
              <Button
                variant="ghost"
                onClick={() => setSubItemModalItem(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => saveSubitemsMutation.mutate({ 
                  itemCode: subItemModalItem.itemCode, 
                  codes: subItemInput.split(',').map(s => s.trim()).filter(Boolean) 
                })}
                loading={saveSubitemsMutation.isPending}
              >
                Save Sub-items Group
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
