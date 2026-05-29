"use client";

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Trash2, UserCheck, UserX } from 'lucide-react';
import { User } from '../../types';
import { createUser, deleteUser, getUsers, updateUser } from '../../utils/apiClient';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { SectionHeader } from '../ui/SectionHeader';
import { toast } from 'react-hot-toast';

interface RepresentativesPanelProps {
  initialUsers?: User[];
}

const INCENTIVE_RATE = 0.05;
const money = (value?: number) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

export function RepresentativesPanel({ initialUsers = [] }: RepresentativesPanelProps) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('123456');
  const [monthlyBilling, setMonthlyBilling] = useState('0');
  const [incentiveRate, setIncentiveRate] = useState('5');

  const { data: representatives = [] } = useQuery<User[]>({
    queryKey: ['users', 'SALES_REPRESENTATIVE'],
    queryFn: () => getUsers('SALES_REPRESENTATIVE'),
    initialData: initialUsers.filter((user) => user.role === 'SALES_REPRESENTATIVE' || user.role === 'REPRESENTATIVE'),
  });

  const resetForm = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('123456');
    setMonthlyBilling('0');
    setIncentiveRate('5');
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setName(user.name || user.fullName || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setPassword('');
    setMonthlyBilling(String(user.monthlyBilling || 0));
    setIncentiveRate(String(user.incentiveRate ?? 5));
    setIsModalOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Sales representative created successfully.');
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to create representative.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<User> & { password?: string } }) => updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Sales representative updated successfully.');
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to update representative.'),
  });

  const disableMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Sales representative disabled successfully.');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to disable representative.'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateUser(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Representative status updated.');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to update status.'),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const billing = Number(monthlyBilling || 0);
    const rate = Number(incentiveRate || 0);

    if (!cleanName || !cleanEmail || !cleanPhone) {
      toast.error('Name, email, and phone are required.');
      return;
    }

    if (editingUser) {
      const payload: Partial<User> & { password?: string; incentiveRate?: number } = {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: 'SALES_REPRESENTATIVE',
        monthlyBilling: billing,
        incentiveRate: rate,
      };
      if (password.trim()) payload.password = password.trim();
      updateMutation.mutate({ id: (editingUser.id || editingUser._id) as string, payload });
      return;
    }

    if (!password.trim()) {
      toast.error('Initial password is required.');
      return;
    }

    createMutation.mutate({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      password: password.trim(),
      role: 'SALES_REPRESENTATIVE',
      monthlyBilling: billing,
      incentiveRate: rate,
    });
  };

  const totals = representatives.reduce(
    (acc, rep) => {
      const billing = rep.monthlyBilling || 0;
      acc.billing += billing;
      acc.incentive += billing * ((rep.incentiveRate ?? 5) / 100);
      return acc;
    },
    { billing: 0, incentive: 0 }
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Sales Representatives"
        description="Manage representatives and track monthly billing for incentive calculation."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Representatives</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{representatives.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Monthly Billing</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{money(totals.billing)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Estimated Incentive</p>
          <p className="mt-2 text-2xl font-black text-emerald-600">{money(totals.incentive)}</p>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={openCreateModal} className="gap-2 bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Add Representative
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 lg:grid-cols-[minmax(240px,2fr)_140px_150px_150px_120px]">
          <div>Representative</div>
          <div>Phone</div>
          <div className="text-right">Monthly Billing</div>
          <div className="text-right">Calculated Incentive</div>
          <div className="text-right">Actions</div>
        </div>

        {representatives.map((rep) => {
          const id = (rep.id || rep._id) as string;
          const isActive = rep.isActive !== false;
          const billing = rep.monthlyBilling || 0;
          return (
            <div
              key={id}
              className={`grid grid-cols-1 items-center gap-3 border-b border-slate-100 px-5 py-4 text-sm transition hover:bg-slate-50/70 lg:grid-cols-[minmax(240px,2fr)_140px_150px_150px_120px] ${
                !isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full font-bold flex items-center justify-center text-sm shrink-0 border ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 border-blue-100' 
                    : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  {((rep.name || rep.fullName || 'U').charAt(0)).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{rep.name || rep.fullName}</p>
                  <p className="text-xs font-medium text-slate-400">{rep.email}</p>
                </div>
              </div>
              <div className="font-mono text-xs font-semibold text-slate-600">{rep.phone || '-'}</div>
              <div className="text-right font-bold text-slate-900">{money(billing)}</div>
              <div className="text-right font-bold text-emerald-600">
                <div>{money(billing * ((rep.incentiveRate ?? 5) / 100))}</div>
                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">({rep.incentiveRate ?? 5}% rate)</div>
              </div>
              <div className="flex justify-start gap-2 lg:justify-end">
                <button
                  type="button"
                  onClick={() => openEditModal(rep)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-600 shadow-sm hover:bg-blue-50"
                  aria-label="Edit representative"
                >
                  <Edit2 className="h-4.5 w-4.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleStatusMutation.mutate({ id, isActive: !isActive })}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm ${
                    isActive
                      ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                  aria-label={isActive ? 'Disable representative' : 'Activate representative'}
                >
                  {isActive ? <UserX className="h-4.5 w-4.5" /> : <UserCheck className="h-4.5 w-4.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Disable ${rep.name || rep.fullName}?`)) disableMutation.mutate(id);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 shadow-sm hover:bg-red-100"
                  aria-label="Disable representative"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          );
        })}

        {representatives.length === 0 && (
          <div className="px-5 py-14 text-center text-sm font-medium text-slate-400">
            No sales representatives created yet.
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        title={editingUser ? 'Edit Representative' : 'Add Representative'}
        description="Set account details and monthly billing used for incentive calculation."
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Full Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Input label="Email Address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input label="Phone Number" value={phone} onChange={(event) => setPhone(event.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Monthly Billing (Rs.)"
              type="number"
              min="0"
              value={monthlyBilling}
              onChange={(event) => setMonthlyBilling(event.target.value)}
              required
            />
            <Input
              label="Incentive Rate (%)"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={incentiveRate}
              onChange={(event) => setIncentiveRate(event.target.value)}
              required
            />
          </div>
          <Input
            label={editingUser ? 'New Password (Optional)' : 'Initial Password'}
            type="text"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required={!editingUser}
          />

          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Incentive Preview</p>
            <p className="mt-1 text-lg font-black text-emerald-700">
              {money(Number(monthlyBilling || 0) * (Number(incentiveRate || 0) / 100))}
            </p>
          </div>

          <Button
            type="submit"
            className="mt-2 w-full bg-blue-600 py-3 font-bold text-white hover:bg-blue-700"
            loading={createMutation.isPending || updateMutation.isPending}
          >
            {editingUser ? 'Save Representative' : 'Create Representative'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
