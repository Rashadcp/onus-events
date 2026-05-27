"use client";

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Edit2,
  Layers,
  Lock,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronUp,
  ChevronDown,
  FolderPlus,
  FolderOpen,
  ArrowUp,
  ArrowDown,
  X,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import {
  ItemGroup,
  getGroupsApi,
  createGroupApi,
  updateGroupApi,
  deleteGroupApi
} from '../../services/api';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface GroupsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GroupsManagerModal({ isOpen, onClose }: GroupsManagerModalProps) {
  const queryClient = useQueryClient();

  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form editing state
  const [editingGroup, setEditingGroup] = useState<ItemGroup | null>(null);

  // Simple, intuitive form states (Auto-generating key and using default sort weights behind the scenes)
  const [fLabel, setFLabel] = useState('');
  const [fDescription, setFDescription] = useState('');

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Fetch groups list (including inactive for admin management)
  const { data: groups = [], isLoading } = useQuery<ItemGroup[]>({
    queryKey: ['groups', 'admin'],
    queryFn: () => getGroupsApi(true),
    placeholderData: [],
    enabled: isOpen
  });

  const resetForm = () => {
    setEditingGroup(null);
    setFLabel('');
    setFDescription('');
  };

  const handleEditGroup = (group: ItemGroup) => {
    setEditingGroup(group);
    setFLabel(group.label);
    setFDescription(group.description || '');
    setMessage(null);
    setErrorMessage(null);
  };

  const createMutation = useMutation({
    mutationFn: createGroupApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setMessage(`Group "${data.group.label}" created successfully.`);
      setErrorMessage(null);
      resetForm();
    },
    onError: (err: any) => setErrorMessage(err.message || err.error || 'Failed to create group.')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateGroupApi(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setMessage(`Group "${data.group.label}" updated successfully.`);
      setErrorMessage(null);
      resetForm();
    },
    onError: (err: any) => setErrorMessage(err.message || err.error || 'Failed to update group.')
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGroupApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setMessage('Group deleted successfully.');
      setErrorMessage(null);
      setConfirmDeleteId(null);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMessage(err.message || err.error || 'Failed to delete group.');
      setConfirmDeleteId(null);
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateGroupApi(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (err: any) => setErrorMessage(err.message || err.error || 'Failed to update group status.')
  });

  const moveSortOrderMutation = useMutation({
    mutationFn: ({ id, sortOrder }: { id: string; sortOrder: number }) => updateGroupApi(id, { sortOrder }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] })
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Capitalize first letter of each word (Title Case)
    const toTitleCase = (str: string) => {
      return str
        .toLowerCase()
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    const cleanLabel = toTitleCase(fLabel.trim());
    const cleanDescription = fDescription.trim();

    if (!cleanLabel) {
      setErrorMessage('Group name is required.');
      return;
    }

    if (editingGroup) {
      updateMutation.mutate({
        id: editingGroup._id,
        payload: { 
          label: cleanLabel, 
          description: cleanDescription, 
          color: editingGroup.color || '#3b82f6', 
          sortOrder: editingGroup.sortOrder ?? 100 
        }
      });
    } else {
      // Auto-generate key from label and assign standard sort weight
      const generatedKey = cleanLabel.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
      const maxSortOrder = groups.length > 0 ? Math.max(...groups.map(g => g.sortOrder || 100)) : 100;
      
      createMutation.mutate({ 
        key: generatedKey, 
        label: cleanLabel, 
        description: cleanDescription, 
        color: '#3b82f6', 
        sortOrder: maxSortOrder + 10 
      });
    }
  };

  const handleMoveUp = (group: ItemGroup, idx: number) => {
    if (idx === 0) return;
    const prev = groups[idx - 1];
    moveSortOrderMutation.mutate({ id: group._id, sortOrder: (prev.sortOrder || 100) - 1 });
  };

  const handleMoveDown = (group: ItemGroup, idx: number) => {
    if (idx === groups.length - 1) return;
    const next = groups[idx + 1];
    moveSortOrderMutation.mutate({ id: group._id, sortOrder: (next.sortOrder || 100) + 1 });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6" role="dialog" aria-modal="true">
      {/* Dimmed Backdrop */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} aria-hidden="true" />

      {/* Main Dialog Box - Perfectly Centered, Sleek Single-Column Layout */}
      <div className="relative bg-white border border-slate-200/80 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 leading-tight">Manage Inventory Groups</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                Organize wizard catalog departments and event sheets.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer transition shrink-0 shadow-sm"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          
          {/* Dynamic Notifications */}
          {message && <Alert message={message} type="success" onClose={() => setMessage(null)} />}
          {errorMessage && <Alert message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />}

          {/* SECTION 1: INLINE ACTION FORM - EXTREMELY CLEAN AND FOCUSED */}
          <div className={`p-4 rounded-xl border transition-all duration-300 ${
            editingGroup 
              ? 'border-amber-200 bg-amber-50/20 shadow-sm ring-1 ring-amber-400/10' 
              : 'border-slate-100 bg-slate-50/60'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                {editingGroup ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-amber-700">Editing Group: {editingGroup.label}</span>
                  </>
                ) : (
                  <>
                    <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Create Custom Group</span>
                  </>
                )}
              </h4>
              {editingGroup && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_auto] gap-3 items-end">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={fLabel}
                  onChange={(e) => setFLabel(e.target.value)}
                  placeholder="e.g. Lighting System"
                  required
                  className="w-full text-xs font-bold text-slate-700 rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                  Short Description (optional)
                </label>
                <input
                  type="text"
                  value={fDescription}
                  onChange={(e) => setFDescription(e.target.value)}
                  placeholder="e.g. Stage spotlights & led panels"
                  className="w-full text-xs text-slate-700 rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="w-full sm:w-auto">
                <Button
                  type="submit"
                  className={`w-full text-xs py-2 px-4 font-bold text-white rounded-lg transition shrink-0 ${
                    editingGroup ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  loading={createMutation.isPending || updateMutation.isPending}
                >
                  {editingGroup ? 'Update' : 'Add Group'}
                </Button>
              </div>
            </form>
          </div>

          {/* SECTION 2: LISTING & REARRANGING VIEW */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>Active List & Order</span>
              </h4>
              <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {groups.length} total
              </span>
            </div>

            {/* Scrollable List Container */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1.5 custom-scrollbar">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                </div>
              ) : groups.length === 0 ? (
                <div className="py-12 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                  No groups configured yet. Add one above!
                </div>
              ) : (
                groups.map((group, idx) => {
                  const isSelected = editingGroup?._id === group._id;
                  return (
                    <div
                      key={group._id}
                      className={`flex items-center justify-between gap-4 p-3 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? 'border-amber-400 bg-amber-50/20 shadow-sm ring-1 ring-amber-400/20'
                          : 'border-slate-100 bg-white hover:bg-slate-50/50 hover:border-slate-200 hover:shadow-xs'
                      } ${!group.isActive ? 'opacity-60 bg-slate-50/40' : ''}`}
                    >
                      {/* Left: Reordering buttons & Info */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Up/Down buttons side-by-side for sleek desktop, stacked for tight layout */}
                        <div className="flex items-center gap-0.5 shrink-0 bg-slate-50 border border-slate-100 p-0.5 rounded-lg">
                          <button
                            onClick={() => handleMoveUp(group, idx)}
                            disabled={idx === 0}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-20 disabled:hover:bg-transparent transition"
                            title="Move Up (Higher priority)"
                            aria-label="Move up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(group, idx)}
                            disabled={idx === groups.length - 1}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-20 disabled:hover:bg-transparent transition"
                            title="Move Down (Lower priority)"
                            aria-label="Move down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Name and description details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-extrabold text-xs text-slate-700 truncate">{group.label}</p>
                            {group.isDefault && (
                              <span className="inline-flex items-center text-[8px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 border border-slate-200/50 px-1 py-0.5 rounded shrink-0">
                                <Lock className="h-2 w-2 mr-0.5" /> Built-in
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                            {group.description || 'No description provided'}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Status Toggle Switch (iOS Capsule Style) */}
                        <button
                          onClick={() => toggleActiveMutation.mutate({ id: group._id, isActive: !group.isActive })}
                          className={`w-9 h-5 rounded-full relative transition-colors duration-200 ease-in-out shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer ${
                            group.isActive ? 'bg-emerald-500' : 'bg-slate-200'
                          }`}
                          title={group.isActive ? 'Disable Group' : 'Enable Group'}
                          aria-label={group.isActive ? 'Disable Group' : 'Enable Group'}
                        >
                          <span
                            className={`block w-4 h-4 rounded-full bg-white absolute top-0.5 left-0.5 shadow-sm transition-transform duration-200 ease-in-out transform ${
                              group.isActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        {/* Edit Action */}
                        <button
                          onClick={() => handleEditGroup(group)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-blue-600 transition"
                          title="Modify details"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete Action */}
                        <button
                          onClick={() => setConfirmDeleteId(group._id)}
                          className="p-1.5 rounded-lg border border-red-100 bg-red-50 text-red-500 shadow-sm hover:bg-red-100 transition"
                          title="Delete Group"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Embedded Confirm Delete Overlay */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 border border-red-100">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">Delete this group?</h3>
            <p className="mt-1.5 text-xs text-slate-400 font-semibold leading-relaxed">
              This action is permanent. All catalog items belonging to this group will remain intact, but this group section will no longer be listed in the wizard.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDeleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
