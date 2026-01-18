'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  userModuleRolesApi,
  UserWithModuleRoles,
  ModuleName,
  MODULE_DISPLAY_NAMES,
} from '@/lib/supabase/api/userModuleRoles';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Building2,
  Ship,
  Shield,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Check,
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  company_id: string;
}

interface UserCompanyAccess {
  id: string;
  user_id: string;
  company_id: string;
  access_type: 'admin' | 'manager' | 'member' | 'viewer';
  company?: Company;
}

interface UserProjectAccess {
  id: string;
  user_id: string;
  project_id: string;
  access_type: 'investor' | 'crew' | 'manager' | 'full';
  project?: Project;
}

interface ExtendedUser extends UserWithModuleRoles {
  company_access: UserCompanyAccess[];
  project_access: UserProjectAccess[];
}

interface RoleDefinition {
  id: string;
  module: string;
  role_key: string;
  display_name: string;
  description: string | null;
}

const MODULES: ModuleName[] = ['accounting', 'bookings', 'inventory', 'maintenance', 'customers', 'hr'];

const COMPANY_ACCESS_TYPES = ['admin', 'manager', 'member', 'viewer'] as const;
const PROJECT_ACCESS_TYPES = ['investor', 'crew', 'manager', 'full'] as const;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Expanded user row
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false);
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

  // Edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
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

  // Company access edit
  const [editingCompanyAccess, setEditingCompanyAccess] = useState<string | null>(null);
  const [newCompanyId, setNewCompanyId] = useState('');
  const [newCompanyAccessType, setNewCompanyAccessType] = useState<typeof COMPANY_ACCESS_TYPES[number]>('viewer');

  // Project access edit
  const [editingProjectAccess, setEditingProjectAccess] = useState<string | null>(null);
  const [newProjectId, setNewProjectId] = useState('');
  const [newProjectAccessType, setNewProjectAccessType] = useState<typeof PROJECT_ACCESS_TYPES[number]>('investor');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Load users with roles
      const usersData = await userModuleRolesApi.getAllUsersWithRoles();

      // Load companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, company_id')
        .order('name');

      // Load company access for all users
      const { data: companyAccessData } = await supabase
        .from('user_company_access')
        .select('*, company:companies(id, name)');

      // Load project access for all users
      const { data: projectAccessData } = await supabase
        .from('user_project_access')
        .select('*, project:projects(id, name, company_id)');

      // Load role definitions from database
      const { data: roleDefsData } = await supabase
        .from('role_definitions')
        .select('id, module, role_key, display_name, description')
        .eq('is_active', true)
        .order('sort_order');

      setCompanies(companiesData || []);
      setProjects(projectsData || []);
      setRoleDefinitions(roleDefsData || []);

      // Combine user data with access data
      const extendedUsers: ExtendedUser[] = usersData.map(user => ({
        ...user,
        company_access: (companyAccessData || [])
          .filter(ca => ca.user_id === user.id)
          .map(ca => ({
            id: ca.id,
            user_id: ca.user_id,
            company_id: ca.company_id,
            access_type: ca.access_type,
            company: ca.company,
          })),
        project_access: (projectAccessData || [])
          .filter(pa => pa.user_id === user.id)
          .map(pa => ({
            id: pa.id,
            user_id: pa.user_id,
            project_id: pa.project_id,
            access_type: pa.access_type,
            project: pa.project,
          })),
      }));

      setUsers(extendedUsers);
    } catch (err) {
      setError('Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError(null);

    try {
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
        // Reset form and reload
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
        setShowInviteForm(false);
        await loadData();
      }
    } catch (err) {
      setError('Failed to invite user');
      console.error('Error inviting user:', err);
    } finally {
      setInviting(false);
    }
  };

  const startEditUser = (user: ExtendedUser) => {
    setEditingUserId(user.id);
    setEditSuperAdmin(user.is_super_admin);

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
    setExpandedUserId(user.id);
  };

  const handleSaveUser = async (userId: string) => {
    setSaving(true);
    setError(null);

    try {
      const roles: { module: ModuleName; role: string }[] = [];
      MODULES.forEach(module => {
        if (editRoles[module]) {
          roles.push({ module, role: editRoles[module] });
        }
      });

      await userModuleRolesApi.setUserSuperAdmin(userId, editSuperAdmin);
      await userModuleRolesApi.setUserModuleRoles(userId, roles);

      setEditingUserId(null);
      await loadData();
    } catch (err) {
      setError('Failed to save user');
      console.error('Error saving user:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCompanyAccess = async (userId: string) => {
    if (!newCompanyId) return;

    try {
      const supabase = createClient();
      const user = users.find(u => u.id === userId);

      if (newCompanyId === '__all__') {
        // Add all companies that user doesn't already have access to
        const companiesToAdd = companies.filter(
          c => !user?.company_access.some(ca => ca.company_id === c.id)
        );

        if (companiesToAdd.length > 0) {
          await supabase.from('user_company_access').insert(
            companiesToAdd.map(c => ({
              user_id: userId,
              company_id: c.id,
              access_type: newCompanyAccessType,
            }))
          );
        }
      } else {
        // Add single company
        await supabase.from('user_company_access').insert({
          user_id: userId,
          company_id: newCompanyId,
          access_type: newCompanyAccessType,
        });
      }

      setNewCompanyId('');
      setNewCompanyAccessType('viewer');
      setEditingCompanyAccess(null);
      await loadData();
    } catch (err) {
      setError('Failed to add company access');
      console.error('Error adding company access:', err);
    }
  };

  const handleRemoveCompanyAccess = async (accessId: string) => {
    try {
      const supabase = createClient();
      await supabase.from('user_company_access').delete().eq('id', accessId);
      await loadData();
    } catch (err) {
      setError('Failed to remove company access');
      console.error('Error removing company access:', err);
    }
  };

  const handleAddProjectAccess = async (userId: string) => {
    if (!newProjectId) return;

    try {
      const supabase = createClient();
      const user = users.find(u => u.id === userId);

      if (newProjectId === '__all__') {
        // Add all projects that user doesn't already have access to
        const projectsToAdd = projects.filter(
          p => !user?.project_access.some(pa => pa.project_id === p.id)
        );

        if (projectsToAdd.length > 0) {
          await supabase.from('user_project_access').insert(
            projectsToAdd.map(p => ({
              user_id: userId,
              project_id: p.id,
              access_type: newProjectAccessType,
            }))
          );
        }
      } else {
        // Add single project
        await supabase.from('user_project_access').insert({
          user_id: userId,
          project_id: newProjectId,
          access_type: newProjectAccessType,
        });
      }

      setNewProjectId('');
      setNewProjectAccessType('investor');
      setEditingProjectAccess(null);
      await loadData();
    } catch (err) {
      setError('Failed to add project access');
      console.error('Error adding project access:', err);
    }
  };

  const handleRemoveProjectAccess = async (accessId: string) => {
    try {
      const supabase = createClient();
      await supabase.from('user_project_access').delete().eq('id', accessId);
      await loadData();
    } catch (err) {
      setError('Failed to remove project access');
      console.error('Error removing project access:', err);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchLower))
    );
  });

  // Get available roles for a specific module from database
  const getRolesForModule = (module: ModuleName): RoleDefinition[] => {
    return roleDefinitions.filter(r => r.module === module);
  };

  const getUserModuleRole = (user: ExtendedUser, module: ModuleName): string => {
    const moduleRole = user.module_roles.find(mr => mr.module === module);
    return moduleRole?.role || '-';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage user accounts, module roles, and access permissions
          </p>
        </div>
        <button
          onClick={() => setShowInviteForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Invite User
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Invite New User</h2>
              <button onClick={() => setShowInviteForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleInviteUser} className="p-6 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 130px)' }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={inviteFullName}
                    onChange={(e) => setInviteFullName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={inviteSuperAdmin}
                    onChange={(e) => setInviteSuperAdmin(e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <Shield className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-gray-700">Super Admin</span>
                  <span className="text-sm text-gray-500">(Full access to all modules and admin panel)</span>
                </label>

                <h4 className="font-medium text-gray-700 mb-3">Module Roles</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {MODULES.map(module => (
                    <div key={module}>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        {MODULE_DISPLAY_NAMES[module]}
                      </label>
                      <select
                        value={inviteRoles[module]}
                        onChange={(e) => setInviteRoles({ ...inviteRoles, [module]: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={inviteSuperAdmin}
                      >
                        <option value="">No Access</option>
                        {getRolesForModule(module).map(role => (
                          <option key={role.role_key} value={role.role_key}>
                            {role.display_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail || !inviteFullName}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchTerm ? 'No users found matching your search' : 'No users found'}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {MODULES.slice(0, 3).map(module => (
                    <th key={module} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {MODULE_DISPLAY_NAMES[module]}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Access
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map(user => (
                  <React.Fragment key={user.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name || '-'}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {user.is_super_admin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <Shield className="h-3 w-3" />
                            Super Admin
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">User</span>
                        )}
                      </td>
                      {MODULES.slice(0, 3).map(module => (
                        <td key={module} className="px-4 py-4 whitespace-nowrap">
                          <span className={`text-sm ${
                            getUserModuleRole(user, module) !== '-' ? 'text-gray-900' : 'text-gray-400'
                          }`}>
                            {user.is_super_admin ? (
                              <span className="text-purple-600">admin</span>
                            ) : (
                              getUserModuleRole(user, module)
                            )}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Building2 className="h-3 w-3" />
                            {user.company_access.length}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Ship className="h-3 w-3" />
                            {user.project_access.length}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEditUser(user)}
                            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {expandedUserId === user.id ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {expandedUserId === user.id && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-6">
                            {/* Edit Roles Section */}
                            {editingUserId === user.id ? (
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <h4 className="font-medium text-gray-900 mb-4">Edit Roles</h4>

                                <label className="flex items-center gap-2 mb-4">
                                  <input
                                    type="checkbox"
                                    checked={editSuperAdmin}
                                    onChange={(e) => setEditSuperAdmin(e.target.checked)}
                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                  />
                                  <Shield className="h-4 w-4 text-purple-600" />
                                  <span className="font-medium text-gray-700">Super Admin</span>
                                </label>

                                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-4">
                                  {MODULES.map(module => (
                                    <div key={module}>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {MODULE_DISPLAY_NAMES[module]}
                                      </label>
                                      <select
                                        value={editRoles[module]}
                                        onChange={(e) => setEditRoles({ ...editRoles, [module]: e.target.value })}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        disabled={editSuperAdmin}
                                      >
                                        <option value="">No Access</option>
                                        {getRolesForModule(module).map(role => (
                                          <option key={role.role_key} value={role.role_key}>
                                            {role.display_name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setEditingUserId(null)}
                                    className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveUser(user.id)}
                                    disabled={saving}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                                  >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : null}

                            {/* Company Access Section */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                  <Building2 className="h-4 w-4" />
                                  Company Access
                                </h4>
                                <button
                                  onClick={() => setEditingCompanyAccess(editingCompanyAccess === user.id ? null : user.id)}
                                  className="text-sm text-purple-600 hover:text-purple-800"
                                >
                                  + Add Company
                                </button>
                              </div>

                              {editingCompanyAccess === user.id && (
                                <div className="flex items-center gap-2 mb-3 p-3 bg-gray-50 rounded-lg">
                                  <select
                                    value={newCompanyId}
                                    onChange={(e) => setNewCompanyId(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  >
                                    <option value="">Select Company</option>
                                    {companies.filter(c => !user.company_access.some(ca => ca.company_id === c.id)).length > 1 && (
                                      <option value="__all__">✓ Select All ({companies.filter(c => !user.company_access.some(ca => ca.company_id === c.id)).length} companies)</option>
                                    )}
                                    {companies
                                      .filter(c => !user.company_access.some(ca => ca.company_id === c.id))
                                      .map(company => (
                                        <option key={company.id} value={company.id}>{company.name}</option>
                                      ))}
                                  </select>
                                  <select
                                    value={newCompanyAccessType}
                                    onChange={(e) => setNewCompanyAccessType(e.target.value as typeof COMPANY_ACCESS_TYPES[number])}
                                    className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  >
                                    {COMPANY_ACCESS_TYPES.map(type => (
                                      <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleAddCompanyAccess(user.id)}
                                    disabled={!newCompanyId}
                                    className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                                  >
                                    Add
                                  </button>
                                  <button
                                    onClick={() => setEditingCompanyAccess(null)}
                                    className="px-3 py-2 text-gray-600 hover:text-gray-800"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              )}

                              {user.company_access.length === 0 ? (
                                <p className="text-sm text-gray-500">No company access assigned</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {user.company_access.map(ca => (
                                    <span
                                      key={ca.id}
                                      className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                                    >
                                      {ca.company?.name || 'Unknown'}
                                      <span className="text-blue-500 text-xs">({ca.access_type})</span>
                                      <button
                                        onClick={() => handleRemoveCompanyAccess(ca.id)}
                                        className="text-blue-400 hover:text-blue-600"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Project Access Section */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                  <Ship className="h-4 w-4" />
                                  Project Access (for Investors/Crew)
                                </h4>
                                <button
                                  onClick={() => setEditingProjectAccess(editingProjectAccess === user.id ? null : user.id)}
                                  className="text-sm text-purple-600 hover:text-purple-800"
                                >
                                  + Add Project
                                </button>
                              </div>

                              {editingProjectAccess === user.id && (
                                <div className="flex items-center gap-2 mb-3 p-3 bg-gray-50 rounded-lg">
                                  <select
                                    value={newProjectId}
                                    onChange={(e) => setNewProjectId(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  >
                                    <option value="">Select Project</option>
                                    {projects.filter(p => !user.project_access.some(pa => pa.project_id === p.id)).length > 1 && (
                                      <option value="__all__">✓ Select All ({projects.filter(p => !user.project_access.some(pa => pa.project_id === p.id)).length} projects)</option>
                                    )}
                                    {projects
                                      .filter(p => !user.project_access.some(pa => pa.project_id === p.id))
                                      .map(project => (
                                        <option key={project.id} value={project.id}>{project.name}</option>
                                      ))}
                                  </select>
                                  <select
                                    value={newProjectAccessType}
                                    onChange={(e) => setNewProjectAccessType(e.target.value as typeof PROJECT_ACCESS_TYPES[number])}
                                    className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  >
                                    {PROJECT_ACCESS_TYPES.map(type => (
                                      <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleAddProjectAccess(user.id)}
                                    disabled={!newProjectId}
                                    className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                                  >
                                    Add
                                  </button>
                                  <button
                                    onClick={() => setEditingProjectAccess(null)}
                                    className="px-3 py-2 text-gray-600 hover:text-gray-800"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              )}

                              {user.project_access.length === 0 ? (
                                <p className="text-sm text-gray-500">No project access assigned</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {user.project_access.map(pa => (
                                    <span
                                      key={pa.id}
                                      className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm"
                                    >
                                      {pa.project?.name || 'Unknown'}
                                      <span className="text-green-500 text-xs">({pa.access_type})</span>
                                      <button
                                        onClick={() => handleRemoveProjectAccess(pa.id)}
                                        className="text-green-400 hover:text-green-600"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* All Module Roles Overview */}
                            {!editingUserId && (
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium text-gray-900">All Module Roles</h4>
                                  <button
                                    onClick={() => startEditUser(user)}
                                    className="text-sm text-purple-600 hover:text-purple-800"
                                  >
                                    Edit Roles
                                  </button>
                                </div>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                                  {MODULES.map(module => (
                                    <div key={module} className="text-center">
                                      <div className="text-xs font-medium text-gray-500 mb-1">
                                        {MODULE_DISPLAY_NAMES[module]}
                                      </div>
                                      <div className={`text-sm ${
                                        user.is_super_admin || getUserModuleRole(user, module) !== '-'
                                          ? 'font-medium text-gray-900'
                                          : 'text-gray-400'
                                      }`}>
                                        {user.is_super_admin ? (
                                          <span className="text-purple-600">admin</span>
                                        ) : (
                                          getUserModuleRole(user, module)
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
