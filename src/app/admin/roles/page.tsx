'use client';

import { useState, useEffect } from 'react';
import { roleConfigApi, type RoleDefinition, type PermissionGroup } from '@/lib/supabase/api';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ChevronDown, ChevronUp, RotateCcw, Save, Shield, Plus, X, Trash2 } from 'lucide-react';

// Module definitions
const MODULES = [
  { key: 'accounting', label: 'Accounting' },
  { key: 'bookings', label: 'Bookings' },
];

// Menu items per module (for visibility editor)
const MENU_ITEMS: Record<string, { key: string; label: string }[]> = {
  accounting: [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'income', label: 'Income' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'gl-categorization', label: 'GL Categorization' },
    { key: 'journal-entries', label: 'Journal Entries' },
    { key: 'bank-reconciliation', label: 'Bank Reconciliation' },
    { key: 'finances', label: 'Finances' },
    { key: 'petty-cash', label: 'Petty Cash' },
    { key: 'chart-of-accounts', label: 'Chart of Accounts' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'companies', label: 'Companies' },
    { key: 'reports', label: 'Reports' },
    { key: 'settings', label: 'Settings' },
  ],
  bookings: [
    { key: 'calendar', label: 'Calendar' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'guests', label: 'Guests' },
    { key: 'reports', label: 'Reports' },
  ],
};

// Resources for data scope editor
const RESOURCES: Record<string, { key: string; label: string }[]> = {
  accounting: [
    { key: 'expenses', label: 'Expenses' },
    { key: 'income', label: 'Income / Receipts' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'journal', label: 'Journal Entries' },
    { key: 'petty-cash', label: 'Petty Cash' },
    { key: 'reports', label: 'Reports' },
  ],
  bookings: [
    { key: 'bookings', label: 'Bookings' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'guests', label: 'Guests' },
    { key: 'reports', label: 'Reports' },
  ],
};

const SCOPE_OPTIONS = [
  { value: 'own', label: 'Own Only', description: 'Records created by this user' },
  { value: 'project', label: 'Assigned Projects', description: 'Records in assigned projects' },
  { value: 'company', label: 'All in Company', description: 'All records in assigned companies' },
  { value: 'all', label: 'All', description: 'Access to all records (admin level)' },
];

export default function AdminRolesPage() {
  const [selectedModule, setSelectedModule] = useState('accounting');
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'permissions' | 'visibility' | 'scope'>('permissions');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Role config state
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [menuVisibility, setMenuVisibility] = useState<Record<string, boolean>>({});
  const [dataScopes, setDataScopes] = useState<Record<string, 'own' | 'project' | 'company' | 'all'>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Create role modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleKey, setNewRoleKey] = useState('');
  const [newRoleDisplayName, setNewRoleDisplayName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Delete confirmation
  const [roleToDelete, setRoleToDelete] = useState<RoleDefinition | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load roles function
  const loadRoles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await roleConfigApi.getRoleDefinitions(selectedModule);
      setRoles(data);
    } catch (err) {
      setError('Failed to load roles');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load roles for selected module
  useEffect(() => {
    loadRoles();
    setExpandedRole(null);
  }, [selectedModule]);

  // Create new role
  const handleCreateRole = async () => {
    if (!newRoleKey.trim() || !newRoleDisplayName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const supabase = createClient();

      // Generate role key from display name if not provided
      const roleKey = newRoleKey.trim().toLowerCase().replace(/\s+/g, '-');

      // Check if role already exists
      const existingRole = roles.find(r => r.role_key === roleKey);
      if (existingRole) {
        setError(`Role "${roleKey}" already exists in this module`);
        setIsCreating(false);
        return;
      }

      // Get max sort order
      const maxSortOrder = Math.max(...roles.map(r => r.sort_order), 0);

      // Insert new role
      const { error: insertError } = await supabase
        .from('role_definitions' as any)
        .insert({
          module: selectedModule,
          role_key: roleKey,
          display_name: newRoleDisplayName.trim(),
          description: newRoleDescription.trim() || null,
          is_active: true,
          sort_order: maxSortOrder + 1,
        });

      if (insertError) throw insertError;

      // Reset form and close modal
      setNewRoleKey('');
      setNewRoleDisplayName('');
      setNewRoleDescription('');
      setShowCreateModal(false);

      // Reload roles
      await loadRoles();
    } catch (err) {
      setError('Failed to create role');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  // Delete role
  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      const supabase = createClient();

      // Delete role permissions
      await supabase
        .from('role_permissions' as any)
        .delete()
        .eq('module', selectedModule)
        .eq('role', roleToDelete.role_key);

      // Delete menu visibility
      await supabase
        .from('role_menu_visibility' as any)
        .delete()
        .eq('module', selectedModule)
        .eq('role_key', roleToDelete.role_key);

      // Delete data scopes
      await supabase
        .from('role_data_scope' as any)
        .delete()
        .eq('module', selectedModule)
        .eq('role_key', roleToDelete.role_key);

      // Delete the role definition
      const { error: deleteError } = await supabase
        .from('role_definitions' as any)
        .delete()
        .eq('id', roleToDelete.id);

      if (deleteError) throw deleteError;

      // Reset state
      setRoleToDelete(null);
      if (expandedRole === roleToDelete.role_key) {
        setExpandedRole(null);
      }

      // Reload roles
      await loadRoles();
    } catch (err) {
      setError('Failed to delete role');
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Load role config when expanded
  useEffect(() => {
    if (!expandedRole) return;
    const roleKey = expandedRole; // Capture non-null value for async closure

    async function loadRoleConfig() {
      try {
        const [groups, visibility, scopes] = await Promise.all([
          roleConfigApi.getPermissionsGrouped(selectedModule, roleKey),
          roleConfigApi.getMenuVisibility(selectedModule, roleKey),
          roleConfigApi.getDataScopes(selectedModule, roleKey),
        ]);
        setPermissionGroups(groups);
        setMenuVisibility(visibility);
        setDataScopes(scopes);
        setHasChanges(false);
      } catch (err) {
        console.error('Failed to load role config:', err);
      }
    }
    loadRoleConfig();
  }, [expandedRole, selectedModule]);

  const handleToggleRole = (roleKey: string) => {
    if (expandedRole === roleKey) {
      setExpandedRole(null);
    } else {
      setExpandedRole(roleKey);
      setActiveTab('permissions');
    }
  };

  const handleTogglePermission = (code: string, enabled: boolean) => {
    setPermissionGroups((prev) =>
      prev.map((group) => ({
        ...group,
        permissions: group.permissions.map((p) =>
          p.code === code ? { ...p, enabled } : p
        ),
      }))
    );
    setHasChanges(true);
  };

  const handleToggleMenuVisibility = (menuKey: string, visible: boolean) => {
    setMenuVisibility((prev) => ({ ...prev, [menuKey]: visible }));
    setHasChanges(true);
  };

  const handleSetDataScope = (resource: string, scope: 'own' | 'project' | 'company' | 'all') => {
    setDataScopes((prev) => ({ ...prev, [resource]: scope }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!expandedRole) return;
    setIsSaving(true);
    setError(null);

    try {
      // Get enabled permission codes
      const enabledPermissions = permissionGroups
        .flatMap((g) => g.permissions)
        .filter((p) => p.enabled)
        .map((p) => p.code);

      // Save all changes in parallel
      await Promise.all([
        roleConfigApi.setRolePermissions(selectedModule, expandedRole, enabledPermissions),
        roleConfigApi.setMenuVisibility(selectedModule, expandedRole, menuVisibility),
        roleConfigApi.setDataScopes(selectedModule, expandedRole, dataScopes),
      ]);

      setHasChanges(false);
    } catch (err) {
      setError('Failed to save changes');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!expandedRole) return;
    // Reload config from database
    try {
      const [groups, visibility, scopes] = await Promise.all([
        roleConfigApi.getPermissionsGrouped(selectedModule, expandedRole),
        roleConfigApi.getMenuVisibility(selectedModule, expandedRole),
        roleConfigApi.getDataScopes(selectedModule, expandedRole),
      ]);
      setPermissionGroups(groups);
      setMenuVisibility(visibility);
      setDataScopes(scopes);
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to reset:', err);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Role Permissions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure what each role can see and do in each module
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Module Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {MODULES.map((mod) => (
            <button
              key={mod.key}
              onClick={() => setSelectedModule(mod.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedModule === mod.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {mod.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Role
        </button>
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Create New Role</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRoleKey('');
                  setNewRoleDisplayName('');
                  setNewRoleDescription('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Module
                </label>
                <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-700">
                  {MODULES.find(m => m.key === selectedModule)?.label}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Key *
                </label>
                <input
                  type="text"
                  value={newRoleKey}
                  onChange={(e) => setNewRoleKey(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="e.g., senior-accountant"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Lowercase, use hyphens for spaces
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={newRoleDisplayName}
                  onChange={(e) => setNewRoleDisplayName(e.target.value)}
                  placeholder="e.g., Senior Accountant"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Brief description of this role's responsibilities..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRoleKey('');
                  setNewRoleDisplayName('');
                  setNewRoleDescription('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                disabled={isCreating || !newRoleKey.trim() || !newRoleDisplayName.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {roleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Delete Role</h2>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Are you sure you want to delete the role <strong>{roleToDelete.display_name}</strong>?
              </p>
              <p className="text-sm text-red-600">
                This will remove all permissions, menu visibility settings, and data scope configurations for this role. Users assigned this role will lose access.
              </p>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setRoleToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRole}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roles List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <div
              key={role.role_key}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Role Header */}
              <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                <button
                  onClick={() => handleToggleRole(role.role_key)}
                  className="flex-1 flex items-center gap-3 text-left"
                >
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{role.display_name}</div>
                    <div className="text-sm text-gray-500">{role.description}</div>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRoleToDelete(role);
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete role"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleRole(role.role_key)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    {expandedRole === role.role_key ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Config Panel */}
              {expandedRole === role.role_key && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  {/* Config Tabs */}
                  <div className="flex gap-1 mb-4 bg-gray-200 p-1 rounded-lg w-fit">
                    {(['permissions', 'visibility', 'scope'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                          activeTab === tab
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {tab === 'permissions' && 'Permissions'}
                        {tab === 'visibility' && 'Menu Visibility'}
                        {tab === 'scope' && 'Data Scope'}
                      </button>
                    ))}
                  </div>

                  {/* Permissions Tab */}
                  {activeTab === 'permissions' && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="space-y-6">
                        {permissionGroups.map((group) => (
                          <div key={group.resource}>
                            <h4 className="font-medium text-gray-900 mb-3">
                              {group.resourceLabel}
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {group.permissions.map((perm) => (
                                <label
                                  key={perm.code}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={perm.enabled}
                                    onChange={(e) =>
                                      handleTogglePermission(perm.code, e.target.checked)
                                    }
                                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                  />
                                  <span className="text-gray-700 capitalize">{perm.action}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Menu Visibility Tab */}
                  {activeTab === 'visibility' && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <p className="text-sm text-gray-500 mb-4">
                        Control which menu items appear in the sidebar for this role.
                        Users still need the appropriate permissions to access each page.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {MENU_ITEMS[selectedModule]?.map((item) => (
                          <label key={item.key} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={menuVisibility[item.key] ?? true}
                              onChange={(e) =>
                                handleToggleMenuVisibility(item.key, e.target.checked)
                              }
                              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-gray-700">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data Scope Tab */}
                  {activeTab === 'scope' && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <p className="text-sm text-gray-500 mb-4">
                        Configure which data this role can access for each resource type.
                      </p>
                      <div className="space-y-4">
                        {RESOURCES[selectedModule]?.map((resource) => (
                          <div
                            key={resource.key}
                            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                          >
                            <span className="text-sm font-medium text-gray-700">
                              {resource.label}
                            </span>
                            <select
                              value={dataScopes[resource.key] ?? 'company'}
                              onChange={(e) =>
                                handleSetDataScope(
                                  resource.key,
                                  e.target.value as 'own' | 'project' | 'company' | 'all'
                                )
                              }
                              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-purple-500 focus:border-purple-500"
                            >
                              {SCOPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <h5 className="text-xs font-medium text-gray-700 mb-2">Scope Definitions:</h5>
                        <ul className="text-xs text-gray-500 space-y-1">
                          {SCOPE_OPTIONS.map((opt) => (
                            <li key={opt.value}>
                              <span className="font-medium">{opt.label}:</span> {opt.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={handleReset}
                      disabled={!hasChanges || isSaving}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!hasChanges || isSaving}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
