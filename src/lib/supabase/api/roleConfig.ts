import { createClient } from '../client';

// Note: These tables are defined in migrations but not yet in database.types.ts
// Using 'as any' type assertions until types are regenerated
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = ReturnType<typeof createClient> extends infer T ? T : never;

// Types
export interface RoleDefinition {
  id: string;
  module: string;
  role_key: string;
  display_name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RoleMenuVisibility {
  id: string;
  module: string;
  role_key: string;
  menu_key: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleDataScope {
  id: string;
  module: string;
  role_key: string;
  resource: string;
  scope_type: 'own' | 'project' | 'company' | 'all';
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  module: string;
  role: string;
  permission_code: string;
  created_at: string;
}

export interface Permission {
  id: string;
  code: string;
  module: string;
  resource: string;
  action: string;
  description: string | null;
  created_at: string;
}

// Grouped permission for UI
export interface PermissionGroup {
  resource: string;
  resourceLabel: string;
  permissions: {
    code: string;
    action: string;
    description: string | null;
    enabled: boolean;
  }[];
}

export interface RoleConfig {
  definition: RoleDefinition;
  permissions: string[];
  menuVisibility: Record<string, boolean>;
  dataScopes: Record<string, 'own' | 'project' | 'company' | 'all'>;
}

// API Functions
export const roleConfigApi = {
  // ============================================================================
  // ROLE DEFINITIONS
  // ============================================================================

  /**
   * Get all role definitions for a module
   */
  async getRoleDefinitions(module: string): Promise<RoleDefinition[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('role_definitions' as any)
      .select('*')
      .eq('module', module)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data as unknown as RoleDefinition[]) || [];
  },

  /**
   * Get a single role definition
   */
  async getRoleDefinition(module: string, roleKey: string): Promise<RoleDefinition | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('role_definitions' as any)
      .select('*')
      .eq('module', module)
      .eq('role_key', roleKey)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data as unknown as RoleDefinition;
  },

  /**
   * Update a role definition
   */
  async updateRoleDefinition(
    module: string,
    roleKey: string,
    updates: Partial<Pick<RoleDefinition, 'display_name' | 'description' | 'is_active'>>
  ): Promise<RoleDefinition> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('role_definitions' as any)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('module', module)
      .eq('role_key', roleKey)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as RoleDefinition;
  },

  // ============================================================================
  // PERMISSIONS
  // ============================================================================

  /**
   * Get all permissions for a module
   */
  async getAllPermissions(module: string): Promise<Permission[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('permissions' as any)
      .select('*')
      .eq('module', module)
      .order('resource')
      .order('action');

    if (error) throw error;
    return (data as unknown as Permission[]) || [];
  },

  /**
   * Get role permissions (which permissions are enabled for a role)
   */
  async getRolePermissions(module: string, roleKey: string): Promise<string[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('role_permissions' as any)
      .select('permission_code')
      .eq('module', module)
      .eq('role', roleKey);

    if (error) throw error;
    return ((data as unknown as { permission_code: string }[]) || []).map((p) => p.permission_code);
  },

  /**
   * Set role permissions (replace all permissions for a role)
   */
  async setRolePermissions(
    module: string,
    roleKey: string,
    permissionCodes: string[]
  ): Promise<void> {
    const supabase = createClient();

    // Delete existing permissions
    const { error: deleteError } = await supabase
      .from('role_permissions' as any)
      .delete()
      .eq('module', module)
      .eq('role', roleKey);

    if (deleteError) throw deleteError;

    // Insert new permissions
    if (permissionCodes.length > 0) {
      const { error: insertError } = await supabase.from('role_permissions' as any).insert(
        permissionCodes.map((code) => ({
          module,
          role: roleKey,
          permission_code: code,
        }))
      );

      if (insertError) throw insertError;
    }
  },

  /**
   * Toggle a single permission for a role
   */
  async toggleRolePermission(
    module: string,
    roleKey: string,
    permissionCode: string,
    enabled: boolean
  ): Promise<void> {
    const supabase = createClient();

    if (enabled) {
      // Add permission
      const { error } = await supabase.from('role_permissions' as any).upsert(
        {
          module,
          role: roleKey,
          permission_code: permissionCode,
        },
        { onConflict: 'module,role,permission_code' }
      );
      if (error) throw error;
    } else {
      // Remove permission
      const { error } = await supabase
        .from('role_permissions' as any)
        .delete()
        .eq('module', module)
        .eq('role', roleKey)
        .eq('permission_code', permissionCode);
      if (error) throw error;
    }
  },

  // ============================================================================
  // MENU VISIBILITY
  // ============================================================================

  /**
   * Get menu visibility for a role
   */
  async getMenuVisibility(module: string, roleKey: string): Promise<Record<string, boolean>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('role_menu_visibility' as any)
      .select('menu_key, is_visible')
      .eq('module', module)
      .eq('role_key', roleKey);

    if (error) throw error;

    const visibility: Record<string, boolean> = {};
    ((data as unknown as { menu_key: string; is_visible: boolean }[]) || []).forEach((item) => {
      visibility[item.menu_key] = item.is_visible;
    });
    return visibility;
  },

  /**
   * Set menu visibility for a role (upsert all)
   */
  async setMenuVisibility(
    module: string,
    roleKey: string,
    visibility: Record<string, boolean>
  ): Promise<void> {
    const supabase = createClient();

    const records = Object.entries(visibility).map(([menuKey, isVisible]) => ({
      module,
      role_key: roleKey,
      menu_key: menuKey,
      is_visible: isVisible,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('role_menu_visibility' as any)
      .upsert(records, { onConflict: 'module,role_key,menu_key' });

    if (error) throw error;
  },

  /**
   * Toggle a single menu item visibility
   */
  async toggleMenuVisibility(
    module: string,
    roleKey: string,
    menuKey: string,
    isVisible: boolean
  ): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('role_menu_visibility' as any).upsert(
      {
        module,
        role_key: roleKey,
        menu_key: menuKey,
        is_visible: isVisible,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'module,role_key,menu_key' }
    );

    if (error) throw error;
  },

  // ============================================================================
  // DATA SCOPES
  // ============================================================================

  /**
   * Get data scopes for a role
   */
  async getDataScopes(
    module: string,
    roleKey: string
  ): Promise<Record<string, 'own' | 'project' | 'company' | 'all'>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('role_data_scope' as any)
      .select('resource, scope_type')
      .eq('module', module)
      .eq('role_key', roleKey);

    if (error) throw error;

    const scopes: Record<string, 'own' | 'project' | 'company' | 'all'> = {};
    ((data as unknown as { resource: string; scope_type: string }[]) || []).forEach((item) => {
      scopes[item.resource] = item.scope_type as 'own' | 'project' | 'company' | 'all';
    });
    return scopes;
  },

  /**
   * Set data scopes for a role (upsert all)
   */
  async setDataScopes(
    module: string,
    roleKey: string,
    scopes: Record<string, 'own' | 'project' | 'company' | 'all'>
  ): Promise<void> {
    const supabase = createClient();

    const records = Object.entries(scopes).map(([resource, scopeType]) => ({
      module,
      role_key: roleKey,
      resource,
      scope_type: scopeType,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('role_data_scope' as any)
      .upsert(records, { onConflict: 'module,role_key,resource' });

    if (error) throw error;
  },

  /**
   * Set a single data scope
   */
  async setDataScope(
    module: string,
    roleKey: string,
    resource: string,
    scopeType: 'own' | 'project' | 'company' | 'all'
  ): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('role_data_scope' as any).upsert(
      {
        module,
        role_key: roleKey,
        resource,
        scope_type: scopeType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'module,role_key,resource' }
    );

    if (error) throw error;
  },

  // ============================================================================
  // FULL ROLE CONFIG
  // ============================================================================

  /**
   * Get full config for a role (definition, permissions, menu visibility, data scopes)
   */
  async getFullRoleConfig(module: string, roleKey: string): Promise<RoleConfig | null> {
    const [definition, permissions, menuVisibility, dataScopes] = await Promise.all([
      this.getRoleDefinition(module, roleKey),
      this.getRolePermissions(module, roleKey),
      this.getMenuVisibility(module, roleKey),
      this.getDataScopes(module, roleKey),
    ]);

    if (!definition) return null;

    return {
      definition,
      permissions,
      menuVisibility,
      dataScopes,
    };
  },

  /**
   * Get permissions grouped by resource (for UI)
   */
  async getPermissionsGrouped(
    module: string,
    roleKey: string
  ): Promise<PermissionGroup[]> {
    const [allPermissions, rolePermissions] = await Promise.all([
      this.getAllPermissions(module),
      this.getRolePermissions(module, roleKey),
    ]);

    const enabledSet = new Set(rolePermissions);

    // Group by resource
    const groupMap = new Map<string, PermissionGroup>();

    allPermissions.forEach((perm) => {
      if (!groupMap.has(perm.resource)) {
        groupMap.set(perm.resource, {
          resource: perm.resource,
          resourceLabel: formatResourceLabel(perm.resource),
          permissions: [],
        });
      }

      groupMap.get(perm.resource)!.permissions.push({
        code: perm.code,
        action: perm.action,
        description: perm.description,
        enabled: enabledSet.has(perm.code),
      });
    });

    return Array.from(groupMap.values());
  },
};

// Helper to format resource name for display
function formatResourceLabel(resource: string): string {
  return resource
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default roleConfigApi;
