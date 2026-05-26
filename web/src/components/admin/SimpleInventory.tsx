"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Package, 
  Filter, 
  AlertTriangle 
} from 'lucide-react';

import { Item } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  getInventoryApi, 
  createItemApi, 
  updateItemApi, 
  deleteItemApi 
} from '../../services/api';

// Atomic Reusable UI Components
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';

export function SimpleInventory() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  // Notifications
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Add Item Modal form states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemDept, setNewItemDept] = useState<'COUNTER_DECOR' | 'CLOTH_DECOR' | 'RENTAL_ITEMS' | 'EXPENSE_CHARGES' | 'STAFF' | 'OUTSIDE_RENTAL'>('RENTAL_ITEMS');
  const [newItemCategory, setNewItemCategory] = useState('General');
  const [newItemWarehouse, setNewItemWarehouse] = useState('Main Warehouse');
  const [newItemStock, setNewItemStock] = useState('');
  const [newItemMinStock, setNewItemMinStock] = useState('5');
  const [newItemRent, setNewItemRent] = useState('');
  const [newItemSale, setNewItemSale] = useState('0');
  const [newItemStatus, setNewItemStatus] = useState<'AVAILABLE' | 'RESERVED' | 'LOADED' | 'DISPATCHED' | 'RETURNED' | 'DAMAGED'>('AVAILABLE');

  // Edit Item Modal form states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState<'COUNTER_DECOR' | 'CLOTH_DECOR' | 'RENTAL_ITEMS' | 'EXPENSE_CHARGES' | 'STAFF' | 'OUTSIDE_RENTAL'>('RENTAL_ITEMS');
  const [editCategory, setEditCategory] = useState('General');
  const [editWarehouse, setEditWarehouse] = useState('Main Warehouse');
  const [editStock, setEditStock] = useState('');
  const [editMinStock, setEditMinStock] = useState('5');
  const [editRent, setEditRent] = useState('');
  const [editSale, setEditSale] = useState('0');
  const [editStatus, setEditStatus] = useState<'AVAILABLE' | 'RESERVED' | 'LOADED' | 'DISPATCHED' | 'RETURNED' | 'DAMAGED'>('AVAILABLE');

  // Fetch Inventory items via React Query
  const { data: inventory = [], isLoading } = useQuery<Item[]>({
    queryKey: ['inventory'],
    queryFn: getInventoryApi,
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
      isActive: true
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
        isActive: true
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
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 text-xs py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm font-bold cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Catalog Item
          </Button>
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
              <option value="COUNTER_DECOR">Counter Decor</option>
              <option value="CLOTH_DECOR">Cloth Decor</option>
              <option value="RENTAL_ITEMS">Rental Items</option>
              <option value="EXPENSE_CHARGES">Expense & Charges</option>
              <option value="STAFF">Staff</option>
              <option value="OUTSIDE_RENTAL">Outside Rental</option>
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
          <h3 className="font-bold text-slate-800 text-sm">Active Registry Items ({filteredItems.length})</h3>
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
                  <th className="p-4 text-right">Rental Rate (₹/day)</th>
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
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-slate-400 font-extrabold uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.department.replace('_', ' ')}
                            </span>
                            <span className="text-[9px] text-slate-400 font-semibold">
                              {item.category || 'General'}
                            </span>
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
                          <span className={`font-bold px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                            isLowStock 
                              ? 'bg-red-50 text-red-700 border border-red-100' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.currentStock} / {item.minimumStock} min
                          </span>
                          {isLowStock && (
                            <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> Reorder Alert
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rental Rate */}
                      <td className="p-4 text-right font-bold text-slate-800 text-sm">
                        ₹{item.rentalRate.toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 text-[9px] font-bold rounded-md uppercase tracking-wider ${getStatusBadge(item.status)}`}>
                          {item.status || 'AVAILABLE'}
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
                      colSpan={isAdmin ? 6 : 5} 
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
          title="📦 Register Inventory Item"
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
                  <option value="COUNTER_DECOR">Counter Decor</option>
                  <option value="CLOTH_DECOR">Cloth Decor</option>
                  <option value="RENTAL_ITEMS">Rental Items</option>
                  <option value="EXPENSE_CHARGES">Expense & Charges</option>
                  <option value="STAFF">Staff</option>
                  <option value="OUTSIDE_RENTAL">Outside Rental</option>
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
                label="Rental Rate (₹/day)"
                type="number"
                placeholder="40"
                value={newItemRent}
                onChange={(e: any) => setNewItemRent(e.target.value)}
                min="0"
                required
              />
              <Input 
                label="Estimated Sale Value (₹)"
                type="number"
                placeholder="0"
                value={newItemSale}
                onChange={(e: any) => setNewItemSale(e.target.value)}
                min="0"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full mt-3 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm cursor-pointer"
              loading={createItemMutation.isPending}
            >
              Register Catalog Item
            </Button>
          </form>
        </Modal>
      )}

      {/* Edit Item Modal - Admin Only */}
      {isAdmin && editingItem && (
        <Modal
          isOpen={isEditModalOpen}
          title={`✏️ Edit Item: ${editingItem.itemCode}`}
          description="Modify specific fields for this catalog record."
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingItem(null);
            setErrorMessage(null);
          }}
        >
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
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
                  <option value="COUNTER_DECOR">Counter Decor</option>
                  <option value="CLOTH_DECOR">Cloth Decor</option>
                  <option value="RENTAL_ITEMS">Rental Items</option>
                  <option value="EXPENSE_CHARGES">Expense & Charges</option>
                  <option value="STAFF">Staff</option>
                  <option value="OUTSIDE_RENTAL">Outside Rental</option>
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
                label="Rental Rate (₹/day)"
                type="number"
                value={editRent}
                onChange={(e: any) => setEditRent(e.target.value)}
                min="0"
                required
              />
              <Input 
                label="Estimated Sale Value (₹)"
                type="number"
                value={editSale}
                onChange={(e: any) => setEditSale(e.target.value)}
                min="0"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full mt-3 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm cursor-pointer"
              loading={updateItemMutation.isPending}
            >
              Save Item Changes
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
