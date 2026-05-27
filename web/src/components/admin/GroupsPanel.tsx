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
  ChevronDown
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
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { SectionHeader } from '../ui/SectionHeader';

const PRESET_COLORS = [
  '#f59e0b', '#8b5cf6', '#3b82f6', '#ef4444',
  '#10b981', '#6b7280', '#f97316', '#06b6d4',
  '#ec4899', '#84cc16', '#0ea5e9', '#a855f7'
];

export function GroupsPanel() {
  const queryClient = useQueryClient();

  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ItemGroup | null>(null);

  // Form state
  const [fLabel, setFLabel] = useState('');
  const [fKey, setFKey] = useState('');
  const [fDescription, setFDescription] = useState('');
  const [fColor, setFColor] = useState('#3b82f6');
  const [fSortOrder, setFSortOrder] = useState('100');

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: groups = [], isLoading } = useQuery<ItemGroup[]>({
    queryKey: ['groups', 'admin'],
    queryFn: () => getGroupsApi(true), // include inactive
    placeholderData: []
  });

  const resetForm = () => {
    setEditingGroup(null);
    setFLabel('');
    setFKey('');
    setFDescription('');
    setFColor('#3b82f6');
    setFSortOrder('100');
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (group: ItemGroup) => {
    setEditingGroup(group);
    setFLabel(group.label);
    setFKey(group.key);
    setFDescription(group.description || '');
    setFColor(group.color || '#3b82f6');
    setFSortOrder(String(group.sortOrder ?? 100));
    setIsModalOpen(true);
  };

  // Auto-generate key from label
  const handleLabelChange = (val: string) => {
    setFLabel(val);
    if (!editingGroup) {
      setFKey(val.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, ''));
    }
  };

  const createMutation = useMutation({
    mutationFn: createGroupApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setMessage(`Group "${data.group.label}" created successfully.`);
      setErrorMessage(null);
      setIsModalOpen(false);
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
      setIsModalOpen(false);
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
    const cleanLabel = fLabel.trim();
    const cleanKey = fKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const cleanDescription = fDescription.trim();
    const sortOrder = parseInt(fSortOrder) || 100;

    if (!cleanLabel || !cleanKey) {
      setErrorMessage('Group name and key are required.');
      return;
    }

    if (editingGroup) {
      updateMutation.mutate({
        id: editingGroup._id,
        payload: { label: cleanLabel, description: cleanDescription, color: fColor, sortOrder }
      });
    } else {
      createMutation.mutate({ key: cleanKey, label: cleanLabel, description: cleanDescription, color: fColor, sortOrder });
    }
  };

  const handleMoveUp = (group: ItemGroup, idx: number) => {
    if (idx === 0) return;
    const prev = groups[idx - 1];
    moveSortOrderMutation.mutate({ id: group._id, sortOrder: prev.sortOrder - 1 });
  };

  const handleMoveDown = (group: ItemGroup, idx: number) => {
    if (idx === groups.length - 1) return;
    const next = groups[idx + 1];
    moveSortOrderMutation.mutate({ id: group._id, sortOrder: next.sortOrder + 1 });
  };

  const defaultCount = groups.filter(g => g.isDefault).length;
  const customCount = groups.filter(g => !g.isDefault).length;
  const activeCount = groups.filter(g => g.isActive).length;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Item Groups"
        description="Manage the department groups that appear in the Create Event wizard. Custom groups let you organise inventory items into new categories."
      />

      {message && <Alert message={message} type="success" onClose={() => setMessage(null)} />}
      {errorMessage && <Alert message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Groups</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{groups.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Active Groups</p>
          <p className="mt-2 text-3xl font-black text-emerald-600">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Custom Groups</p>
          <p className="mt-2 text-3xl font-black text-blue-600">{customCount}</p>
        </Card>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <Layers className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <div className="text-sm text-blue-700">
          <p className="font-bold">How it works</p>
          <p className="font-medium text-blue-600 mt-0.5">
            Groups you create here appear as sections in the <strong>Create Event</strong> form. Assign inventory items to a group in the Inventory panel. The {defaultCount} built-in groups cannot be deleted but can be disabled.
          </p>
        </div>
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-2 bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Add Custom Group
        </Button>
      </div>

      {/* Groups Table */}
      <Card className="overflow-hidden p-0">
        <div className="hidden grid-cols-[28px_minmax(200px,2fr)_140px_200px_100px_120px] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:grid">
          <div>#</div>
          <div>Group Name</div>
          <div>Key</div>
          <div>Description</div>
          <div className="text-center">Status</div>
          <div className="text-right">Actions</div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-14">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          </div>
        )}

        {groups.map((group, idx) => (
          <div
            key={group._id}
            className={`grid grid-cols-1 gap-3 border-b border-slate-100 px-5 py-4 text-sm transition hover:bg-slate-50/70 sm:grid-cols-[28px_minmax(200px,2fr)_140px_200px_100px_120px] sm:items-center ${!group.isActive ? 'opacity-50' : ''}`}
          >
            {/* Order controls */}
            <div className="flex flex-col items-center gap-0.5">
              <button
                onClick={() => handleMoveUp(group, idx)}
                disabled={idx === 0}
                className="rounded p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-20"
                aria-label="Move up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleMoveDown(group, idx)}
                disabled={idx === groups.length - 1}
                className="rounded p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-20"
                aria-label="Move down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Name & color */}
            <div className="flex items-center gap-2.5">
              <span
                className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white shadow-sm"
                style={{ backgroundColor: group.color || '#3b82f6' }}
              />
              <div>
                <p className="font-bold text-slate-900">{group.label}</p>
                {group.isDefault && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                    <Lock className="h-2.5 w-2.5" /> Built-in
                  </span>
                )}
              </div>
            </div>

            {/* Key badge */}
            <div>
              <code className="rounded-md bg-slate-100 px-2 py-1 text-xs font-mono font-semibold text-slate-600">
                {group.key}
              </code>
            </div>

            {/* Description */}
            <p className="truncate text-xs text-slate-500 font-medium">
              {group.description || '—'}
            </p>

            {/* Status toggle */}
            <div className="flex justify-start sm:justify-center">
              <button
                onClick={() => toggleActiveMutation.mutate({ id: group._id, isActive: !group.isActive })}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                  group.isActive
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                aria-label={group.isActive ? 'Disable group' : 'Enable group'}
              >
                {group.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                {group.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-start gap-2 sm:justify-end">
              <button
                onClick={() => openEdit(group)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-600 shadow-sm hover:bg-blue-50"
                aria-label="Edit group"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setConfirmDeleteId(group._id)}
                disabled={group.isDefault}
                title={group.isDefault ? 'Built-in groups cannot be deleted' : 'Delete group'}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Delete group"
              >
                {group.isDefault ? <Lock className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ))}

        {!isLoading && groups.length === 0 && (
          <div className="py-14 text-center text-sm font-medium text-slate-400">
            No groups found. Loading defaults on first connection…
          </div>
        )}
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        title={editingGroup ? `Edit Group: ${editingGroup.label}` : 'Create New Item Group'}
        description="This group will appear as a department section in the Create Event form."
        onClose={() => { setIsModalOpen(false); resetForm(); }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Group Name"
            value={fLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="e.g. Sound System"
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Group Key (auto-generated, unique)
            </label>
            <input
              type="text"
              value={fKey}
              onChange={(e) => !editingGroup && setFKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
              disabled={!!editingGroup}
              placeholder="SOUND_SYSTEM"
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm font-bold text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 font-medium">Key cannot be changed after creation. Must be unique.</p>
          </div>

          <Input
            label="Description (optional)"
            value={fDescription}
            onChange={(e) => setFDescription(e.target.value)}
            placeholder="Briefly describe what goes in this group"
          />

          {/* Color picker */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Group Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFColor(color)}
                  className={`h-7 w-7 rounded-full transition-all ${fColor === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-5 w-5 rounded-full border border-slate-200" style={{ backgroundColor: fColor }} />
              <input
                type="text"
                value={fColor}
                onChange={(e) => setFColor(e.target.value)}
                className="w-28 rounded-md border border-slate-200 px-2 py-1 font-mono text-xs font-semibold text-slate-600 focus:border-blue-400 focus:outline-none"
                placeholder="#3b82f6"
              />
            </div>
          </div>

          <Input
            label="Sort Order (lower = appears first)"
            type="number"
            min="0"
            max="999"
            value={fSortOrder}
            onChange={(e) => setFSortOrder(e.target.value)}
          />

          {/* Preview */}
          <div
            className="flex items-center gap-3 rounded-xl border px-4 py-3"
            style={{ borderColor: fColor + '55', backgroundColor: fColor + '11' }}
          >
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: fColor }} />
            <div>
              <p className="text-sm font-extrabold" style={{ color: fColor }}>{fLabel || 'Group Name'}</p>
              <p className="text-xs font-medium text-slate-500">{fDescription || 'Group description appears here'}</p>
            </div>
          </div>

          <Button
            type="submit"
            className="mt-2 w-full bg-blue-600 py-3 font-bold text-white hover:bg-blue-700"
            loading={createMutation.isPending || updateMutation.isPending}
          >
            {editingGroup ? 'Save Changes' : 'Create Group'}
          </Button>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Delete this group?</h3>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              This group will be permanently removed. Inventory items using this group will retain their group key but the group section will no longer appear in Create Event.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDeleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
