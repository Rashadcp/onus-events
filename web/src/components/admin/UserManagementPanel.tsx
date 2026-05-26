"use client";

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, Edit2, Trash2, UserCheck, UserX, X } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Modal } from '../ui/Modal';
import { SectionHeader } from '../ui/SectionHeader';
import { createUser, getUsers, updateUser, apiFetch } from '../../utils/apiClient';
import { User } from '../../types';

export function UserManagementPanel() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [newRole, setNewRole] = useState<'ADMIN' | 'SALES_REPRESENTATIVE' | 'LOADING_STAFF' | 'SITE_INCHARGE' | 'CAPTAIN' | 'STORE_KEEPER'>('SALES_REPRESENTATIVE');

  // Edit User Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'ADMIN' | 'SALES_REPRESENTATIVE' | 'LOADING_STAFF' | 'SITE_INCHARGE' | 'CAPTAIN' | 'STORE_KEEPER'>('SALES_REPRESENTATIVE');

  // Query: Fetch all users
  const { data: allUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => getUsers(),
    placeholderData: []
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  // Mutation: Register a new user
  const registerMutation = useMutation({
    mutationFn: async (payload: any) => {
      return createUser(payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast(`User ${data.user.name} created successfully!`);
      setErrorMessage(null);
      setIsCreateModalOpen(false);
      resetCreateForm();
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to register new user.', 'error');
      setErrorMessage(err.message || 'Failed to register new user.');
    }
  });

  // Mutation: Update existing user details
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return updateUser(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('User details updated successfully!');
      setErrorMessage(null);
      setIsEditModalOpen(false);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to update user details.', 'error');
    }
  });

  // Mutation: Soft-disable or delete user
  const deleteMutation = useMutation({
    mutationFn: async ({ id, hardDelete }: { id: string; hardDelete?: boolean }) => {
      const query = hardDelete ? '?hardDelete=true' : '';
      return apiFetch(`/api/users/${id}${query}`, {
        method: 'DELETE'
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast(data.message || 'User removed successfully!');
      setErrorMessage(null);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to delete user.', 'error');
    }
  });

  const resetCreateForm = () => {
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewPassword('123456');
    setNewRole('SALES_REPRESENTATIVE');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const email = newEmail.trim().toLowerCase();
    const phone = newPhone.trim();
    const password = newPassword.trim();

    if (!name || !email || !phone || !password) {
      setErrorMessage('Please fill in all registration fields.');
      showToast('Please fill in all registration fields.', 'error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Please enter a valid email address, like rashad@onusevent.com.');
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    if (phone.length < 5) {
      setErrorMessage('Phone number must be at least 5 characters.');
      showToast('Phone number must be at least 5 characters.', 'error');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    setErrorMessage(null);
    registerMutation.mutate({
      name,
      email,
      phone,
      password,
      role: newRole
    });
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditName(user.name || user.fullName || '');
    setEditEmail(user.email);
    setEditPhone(user.phone || '');
    setEditRole(user.role as any);
    setEditPassword('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const payload: any = {
      name: editName,
      email: editEmail,
      phone: editPhone,
      role: editRole
    };

    if (editPassword) {
      payload.password = editPassword;
    }

    updateMutation.mutate({
      id: (editingUser.id || editingUser._id) as string,
      payload
    });
  };

  const toggleUserStatus = (user: User) => {
    const id = (user.id || user._id) as string;
    const currentActive = user.isActive !== false;
    updateMutation.mutate({
      id,
      payload: { isActive: !currentActive }
    });
  };

  const handleDelete = (user: User) => {
    const id = (user.id || user._id) as string;
    const name = user.name || user.fullName || 'User';
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteMutation.mutate({ id, hardDelete: false });
    }
  };

  // Filter and Search Logic
  const filteredUsers = allUsers.filter((user) => {
    const nameStr = (user.name || user.fullName || '').toLowerCase();
    const emailStr = user.email.toLowerCase();
    const phoneStr = (user.phone || '').toLowerCase();
    const matchesSearch =
      nameStr.includes(searchTerm.toLowerCase()) ||
      emailStr.includes(searchTerm.toLowerCase()) ||
      phoneStr.includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    
    const userActive = user.isActive !== false;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && userActive) ||
      (statusFilter === 'DISABLED' && !userActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'SALES_REPRESENTATIVE':
      case 'REPRESENTATIVE':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'LOADING_STAFF':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SITE_INCHARGE':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'CAPTAIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'STORE_KEEPER':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {toast && (
        <div className="fixed right-5 top-5 z-[150] w-[min(360px,calc(100vw-2.5rem))]">
          <div
            className={`flex items-start gap-3 rounded-lg border bg-white px-4 py-3 shadow-xl shadow-slate-900/10 ${
              toast.type === 'success'
                ? 'border-emerald-200 text-emerald-800'
                : 'border-red-200 text-red-800'
            }`}
          >
            <div
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                toast.type === 'success' ? 'bg-emerald-50' : 'bg-red-50'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            </div>
            <p className="min-w-0 flex-1 text-sm font-medium leading-5">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <SectionHeader
        title="Enterprise User Directory"
        description="Search, manage permissions, assign roles, and administer active system users across all departments."
      />

      {/* Search & Filters Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm">
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Search Keywords</label>
          <input
            type="text"
            className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Role Filter</label>
          <select
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All System Roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SALES_REPRESENTATIVE">SALES_REPRESENTATIVE</option>
            <option value="LOADING_STAFF">LOADING_STAFF</option>
            <option value="SITE_INCHARGE">SITE_INCHARGE</option>
            <option value="CAPTAIN">CAPTAIN</option>
            <option value="STORE_KEEPER">STORE_KEEPER</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Status Filter</label>
          <select
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All States</option>
            <option value="ACTIVE">Active Users Only</option>
            <option value="DISABLED">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* Add Action Button */}
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
          Found {filteredUsers.length} total user records
        </p>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 text-xs py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm">
          <span>➕</span> Add System User
        </Button>
      </div>

      {/* Main Table */}
      <Card className="overflow-hidden p-0 border border-[#E2E8F0] shadow-sm">
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading user catalog...</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Headers */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(230px,2fr)_120px_160px_100px_132px] gap-3 px-5 py-3 border-b border-[#E2E8F0] bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-400">
              <div>User Details</div>
              <div>Contact Phone</div>
              <div>Assigned Role</div>
              <div>Account State</div>
              <div className="text-right">Actions</div>
            </div>

            {/* List */}
            {paginatedUsers.map((user) => {
              const isActive = user.isActive !== false;
              return (
                <div
                  key={user.id || user._id}
                  className="grid grid-cols-1 lg:grid-cols-[minmax(230px,2fr)_120px_160px_100px_132px] gap-3 px-5 py-3 border-b border-[#E2E8F0] bg-white text-xs items-center hover:bg-slate-50/50 transition"
                >
                  <div className="flex flex-col gap-0.5">
                    <p className="font-bold text-slate-900 text-sm">{user.name || user.fullName}</p>
                    <p className="text-slate-400 text-xs">{user.email}</p>
                  </div>
                  <div className="font-mono text-slate-600">
                    {user.phone || '—'}
                  </div>
                  <div>
                    <span className={`inline-flex max-w-full px-2 py-0.5 border text-[9px] font-bold rounded uppercase tracking-wider ${getRoleBadgeClass(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                  <div>
                    <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded uppercase ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-start lg:justify-end gap-1.5 flex-nowrap">
                    <Button
                      variant="ghost"
                      onClick={() => openEditModal(user)}
                      className="h-8 w-8 rounded-md border-slate-200 bg-white p-0 text-slate-600 shadow-none hover:bg-slate-100"
                      title="Edit user"
                      aria-label="Edit user"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      onClick={() => toggleUserStatus(user)}
                      className={`h-8 w-8 rounded-md p-0 border shadow-none transition ${
                        isActive
                          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title={isActive ? 'Suspend user' : 'Activate user'}
                      aria-label={isActive ? 'Suspend user' : 'Activate user'}
                    >
                      {isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDelete(user)}
                      className="h-8 w-8 rounded-md border-red-100 bg-red-50 p-0 text-red-600 shadow-none hover:bg-red-100"
                      title="Delete user"
                      aria-label="Delete user"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-slate-400 italic text-sm">No users match the search filters.</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm">
        <Button
          variant="secondary"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-3.5 py-1.5 text-xs font-bold"
        >
          Previous
        </Button>
        <span className="text-xs text-slate-500 font-medium">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="secondary"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="px-3.5 py-1.5 text-xs font-bold"
        >
          Next
        </Button>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        title="➕ Create System User"
        description="Register a new credential account for system access."
        onClose={() => setIsCreateModalOpen(false)}
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
          {errorMessage && <Alert message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />}
          <Input label="Name" placeholder="John Doe" value={newName} onChange={(e: any) => setNewName(e.target.value)} required />
          <Input label="Email Address" type="email" placeholder="john@onus-event.com" value={newEmail} onChange={(e: any) => setNewEmail(e.target.value)} required />
          <Input label="Phone Number" placeholder="9876543210" value={newPhone} onChange={(e: any) => setNewPhone(e.target.value)} required />
          <Input label="Initial Password" placeholder="Password (min 6 characters)" value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)} required />
          
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Assign Organization Role</label>
            <select
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              value={newRole}
              onChange={(e: any) => setNewRole(e.target.value)}
            >
              <option value="SALES_REPRESENTATIVE">SALES_REPRESENTATIVE</option>
              <option value="LOADING_STAFF">LOADING_STAFF</option>
              <option value="SITE_INCHARGE">SITE_INCHARGE</option>
              <option value="CAPTAIN">CAPTAIN</option>
              <option value="STORE_KEEPER">STORE_KEEPER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          <Button type="submit" className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold" loading={registerMutation.isPending}>
            Create User Account
          </Button>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        title="✏️ Update User Account"
        description="Modify user contact profile or assign new permission roles."
        onClose={() => setIsEditModalOpen(false)}
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <Input label="Name" placeholder="Full Name" value={editName} onChange={(e: any) => setEditName(e.target.value)} required />
          <Input label="Email Address" type="email" placeholder="email@onus-event.com" value={editEmail} onChange={(e: any) => setEditEmail(e.target.value)} required />
          <Input label="Phone Number" placeholder="Phone" value={editPhone} onChange={(e: any) => setEditPhone(e.target.value)} required />
          <Input label="New Password (Optional)" placeholder="Leave blank to keep current" value={editPassword} onChange={(e: any) => setEditPassword(e.target.value)} />

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Assign Organization Role</label>
            <select
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              value={editRole}
              onChange={(e: any) => setEditRole(e.target.value)}
            >
              <option value="SALES_REPRESENTATIVE">SALES_REPRESENTATIVE</option>
              <option value="LOADING_STAFF">LOADING_STAFF</option>
              <option value="SITE_INCHARGE">SITE_INCHARGE</option>
              <option value="CAPTAIN">CAPTAIN</option>
              <option value="STORE_KEEPER">STORE_KEEPER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          <Button type="submit" className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold" loading={updateMutation.isPending}>
            Save Changes
          </Button>
        </form>
      </Modal>
    </div>
  );
}
