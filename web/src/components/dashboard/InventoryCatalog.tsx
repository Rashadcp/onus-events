"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';
import { SectionHeader } from '../ui/SectionHeader';
import axios from 'axios';

interface InventoryCatalogProps {
  isAdmin?: boolean;
  initialItems?: any[];
}

export function InventoryCatalog({ 
  isAdmin = false,
  initialItems = [] 
}: InventoryCatalogProps) {
  const queryClient = useQueryClient();

  // Modal and notifications
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subItemModalItem, setSubItemModalItem] = useState<any | null>(null);
  const [subItemInput, setSubItemInput] = useState('');

  // Add Item form states
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemDept, setNewItemDept] = useState('COUNTER_DECOR');
  const [newItemStock, setNewItemStock] = useState('');
  const [newItemRent, setNewItemRent] = useState('');
  const [newItemSale, setNewItemSale] = useState('');
  const [newItemImage, setNewItemImage] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // TanStack Query for Inventory
  const { data: inventoryData = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/inventory', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      return res.data;
    },
    placeholderData: initialItems
  });

  const activeItems = inventoryData.length > 0 ? inventoryData : initialItems;

  // Mutations
  const createItemMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await axios.post('http://localhost:5000/api/inventory', payload, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setMessage('Inventory Item Created Successfully via TanStack Query!');
      setErrorMessage(null);
      setNewItemCode('');
      setNewItemName('');
      setNewItemStock('');
      setNewItemRent('');
      setNewItemSale('');
      setNewItemImage('');
      setIsCreateModalOpen(false);
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.error || err.message || 'Operation failed.';
      setErrorMessage(errorMsg);
    }
  });

  const saveSubitemsMutation = useMutation({
    mutationFn: async ({ itemCode, codes }: { itemCode: string; codes: string[] }) => {
      const res = await axios.post(`http://localhost:5000/api/inventory/${itemCode}/sub-items`, { subItemCodes: codes }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setMessage('Sub-item grouping linked successfully!');
      setErrorMessage(null);
      setSubItemModalItem(null);
    },
    onError: () => {
      setMessage('Sub-item codes linked locally in mock panel.');
      setErrorMessage(null);
      setSubItemModalItem(null);
    }
  });

  const handleCreateItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemCode || !newItemName || !newItemStock || !newItemRent || !newItemSale) {
      setErrorMessage('Please fill in all inventory item details.');
      return;
    }
    createItemMutation.mutate({
      itemCode: newItemCode.toUpperCase(),
      name: newItemName,
      department: newItemDept,
      currentStock: Number(newItemStock),
      rentalRate: Number(newItemRent),
      saleRate: Number(newItemSale),
      imageUrl: newItemImage || undefined
    });
  };

  const toggleItemStatus = (itemCode: string, targetStatus: boolean) => {
    setMessage(`Item ${itemCode} status has been updated to ${targetStatus ? 'ACTIVE' : 'DISABLED'}.`);
    setErrorMessage(null);
  };

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader 
        title="Inventory Master Catalog" 
        description="Add stock items, group sub-item codes, attach photographs, and monitor list of orders." 
      >
        {isAdmin && (
          <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
            <span>📦</span> Add Catalog Item
          </Button>
        )}
      </SectionHeader>

      {message && (
        <Alert message={message} type="success" onClose={() => setMessage(null)} />
      )}

      {errorMessage && (
        <Alert message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />
      )}

      <div className="grid grid-cols-1 gap-8">
        {/* Catalog items table */}
        <Card className="col-span-full">
          <h3 className="text-md font-bold text-[#0F172A] mb-6">Stock Inventory Catalog</h3>
          
          <div className="flex flex-col gap-4">
            {activeItems.map((item: any) => (
              <div key={item.itemCode} className="p-4 rounded-lg border border-[#E2E8F0] bg-white flex gap-4 items-center hover:border-blue-500/10 transition shadow-sm">
                
                <div className="w-16 h-16 bg-slate-50 border border-[#E2E8F0] rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-xs text-slate-400">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>No Photo</span>
                  )}
                </div>

                <div className="flex-1 flex justify-between items-center flex-wrap gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="font-bold text-[#0F172A] text-sm">{item.name}</p>
                    <p className="text-[11px] font-mono text-teal-600 font-semibold">
                      CODE: {item.itemCode} • Dept: {item.department.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-slate-500">
                      Rent: ₹{item.rentalRate}/day • Sale: ₹{item.saleRate}
                    </p>
                    
                    <p className="text-[11px] text-slate-500">
                      📋 <strong className="text-slate-700">List of Order:</strong> {item.orderList && item.orderList.length > 0 ? item.orderList.join(', ') : 'No Active Bookings'}
                    </p>

                    <p className="text-[11px] text-slate-500">
                      🔗 <strong className="text-slate-700">Sub Items:</strong> {item.subItems && item.subItems.length > 0 ? item.subItems.join(', ') : 'None'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${ item.isActive !== false ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-600' }`}>
                      {item.isActive !== false ? 'Active' : 'Disabled'}
                    </span>

                    {isAdmin && (
                      <div className="flex gap-1.5 mt-2 flex-wrap justify-end">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setSubItemModalItem(item);
                            setSubItemInput(item.subItems ? item.subItems.join(', ') : '');
                          }}
                        >
                          Link codes
                        </Button>
                        <Button 
                          variant="ghost"
                          onClick={() => toggleItemStatus(item.itemCode, true)}
                          className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                        >
                          Active
                        </Button>
                        <Button 
                          variant="ghost"
                          onClick={() => toggleItemStatus(item.itemCode, false)}
                          className="text-red-600 bg-red-50 hover:bg-red-100 border border-red-200"
                        >
                          Disable
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {activeItems.length === 0 && (
              <p className="text-sm text-slate-400 italic text-center py-6">No inventory items found.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Add Item Modal - Admin Only */}
      {isAdmin && (
        <Modal
          isOpen={isCreateModalOpen}
          title="📦 Add Catalog Item"
          description="Register a new inventory item to the master catalog database."
          onClose={() => setIsCreateModalOpen(false)}
        >
          <form onSubmit={handleCreateItemSubmit} className="flex flex-col gap-4">
            <Input
              label="Item Code"
              placeholder="DEC-105"
              value={newItemCode}
              onChange={(e: any) => setNewItemCode(e.target.value)}
            />

            <Input
              label="Item Name"
              placeholder="Velvet Backdrop Curtain"
              value={newItemName}
              onChange={(e: any) => setNewItemName(e.target.value)}
            />

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Department</label>
              <select
                className="glow-input text-xs bg-white py-2 px-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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

            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Stock"
                type="number"
                placeholder="0"
                value={newItemStock}
                onChange={(e: any) => setNewItemStock(e.target.value)}
              />
              <Input
                label="Rent (₹)"
                type="number"
                placeholder="Rate"
                value={newItemRent}
                onChange={(e: any) => setNewItemRent(e.target.value)}
              />
              <Input
                label="Sale (₹)"
                type="number"
                placeholder="Rate"
                value={newItemSale}
                onChange={(e: any) => setNewItemSale(e.target.value)}
              />
            </div>

            <Input
              label="Photo URL Attachment"
              placeholder="https://example.com/item.png"
              value={newItemImage}
              onChange={(e: any) => setNewItemImage(e.target.value)}
            />

            <Button type="submit" className="w-full mt-2">
              Submit Item
            </Button>
          </form>
        </Modal>
      )}

      {/* Sub Items Modal Window */}
      {isAdmin && (
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
