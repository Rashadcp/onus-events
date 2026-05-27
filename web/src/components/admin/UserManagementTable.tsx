"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { getUsers, updateUser, deleteUser, apiFetch } from '../../utils/apiClient';
import { toast } from 'react-hot-toast';

interface UserManagementTableProps {
  role: 'SITE_INCHARGE' | 'REPRESENTATIVE' | 'LOADING_STAFF';
  roleDisplayName: string;
  initialUsers?: any[];
  renderExtraInfo?: (user: any) => React.ReactNode;
}

export function UserManagementTable({ role, roleDisplayName, initialUsers = [], renderExtraInfo }: UserManagementTableProps) {
  const queryClient = useQueryClient();
  
  // Registration State
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [newStaffUser, setNewStaffUser] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPass, setNewStaffPass] = useState('123');

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPass, setEditPass] = useState('');

  // Queries
  const { data: users = initialUsers } = useQuery({
    queryKey: ['users', role],
    queryFn: () => getUsers(role),
    initialData: initialUsers.filter(u => u.role === role)
  });

  // Mutations
  const registerMutation = useMutation({
    mutationFn: async (payload: any) => {
      // Direct apiFetch for register as it's under auth
      return apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users', role] });
      toast.success(`New ${roleDisplayName} registered successfully!`);
      setIsRegModalOpen(false);
      resetRegForm();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to register user.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: any }) => {
      return updateUser(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', role] });
      toast.success(`${roleDisplayName} details updated successfully!`);
      setIsEditModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update user.');
    }
  });

  const disableMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteUser(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', role] });
      toast.success(`${roleDisplayName} disabled successfully!`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to disable user.');
    }
  });

  const resetRegForm = () => {
    setNewStaffUser('');
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffPass('123');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffUser || !newStaffName || !newStaffEmail) {
      toast.error('Please fill all required fields.');
      return;
    }
    registerMutation.mutate({
      username: newStaffUser.toLowerCase(),
      email: newStaffEmail,
      fullName: newStaffName,
      password: newStaffPass,
      role: role
    });
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditName(user.fullName);
    setEditEmail(user.email);
    setEditPass(''); // Leave blank unless they want to change it
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      fullName: editName,
      email: editEmail,
    };
    if (editPass) {
      payload.password = editPass;
    }
    updateMutation.mutate({ id: editingUser.id || editingUser._id, payload });
  };

  const handleDisable = (user: any) => {
    if (confirm(`Are you sure you want to disable ${user.fullName}?`)) {
      disableMutation.mutate(user.id || user._id);
    }
  };

  // Only show active users if isActive exists, otherwise show all (for mocked initial data)
  const activeUsers = users.filter((u: any) => u.isActive !== false);

  return (
    <div className="flex flex-col gap-6">
      
      <div className="flex justify-end mb-2">
        <Button onClick={() => setIsRegModalOpen(true)} className="flex items-center gap-2">
          <span>➕</span> Add {roleDisplayName}
        </Button>
      </div>

      <Card>
        <h3 className="text-md font-bold text-[#0F172A] mb-6">Active {roleDisplayName}s</h3>
        
        <div className="flex flex-col gap-4">
          {activeUsers.map((user: any) => (
            <div key={user.id || user._id} className="p-4 rounded-lg border border-[#E2E8F0] bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-sm hover:shadow-md transition gap-4">
              <div>
                <p className="font-bold text-[#0F172A]">{user.fullName}</p>
                <p className="text-xs text-slate-500">📧 {user.email} • Username: {user.username}</p>
              </div>
              
              <div className="flex items-center gap-6">
                {renderExtraInfo && renderExtraInfo(user)}
                
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => openEditModal(user)} className="px-3 py-1 text-xs">
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => handleDisable(user)} className="px-3 py-1 text-xs bg-red-50 text-red-600 border border-red-100 hover:bg-red-100">
                    Disable
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {activeUsers.length === 0 && (
            <p className="text-sm text-slate-400 italic text-center py-6">No {roleDisplayName.toLowerCase()} registered.</p>
          )}
        </div>
      </Card>

      {/* Registration Modal */}
      <Modal 
        isOpen={isRegModalOpen} 
        title={`➕ Add ${roleDisplayName}`} 
        description={`Register a new ${roleDisplayName.toLowerCase()} account.`}
        onClose={() => setIsRegModalOpen(false)}
      >
        <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
          <Input label="Username" placeholder={`new_${role.toLowerCase()}`} value={newStaffUser} onChange={(e: any) => setNewStaffUser(e.target.value)} required />
          <Input label="Full Name" placeholder="Full Name" value={newStaffName} onChange={(e: any) => setNewStaffName(e.target.value)} required />
          <Input label="Email Address" type="email" placeholder="email@onus.com" value={newStaffEmail} onChange={(e: any) => setNewStaffEmail(e.target.value)} required />
          <Input label="Password" type="text" placeholder="Initial Password" value={newStaffPass} onChange={(e: any) => setNewStaffPass(e.target.value)} required />
          
          <Button type="submit" className="w-full mt-2" loading={registerMutation.isPending}>
            Register
          </Button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        title={`✏️ Edit ${roleDisplayName}`} 
        description="Update account details or set a new password."
        onClose={() => setIsEditModalOpen(false)}
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <Input label="Full Name" placeholder="Full Name" value={editName} onChange={(e: any) => setEditName(e.target.value)} required />
          <Input label="Email Address" type="email" placeholder="email@onus.com" value={editEmail} onChange={(e: any) => setEditEmail(e.target.value)} required />
          <Input label="New Password (Optional)" type="text" placeholder="Leave blank to keep current" value={editPass} onChange={(e: any) => setEditPass(e.target.value)} />
          
          <Button type="submit" className="w-full mt-2" loading={updateMutation.isPending}>
            Save Changes
          </Button>
        </form>
      </Modal>
    </div>
  );
}
