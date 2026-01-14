'use client';

import React, { useState, useEffect } from 'react';
import {
  userModuleRolesApi,
  UserWithModuleRoles,
  ModuleName,
  MODULE_ROLES,
  MODULE_DISPLAY_NAMES,
} from '@/lib/supabase/api/userModuleRoles';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'users' | 'invite';

const MODULES: ModuleName[] = ['accounting', 'bookings', 'inventory', 'maintenance', 'customers', 'hr'];

export function UserManagementModal({ isOpen, onClose }: UserManagementModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<UserWithModuleRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteSuperAdmin, setInviteSuperAdmin] = useState(false);
  const [inviteRoles, setInviteRoles] = useState<Record<ModuleName, string>>({
    accounting: '',
    bookings: '',
    inventory: '',
    maintenance: '',
    customers: '',
    hr: '',
  });
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Edit user state
  const [editingUser, setEditingUser] = useState<UserWithModuleRoles | null>(null);
  const [editRoles, setEditRoles] = useState<Record<ModuleName, string>>({
    accounting: '',
    bookings: '',
    inventory: '',
    maintenance: '',
    customers: '',
    hr: '',
  });
  const [editSuperAdmin, setEditSuperAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userModuleRolesApi.getAllUsersWithRoles();
      setUsers(data);
    } catch (err) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError(null);
    setInviteSuccess(false);

    try {
      // Build roles array from selected roles
      const roles: { module: ModuleName; role: string }[] = [];
      MODULES.forEach(module => {
        if (inviteRoles[module]) {
          roles.push({ module, role: inviteRoles[module] });
        }
      });

      const result = await userModuleRolesApi.inviteUserWithRoles(
        inviteEmail,
        inviteFullName,
        roles,
        inviteSuperAdmin
      );

      if (result.error) {
        setError(result.error);
      } else {
        setInviteSuccess(true);
        // Reset form
        setInviteEmail('');
        setInviteFullName('');
        setInviteSuperAdmin(false);
        setInviteRoles({
          accounting: '',
          bookings: '',
          inventory: '',
          maintenance: '',
          customers: '',
          hr: '',
        });
        // Reload users
        await loadUsers();
      }
    } catch (err) {
      setError('Failed to invite user');
      console.error('Error inviting user:', err);
    } finally {
      setInviting(false);
    }
  };

  const startEditUser = (user: UserWithModuleRoles) => {
    setEditingUser(user);
    setEditSuperAdmin(user.is_super_admin);

    // Initialize edit roles from user's current roles
    const roles: Record<ModuleName, string> = {
      accounting: '',
      bookings: '',
      inventory: '',
      maintenance: '',
      customers: '',
      hr: '',
    };
    user.module_roles.forEach(mr => {
      if (MODULES.includes(mr.module as ModuleName)) {
        roles[mr.module as ModuleName] = mr.role;
      }
    });
    setEditRoles(roles);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    setSaving(true);
    setError(null);

    try {
      // Build roles array from selected roles
      const roles: { module: ModuleName; role: string }[] = [];
      MODULES.forEach(module => {
        if (editRoles[module]) {
          roles.push({ module, role: editRoles[module] });
        }
      });

      // Update super admin status
      await userModuleRolesApi.setUserSuperAdmin(editingUser.id, editSuperAdmin);

      // Update module roles
      await userModuleRolesApi.setUserModuleRoles(editingUser.id, roles);

      // Reload users and close edit
      await loadUsers();
      setEditingUser(null);
    } catch (err) {
      setError('Failed to save user');
      console.error('Error saving user:', err);
    } finally {
      setSaving(false);
    }
  };

  const getUserModuleRole = (user: UserWithModuleRoles, module: ModuleName): string => {
    const moduleRole = user.module_roles.find(mr => mr.module === module);
    return moduleRole?.role || '-';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b px-6">
          <div className="flex space-x-8">
            <button
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('users')}
            >
              All Users
            </button>
            <button
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invite'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('invite')}
            >
              Invite User
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No users found</div>
              ) : editingUser ? (
                /* Edit User Form */
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">
                      Edit: {editingUser.full_name || editingUser.email}
                    </h3>
                    <button
                      onClick={() => setEditingUser(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="mb-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={editSuperAdmin}
                          onChange={(e) => setEditSuperAdmin(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium text-gray-700">Super Admin</span>
                        <span className="text-sm text-gray-500">(Full access to all modules)</span>
                      </label>
                    </div>

                    <h4 className="font-medium text-gray-700 mb-3">Module Roles</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {MODULES.map(module => (
                        <div key={module}>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            {MODULE_DISPLAY_NAMES[module]}
                          </label>
                          <select
                            value={editRoles[module]}
                            onChange={(e) => setEditRoles({ ...editRoles, [module]: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={editSuperAdmin}
                          >
                            <option value="">No Access</option>
                            {MODULE_ROLES[module].map(role => (
                              <option key={role} value={role}>
                                {role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ')}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    {editSuperAdmin && (
                      <p className="mt-3 text-sm text-gray-500">
                        Super Admins automatically have admin access to all modules.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setEditingUser(null)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveUser}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Users Table */
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Super Admin
                        </th>
                        {MODULES.map(module => (
                          <th key={module} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {MODULE_DISPLAY_NAMES[module]}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.full_name || '-'}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {user.is_super_admin ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Yes
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          {MODULES.map(module => (
                            <td key={module} className="px-3 py-3 whitespace-nowrap">
                              <span className={`text-sm ${
                                getUserModuleRole(user, module) !== '-'
                                  ? 'text-gray-900'
                                  : 'text-gray-400'
                              }`}>
                                {user.is_super_admin
                                  ? <span className="text-purple-600">admin</span>
                                  : getUserModuleRole(user, module)}
                              </span>
                            </td>
                          ))}
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <button
                              onClick={() => startEditUser(user)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'invite' && (
            <form onSubmit={handleInviteUser} className="space-y-6 max-w-2xl">
              {inviteSuccess && (
                <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm">
                  User invited successfully! They will receive an email to set up their account.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="mb-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={inviteSuperAdmin}
                      onChange={(e) => setInviteSuperAdmin(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-gray-700">Super Admin</span>
                    <span className="text-sm text-gray-500">(Full access to all modules)</span>
                  </label>
                </div>

                <h4 className="font-medium text-gray-700 mb-3">Module Access & Roles</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {MODULES.map(module => (
                    <div key={module}>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        {MODULE_DISPLAY_NAMES[module]}
                      </label>
                      <select
                        value={inviteRoles[module]}
                        onChange={(e) => setInviteRoles({ ...inviteRoles, [module]: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={inviteSuperAdmin}
                      >
                        <option value="">No Access</option>
                        {MODULE_ROLES[module].map(role => (
                          <option key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                {inviteSuperAdmin && (
                  <p className="mt-3 text-sm text-gray-500">
                    Super Admins automatically have admin access to all modules.
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail || !inviteFullName}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviting ? 'Sending Invitation...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
