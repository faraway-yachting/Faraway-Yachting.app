import { createClient } from '../client';

export type ModuleName = 'accounting' | 'bookings' | 'inventory' | 'maintenance' | 'customers' | 'hr';

export type ModuleRole = {
  accounting: 'admin' | 'manager' | 'accountant' | 'sales' | 'captain' | 'viewer' | 'petty-cash';
  bookings: 'admin' | 'manager' | 'agent' | 'crew' | 'investor' | 'viewer';
  inventory: 'admin' | 'manager' | 'warehouse' | 'viewer';
  maintenance: 'admin' | 'manager' | 'technician' | 'viewer';
  customers: 'admin' | 'manager' | 'sales' | 'viewer';
  hr: 'admin' | 'manager' | 'hr_staff' | 'employee' | 'viewer';
};

export interface UserModuleRole {
  id: string;
  user_id: string;
  module: ModuleName;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithModuleRoles {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
  can_manage_users: boolean;
  last_module: string | null;
  created_at: string;
  module_roles: UserModuleRole[];
}

// Available roles per module
export const MODULE_ROLES: Record<ModuleName, string[]> = {
  accounting: ['admin', 'manager', 'accountant', 'sales', 'captain', 'viewer', 'petty-cash'],
  bookings: ['admin', 'manager', 'agent', 'crew', 'investor', 'viewer'],
  inventory: ['admin', 'manager', 'warehouse', 'viewer'],
  maintenance: ['admin', 'manager', 'technician', 'viewer'],
  customers: ['admin', 'manager', 'sales', 'viewer'],
  hr: ['admin', 'manager', 'hr_staff', 'employee', 'viewer'],
};

// Module display names
export const MODULE_DISPLAY_NAMES: Record<ModuleName, string> = {
  accounting: 'Accounting',
  bookings: 'Bookings',
  inventory: 'Inventory',
  maintenance: 'Maintenance',
  customers: 'Customers',
  hr: 'HR',
};

export const userModuleRolesApi = {
  // Get all users with their module roles (admin only)
  async getAllUsersWithRoles(): Promise<UserWithModuleRoles[]> {
    const supabase = createClient();

    // Get all user profiles - use * to handle schema variations
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;
    if (!profiles) return [];

    // Get all module roles (may not exist yet)
    let moduleRoles: UserModuleRole[] = [];
    try {
      const { data, error: rolesError } = await supabase
        .from('user_module_roles')
        .select('*');

      if (!rolesError && data) {
        moduleRoles = data;
      }
    } catch {
      // Table may not exist yet, continue without module roles
      console.log('user_module_roles table not available');
    }

    // Combine profiles with their module roles
    return profiles.map(profile => ({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url || null,
      is_super_admin: profile.is_super_admin || false,
      can_manage_users: (profile as any).can_manage_users || false,
      last_module: profile.last_module || null,
      created_at: profile.created_at,
      module_roles: moduleRoles.filter(role => role.user_id === profile.id),
    }));
  },

  // Get module roles for a specific user
  async getUserModuleRoles(userId: string): Promise<UserModuleRole[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_module_roles')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  },

  // Get user's role in a specific module
  async getUserRoleInModule(userId: string, module: ModuleName): Promise<string | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_module_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('module', module)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }
    return data?.role || null;
  },

  // Set user's role in a module (upsert)
  async setUserModuleRole(userId: string, module: ModuleName, role: string): Promise<UserModuleRole> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_module_roles')
      .upsert({
        user_id: userId,
        module,
        role,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,module',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Remove user's role from a module
  async removeUserModuleRole(userId: string, module: ModuleName): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('user_module_roles')
      .delete()
      .eq('user_id', userId)
      .eq('module', module);

    if (error) throw error;
  },

  // Set multiple module roles for a user at once
  async setUserModuleRoles(userId: string, roles: { module: ModuleName; role: string }[]): Promise<void> {
    const supabase = createClient();

    // First, delete all existing roles for this user
    const { error: deleteError } = await supabase
      .from('user_module_roles')
      .delete()
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    // Then insert the new roles (if any)
    if (roles.length > 0) {
      const { error: insertError } = await supabase
        .from('user_module_roles')
        .insert(
          roles.map(r => ({
            user_id: userId,
            module: r.module,
            role: r.role,
            is_active: true,
          }))
        );

      if (insertError) throw insertError;
    }
  },

  // Update user's super admin status
  async setUserSuperAdmin(userId: string, isSuperAdmin: boolean): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_super_admin: isSuperAdmin })
      .eq('id', userId);

    if (error) throw error;
  },

  // Update user's can_manage_users status
  async setUserCanManageUsers(userId: string, canManageUsers: boolean): Promise<void> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('user_profiles')
      .update({ can_manage_users: canManageUsers })
      .eq('id', userId);

    if (error) throw error;
  },

  // Invite a new user with module roles (uses server API route)
  async inviteUserWithRoles(
    email: string,
    fullName: string,
    roles: { module: ModuleName; role: string }[],
    isSuperAdmin: boolean = false
  ): Promise<{ user: UserWithModuleRoles | null; inviteLink: string | null; emailSent: boolean; error: string | null }> {
    try {
      // Call server-side API that has service role access
      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          fullName,
          roles,
          isSuperAdmin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { user: null, inviteLink: null, emailSent: false, error: data.error || 'Failed to invite user' };
      }

      // Return the user with their roles
      const user: UserWithModuleRoles = {
        id: data.user.id,
        email: email,
        full_name: fullName,
        avatar_url: null,
        is_super_admin: isSuperAdmin,
        can_manage_users: false,
        last_module: null,
        created_at: new Date().toISOString(),
        module_roles: roles.map(r => ({
          id: '',
          user_id: data.user.id,
          module: r.module,
          role: r.role,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
      };

      return { user, inviteLink: data.inviteLink || null, emailSent: data.emailSent || false, error: null };
    } catch (err) {
      console.error('Error inviting user:', err);
      return { user: null, inviteLink: null, emailSent: false, error: 'Failed to invite user' };
    }
  },

  // Check if current user is super admin
  async isCurrentUserSuperAdmin(): Promise<boolean> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (error) return false;
    return data?.is_super_admin || false;
  },

  async deleteUser(userId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to delete user' };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Error deleting user:', err);
      return { success: false, error: 'Failed to delete user' };
    }
  },
};
