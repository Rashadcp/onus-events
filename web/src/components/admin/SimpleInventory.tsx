"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Package, 
  Filter, 
  AlertTriangle,
  ImagePlus,
  X,
  Loader2,
  CheckCircle2,
  Layers,
  Lock,
  ToggleLeft,
  ToggleRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

import { Item } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  getInventoryApi, 
  createItemApi, 
  updateItemApi, 
  deleteItemApi,
  getGroupsApi,
  createGroupApi,
  updateGroupApi,
  deleteGroupApi,
  ItemGroup
} from '../../services/api';
import { uploadImageToS3 } from '../../utils/s3Upload';

// Atomic Reusable UI Components
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';
import { GroupsManagerModal } from './GroupsManagerModal';

const formatMoney = (value?: number) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

export function SimpleInventory() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  // Notifications
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // S3 upload state
  const [uploadingNewItem, setUploadingNewItem] = useState(false);
  const [uploadingEditItem, setUploadingEditItem] = useState(false);

  // Group management modal state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Add Item Modal form states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemDept, setNewItemDept] = useState<string>('RENTAL_ITEMS');
  const [newItemCategory, setNewItemCategory] = useState('General');
  const [newItemWarehouse, setNewItemWarehouse] = useState('Main Warehouse');
  const [newItemStock, setNewItemStock] = useState('');
  const [newItemMinStock, setNewItemMinStock] = useState('5');
  const [newItemRent, setNewItemRent] = useState('');
  const [newItemSale, setNewItemSale] = useState('0');
  const [newItemStatus, setNewItemStatus] = useState<'AVAILABLE' | 'RESERVED' | 'LOADED' | 'DISPATCHED' | 'RETURNED' | 'DAMAGED'>('AVAILABLE');
  const [newItemSubItems, setNewItemSubItems] = useState<string[]>([]);
  const [newItemOrderList, setNewItemOrderList] = useState('');
  const [newItemImageUrl, setNewItemImageUrl] = useState('');
  const [newItemIsActive, setNewItemIsActive] = useState(true);

  // Edit Item Modal form states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState<string>('RENTAL_ITEMS');
  const [editCategory, setEditCategory] = useState('General');
  const [editWarehouse, setEditWarehouse] = useState('Main Warehouse');
  const [editStock, setEditStock] = useState('');
  const [editMinStock, setEditMinStock] = useState('5');
  const [editRent, setEditRent] = useState('');
  const [editSale, setEditSale] = useState('0');
  const [editStatus, setEditStatus] = useState<'AVAILABLE' | 'RESERVED' | 'LOADED' | 'DISPATCHED' | 'RETURNED' | 'DAMAGED'>('AVAILABLE');
  const [editSubItems, setEditSubItems] = useState<string[]>([]);
  const [editOrderList, setEditOrderList] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  // Fetch Inventory items via React Query
  const { data: inventory = [], isLoading } = useQuery<Item[]>({
    queryKey: ['inventory'],
    queryFn: () => getInventoryApi({ includeInactive: true }),
    placeholderData: []
  });

  // Fetch active groups for department dropdowns
  const { data: groups = [] } = useQuery<ItemGroup[]>({
    queryKey: ['groups'],
    queryFn: () => getGroupsApi(false),
    placeholderData: []
  });


  // Mutation: Create catalog item
  const createItemMutation = useMutation({
    mutationFn: createItemApi,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setMessage(`Item "${newItemName}" has been successfully added to inventory.`);
      setErrorMessage(null);
      resetAddForm();
      setIsAddModalOpen(false);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to create inventory item.');
    }
  });

  // Mutation: Update catalog item
  const updateItemMutation = useMutation({
    mutationFn: ({ itemCode, payload }: { itemCode: string; payload: Item }) => updateItemApi(itemCode, payload),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setMessage(`Item details updated successfully.`);
      setErrorMessage(null);
      setIsEditModalOpen(false);
      setEditingItem(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update inventory item.');
    }
  });

  // Mutation: Disable catalog item
  const deleteItemMutation = useMutation({
    mutationFn: deleteItemApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setMessage('Item disabled successfully.');
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to disable item.');
    }
  });

  // Reset forms
  const resetAddForm = () => {
    setNewItemCode('');
    setNewItemName('');
    setNewItemDept('RENTAL_ITEMS');
    setNewItemCategory('General');
    setNewItemWarehouse('Main Warehouse');
    setNewItemStock('');
    setNewItemMinStock('5');
    setNewItemRent('');
    setNewItemSale('0');
    setNewItemStatus('AVAILABLE');
    setNewItemSubItems([]);
    setNewItemOrderList('');
    setNewItemImageUrl('');
    setNewItemIsActive(true);
  };

  const orderLinesFromText = (value: string) => {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  };

  const handlePhotoUpload = async (
    file: File | undefined,
    onChange: (value: string) => void,
    setUploading: (v: boolean) => void
  ) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (JPG, PNG, WebP, etc.).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image must be smaller than 10 MB.');
      return;
    }

    try {
      setUploading(true);
      const publicUrl = await uploadImageToS3(file, 'inventory');
      onChange(publicUrl);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload image to S3. Check your AWS credentials in .env');
    } finally {
      setUploading(false);
    }
  };

  const toggleCode = (code: string, selectedCodes: string[], onChange: (codes: string[]) => void) => {
    onChange(
      selectedCodes.includes(code)
        ? selectedCodes.filter((itemCode) => itemCode !== code)
        : [...selectedCodes, code]
    );
  };

  // Submit Handlers
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemCode || !newItemName || !newItemStock || !newItemRent) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    createItemMutation.mutate({
      itemCode: newItemCode.toUpperCase().trim(),
      name: newItemName.trim(),
      department: newItemDept,
      category: newItemCategory.trim(),
      warehouse: newItemWarehouse.trim(),
      currentStock: Number(newItemStock),
      minimumStock: Number(newItemMinStock),
      rentalRate: Number(newItemRent),
      saleRate: Number(newItemSale),
      status: newItemStatus,
      subItems: newItemSubItems,
      imageUrl: newItemImageUrl,
      orderList: orderLinesFromText(newItemOrderList),
      isActive: newItemIsActive
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editName || !editStock || !editRent) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    updateItemMutation.mutate({
      itemCode: editingItem.itemCode,
      payload: {
        itemCode: editingItem.itemCode,
        name: editName.trim(),
        department: editDept,
        category: editCategory.trim(),
        warehouse: editWarehouse.trim(),
        currentStock: Number(editStock),
        minimumStock: Number(editMinStock),
        rentalRate: Number(editRent),
        saleRate: Number(editSale),
        status: editStatus,
        subItems: editSubItems,
        imageUrl: editImageUrl,
        orderList: orderLinesFromText(editOrderList),
        isActive: editIsActive
      }
    });
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDept(item.department);
    setEditCategory(item.category || 'General');
    setEditWarehouse(item.warehouse || 'Main Warehouse');
    setEditStock(String(item.currentStock));
    setEditMinStock(String(item.minimumStock));
    setEditRent(String(item.rentalRate));
    setEditSale(String(item.saleRate || 0));
    setEditStatus(item.status || 'AVAILABLE');
    setEditSubItems(item.subItems || []);
    setEditOrderList((item.orderList || []).join('\n'));
    setEditImageUrl(item.imageUrl || '');
    setEditIsActive(item.isActive !== false);
    setIsEditModalOpen(true);
  };

  const handleDisable = (itemCode: string) => {
    if (confirm(`Are you sure you want to disable item: ${itemCode}?`)) {
      deleteItemMutation.mutate(itemCode);
    }
  };

  // Filter & Search Implementation
  const filteredItems = inventory.filter((item) => {
    const nameMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const codeMatch = item.itemCode.toLowerCase().includes(searchTerm.toLowerCase());
    const searchMatch = nameMatch || codeMatch;

    const deptMatch = deptFilter === 'ALL' || item.department === deptFilter;
    const statusMatch = statusFilter === 'ALL' || item.status === statusFilter;

    return searchMatch && deptMatch && statusMatch;
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'AVAILABLE':
      case 'RETURNED':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'RESERVED':
      case 'LOADED':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'DISPATCHED':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      case 'DAMAGED':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  const renderSubItemPicker = (
    currentItemCode: string,
    selectedCodes: string[],
    onChange: (codes: string[]) => void
  ) => {
    const selectableItems = inventory.filter((item) => item.itemCode !== currentItemCode.toUpperCase().trim());

    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sub Items</label>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">Item codes are loaded automatically from inventory.</p>
          </div>
          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
            {selectedCodes.length} linked
          </span>
        </div>

        {selectedCodes.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedCodes.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => toggleCode(code, selectedCodes, onChange)}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100"
              >
                {code}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}

        <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white">
          {selectableItems.map((item) => (
            <label
              key={item.itemCode}
              className="flex cursor-pointer items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0 hover:bg-slate-50"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-slate-800">{item.name}</span>
                <span className="font-mono text-[11px] font-bold text-blue-600">{item.itemCode}</span>
              </span>
              <input
                type="checkbox"
                checked={selectedCodes.includes(item.itemCode)}
                onChange={() => toggleCode(item.itemCode, selectedCodes, onChange)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
            </label>
          ))}
          {selectableItems.length === 0 && (
            <p className="px-3 py-6 text-center text-xs font-medium text-slate-400">No other item codes available yet.</p>
          )}
        </div>
      </div>
    );
  };

  const renderPhotoUpload = (
    imageUrl: string,
    onChange: (value: string) => void,
    uploading: boolean,
    setUploading: (v: boolean) => void
  ) => (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Photo Upload (S3)</label>
      <div className="mt-3 grid gap-3 sm:grid-cols-[96px_1fr]">
        {/* Preview */}
        <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {uploading ? (
            <div className="flex flex-col items-center gap-1">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="text-[10px] font-bold text-blue-500">Uploading…</span>
            </div>
          ) : imageUrl && !imageUrl.startsWith('data:') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Inventory item preview" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-7 w-7 text-slate-300" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          {/* File picker — uploads to S3 on change */}
          <label className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition ${
            uploading
              ? 'border-blue-200 bg-blue-50 text-blue-400 cursor-wait'
              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700'
          }`}>
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            {uploading ? 'Uploading to S3…' : 'Choose & Upload Image'}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(event) => handlePhotoUpload(event.target.files?.[0], onChange, setUploading)}
              className="sr-only"
            />
          </label>

          {/* Manual URL fallback */}
          <input
            type="url"
            placeholder="Or paste image URL directly…"
            value={imageUrl.startsWith('data:') ? '' : imageUrl}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />

          {/* Status */}
          {imageUrl && !uploading && !imageUrl.startsWith('data:') && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[11px] font-bold text-emerald-600 truncate max-w-[240px]">{imageUrl}</span>
              <button
                type="button"
                onClick={() => onChange('')}
                className="ml-auto text-xs font-bold text-red-500 hover:text-red-600 shrink-0"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );


  return (
    <div className="flex flex-col gap-6">
      {/* Notifications */}
      {message && <Alert message={message} type="success" onClose={() => setMessage(null)} />}
      {errorMessage && <Alert message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />}

      {/* Header Info Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0F172A] flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Simple Inventory Registry
          </h2>
          <p className="text-xs text-slate-400 font-medium">Verify stock availability, minimum reserves, and rate catalogs.</p>
        </div>
        
        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              onClick={() => setIsGroupModalOpen(true)}
              className="flex items-center gap-2 text-xs py-2.5 px-4 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 rounded-lg shadow-sm font-bold cursor-pointer transition shrink-0"
            >
              <Layers className="w-4 h-4 text-slate-500" /> Manage Groups
            </Button>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 text-xs py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm font-bold cursor-pointer transition shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Catalog Item
            </Button>
          </div>
        )}
      </div>

      {/* Search and Filters panel */}
      <Card className="p-5 border border-slate-200/80 bg-white shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
          <Filter className="w-3.5 h-3.5" /> Filtering & Search Controls
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search keywords */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by Item Name or Code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition placeholder:text-slate-400"
            />
          </div>

          {/* Department filter */}
          <div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-600 font-medium"
            >
              <option value="ALL">All Departments</option>
              {groups.map(g => (
                <option key={g.key} value={g.key}>{g.label}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-600 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="RESERVED">RESERVED</option>
              <option value="LOADED">LOADED</option>
              <option value="DISPATCHED">DISPATCHED</option>
              <option value="RETURNED">RETURNED</option>
              <option value="DAMAGED">DAMAGED</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Catalog Registry Card */}
      <Card className="overflow-hidden p-0 border border-slate-200/80 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm">Inventory Registry Items ({filteredItems.length})</h3>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            ERP Core System Sync
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading catalog items...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                  <th className="p-4 pl-6">Item Name</th>
                  <th className="p-4">Item Code</th>
                  <th className="p-4 text-center">Stock Level</th>
                  <th className="p-4 text-right">Rental Rate (Rs./day)</th>
                  <th className="p-4 text-right">Sale Rate</th>
                  <th className="p-4 text-center">Status</th>
                  {isAdmin && <th className="p-4 pr-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isLowStock = item.currentStock < item.minimumStock;
                  return (
                    <tr 
                      key={item.itemCode} 
                      className={`border-b border-slate-100 hover:bg-slate-50/40 transition-colors ${!item.isActive ? 'opacity-50' : ''}`}
                    >
                      {/* Item Name & Details */}
                      <td className="p-4 pl-6">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-5 w-5 text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-[9px] text-slate-400 font-extrabold uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                                {item.department.replace('_', ' ')}
                              </span>
                              <span className="text-[9px] text-slate-400 font-semibold">
                                {item.category || 'General'}
                              </span>
                            </div>
                            {Boolean(item.subItems?.length || item.orderList?.length) && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {item.subItems?.slice(0, 3).map((code) => (
                                  <span key={code} className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-blue-700">
                                    {code}
                                  </span>
                                ))}
                                {item.orderList?.slice(0, 2).map((order) => (
                                  <span key={order} className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                                    {order}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Item Code */}
                      <td className="p-4 font-mono font-bold text-blue-600 text-sm">
                        {item.itemCode}
                      </td>

                      {/* Stock Level */}
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          {item.currentStock <= 0 ? (
                            <span className="bg-red-600 text-white font-extrabold px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider animate-pulse flex items-center gap-1 shadow-sm">
                              <AlertTriangle className="w-3 h-3 text-white" /> Out of Stock
                            </span>
                          ) : (
                            <>
                              <span className={`font-bold px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                                isLowStock 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {item.currentStock} / {item.minimumStock} min
                              </span>
                              {isLowStock && (
                                <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider flex items-center gap-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Low Stock
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      {/* Rental Rate */}
                      <td className="p-4 text-right font-bold text-slate-800 text-sm">
                        {formatMoney(item.rentalRate)}
                      </td>

                      {/* Sale Rate */}
                      <td className="p-4 text-right font-bold text-slate-600 text-sm">
                        {formatMoney(item.saleRate)}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 text-[9px] font-bold rounded-md uppercase tracking-wider ${
                          item.isActive === false ? 'bg-red-50 text-red-700 border border-red-200' : getStatusBadge(item.status)
                        }`}>
                          {item.isActive === false ? 'DISABLED' : item.status || 'AVAILABLE'}
                        </span>
                      </td>

                      {/* Actions */}
                      {isAdmin && (
                        <td className="p-4 pr-6 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button 
                              variant="ghost" 
                              onClick={() => openEditModal(item)}
                              className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-blue-600 rounded-lg hover:scale-[1.02] shadow-sm flex items-center justify-center cursor-pointer"
                              aria-label="Edit item"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="danger" 
                              onClick={() => handleDisable(item.itemCode)}
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg hover:scale-[1.02] shadow-sm flex items-center justify-center cursor-pointer"
                              aria-label="Disable item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr>
                    <td 
                      colSpan={isAdmin ? 7 : 6} 
                      className="py-16 text-center text-slate-400 italic text-sm"
                    >
                      No active items match the current search filters in this catalog view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Item Modal - Admin Only */}
      {isAdmin && (
        <Modal
          isOpen={isAddModalOpen}
          title="Register Inventory Item"
          description="Enter specific details to register a new catalog record."
          onClose={() => {
            setIsAddModalOpen(false);
            setErrorMessage(null);
          }}
        >
          <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input 
                label="Item Code (Unique)"
                placeholder="RNT-105"
                value={newItemCode}
                onChange={(e: any) => setNewItemCode(e.target.value)}
                required
              />
              <Input 
                label="Category"
                placeholder="Furniture"
                value={newItemCategory}
                onChange={(e: any) => setNewItemCategory(e.target.value)}
              />
            </div>

            <Input 
              label="Item Name"
              placeholder="Golden Chiavari Accent Chair"
              value={newItemName}
              onChange={(e: any) => setNewItemName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Department</label>
                <select
                  value={newItemDept}
                  onChange={(e: any) => setNewItemDept(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
                >
                  {groups.map(g => (
                    <option key={g.key} value={g.key}>{g.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Initial Status</label>
                <select
                  value={newItemStatus}
                  onChange={(e: any) => setNewItemStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
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
              label="Warehouse Location"
              placeholder="Main Warehouse - Sector B"
              value={newItemWarehouse}
              onChange={(e: any) => setNewItemWarehouse(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input 
                label="Current Stock"
                type="number"
                placeholder="100"
                value={newItemStock}
                onChange={(e: any) => setNewItemStock(e.target.value)}
                min="0"
                required
              />
              <Input 
                label="Minimum Stock Indicator"
                type="number"
                placeholder="5"
                value={newItemMinStock}
                onChange={(e: any) => setNewItemMinStock(e.target.value)}
                min="0"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input 
                label="Rental Rate (Rs./day)"
                type="number"
                placeholder="40"
                value={newItemRent}
                onChange={(e: any) => setNewItemRent(e.target.value)}
                min="0"
                required
              />
              <Input 
                label="Estimated Sale Value (Rs.)"
                type="number"
                placeholder="0"
                value={newItemSale}
                onChange={(e: any) => setNewItemSale(e.target.value)}
                min="0"
              />
            </div>

            {renderSubItemPicker(newItemCode, newItemSubItems, setNewItemSubItems)}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">List of Orders</label>
              <textarea
                value={newItemOrderList}
                onChange={(e) => setNewItemOrderList(e.target.value)}
                placeholder="Enter one order reference per line"
                className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {renderPhotoUpload(newItemImageUrl, setNewItemImageUrl, uploadingNewItem, setUploadingNewItem)}

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setNewItemIsActive(true)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                  newItemIsActive
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setNewItemIsActive(false)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                  !newItemIsActive
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                Disable
              </button>
              <Button 
                type="submit" 
                className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                loading={createItemMutation.isPending || uploadingNewItem}
                disabled={uploadingNewItem}
              >
                {uploadingNewItem ? 'Uploading image…' : 'Submit'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Item Modal - Admin Only */}
      {isAdmin && editingItem && (
        <Modal
          isOpen={isEditModalOpen}
          title={`Edit Item: ${editingItem.itemCode}`}
          description="Modify specific fields for this catalog record."
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingItem(null);
            setErrorMessage(null);
          }}
        >
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <Input 
              label="Item Code"
              value={editingItem.itemCode}
              disabled
            />

            <Input 
              label="Item Name"
              value={editName}
              onChange={(e: any) => setEditName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Department</label>
                <select
                  value={editDept}
                  onChange={(e: any) => setEditDept(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
                >
                  {groups.map(g => (
                    <option key={g.key} value={g.key}>{g.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</label>
                <select
                  value={editStatus}
                  onChange={(e: any) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
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

            <div className="grid grid-cols-2 gap-3">
              <Input 
                label="Category"
                value={editCategory}
                onChange={(e: any) => setEditCategory(e.target.value)}
              />
              <Input 
                label="Warehouse Location"
                value={editWarehouse}
                onChange={(e: any) => setEditWarehouse(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input 
                label="Current Stock"
                type="number"
                value={editStock}
                onChange={(e: any) => setEditStock(e.target.value)}
                min="0"
                required
              />
              <Input 
                label="Minimum Stock Indicator"
                type="number"
                value={editMinStock}
                onChange={(e: any) => setEditMinStock(e.target.value)}
                min="0"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input 
                label="Rental Rate (Rs./day)"
                type="number"
                value={editRent}
                onChange={(e: any) => setEditRent(e.target.value)}
                min="0"
                required
              />
              <Input 
                label="Estimated Sale Value (Rs.)"
                type="number"
                value={editSale}
                onChange={(e: any) => setEditSale(e.target.value)}
                min="0"
              />
            </div>

            {renderSubItemPicker(editingItem.itemCode, editSubItems, setEditSubItems)}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">List of Orders</label>
              <textarea
                value={editOrderList}
                onChange={(e) => setEditOrderList(e.target.value)}
                placeholder="Enter one order reference per line"
                className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {renderPhotoUpload(editImageUrl, setEditImageUrl, uploadingEditItem, setUploadingEditItem)}

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setEditIsActive(true)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                  editIsActive
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setEditIsActive(false)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                  !editIsActive
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                Disable
              </button>
              <Button 
                type="submit" 
                className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                loading={updateItemMutation.isPending || uploadingEditItem}
                disabled={uploadingEditItem}
              >
                Submit
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Group Manager Modal */}
      <GroupsManagerModal 
        isOpen={isGroupModalOpen} 
        onClose={() => setIsGroupModalOpen(false)} 
      />
    </div>
  );
}
