"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { getUsersApi, updateUserApi, deleteUserApi, createUserApi, registerStaffApi } from '../../services/api';
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
  const [newStaffPass, setNewStaffPass] = useState('onus123');

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPass, setEditPass] = useState('');

  // Queries
  const { data: users = initialUsers } = useQuery({
    queryKey: ['users', role],
    queryFn: () => getUsersApi(role),
    initialData: initialUsers.filter(u => u.role === role)
  });

  // Mutations
  const registerMutation = useMutation({
    mutationFn: async (payload: any) => {
      return registerStaffApi({
        email: newStaffEmail,
        fullName: newStaffName,
        password: newStaffPass,
        role: role === 'SITE_INCHARGE' ? 'CAPTAIN' : role,
        phone: newStaffUser
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`New ${roleDisplayName} registered successfully!`);
      setIsRegModalOpen(false);
      resetRegForm();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to register user.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateUserApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`${roleDisplayName} details updated successfully!`);
      setIsEditModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update user.');
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => deleteUserApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`${roleDisplayName} deleted successfully!`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete user.');
    }
  });

  const resetRegForm = () => {
    setNewStaffUser('');
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffPass('onus123');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffUser || !newStaffName || !newStaffEmail) {
      toast.error('Please fill all required fields.');
      return;
    }
    
    if (newStaffUser.trim().length < 5) {
      toast.error('Username / Phone must be at least 5 characters.');
      return;
    }
    
    // Map representative to sales_representative role format in database
    const backendRole = role === 'REPRESENTATIVE' ? 'SALES_REPRESENTATIVE' : role;

    registerMutation.mutate({
      name: newStaffName,
      email: newStaffEmail,
      phone: newStaffUser.trim(),
      password: newStaffPass,
      role: backendRole
    });
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditName(user.fullName || user.name || '');
    setEditEmail(user.email);
    setEditPass(''); // Leave blank unless they want to change it
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: editName,
      email: editEmail,
    };
    if (editPass) {
      payload.password = editPass;
    }
    updateMutation.mutate({ id: editingUser.id || editingUser._id, payload });
  };

  const handleDeleteUser = (user: any) => {
    const id = user.id || user._id;
    const name = user.fullName || user.name;
    
    toast.custom(
      (t) => (
        <div className="flex flex-col gap-3 p-4 bg-white rounded-lg shadow-lg border border-slate-100 min-w-[300px]">
          <p className="font-semibold text-slate-800 text-sm">⚠️ Are you sure you want to delete the user "{name}"? This action cannot be undone.</p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => toast.dismiss(t.id)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                deleteUserMutation.mutate(id);
                toast.dismiss(t.id);
              }}
            >
              Delete User
            </Button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
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
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full font-bold flex items-center justify-center text-sm shrink-0 border ${
                  user.isActive !== false
                    ? role === 'SITE_INCHARGE' 
                      ? 'bg-purple-50 text-purple-600 border-purple-100'
                      : role === 'LOADING_STAFF'
                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                        : 'bg-teal-50 text-teal-600 border-teal-100'
                    : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  {((user.fullName || user.name || 'U').charAt(0)).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-[#0F172A]">{user.fullName || user.name}</p>
                  <p className="text-xs text-slate-500">📧 {user.email} • Phone/ID: {user.username || user.phone}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                {renderExtraInfo && renderExtraInfo(user)}
                
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => openEditModal(user)} className="px-3 py-1 text-xs">
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => handleDeleteUser(user)} className="px-3 py-1 text-xs bg-red-50 text-red-650 border border-red-100 hover:bg-red-100">
                    Delete
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
          <Input label="Username / Phone (Min 5 chars)" placeholder={`new_${role.toLowerCase()}`} value={newStaffUser} onChange={(e: any) => setNewStaffUser(e.target.value)} required />
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
