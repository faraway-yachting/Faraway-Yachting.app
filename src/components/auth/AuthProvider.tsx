'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { ModuleName, UserModuleRole } from '@/lib/supabase/api/userModuleRoles';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

// Types for company and project access
interface UserCompanyAccess {
  id: string;
  user_id: string;
  company_id: string;
  access_type: 'admin' | 'manager' | 'member' | 'viewer';
}

interface UserProjectAccess {
  id: string;
  user_id: string;
  project_id: string;
  access_type: 'investor' | 'crew' | 'manager' | 'full';
}

// Types for role configuration
type DataScopeType = 'own' | 'project' | 'company' | 'all';

interface RoleConfig {
  menuVisibility: Record<string, Record<string, boolean>>; // module -> menuKey -> visible
  dataScopes: Record<string, Record<string, DataScopeType>>; // module -> resource -> scope
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  moduleRoles: UserModuleRole[];
  permissions: string[];
  companyAccess: UserCompanyAccess[];
  projectAccess: UserProjectAccess[];
  roleConfig: RoleConfig;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasModuleAccess: (module: ModuleName) => boolean;
  getModuleRole: (module: ModuleName) => string | null;
  hasPermission: (permissionCode: string) => boolean;
  hasCompanyAccess: (companyId: string, requiredAccess?: string[]) => boolean;
  hasProjectAccess: (projectId: string) => boolean;
  getAccessibleCompanyIds: () => string[];
  getAccessibleProjectIds: () => string[];
  isMenuVisible: (module: string, menuKey: string) => boolean;
  getDataScope: (module: string, resource: string) => DataScopeType;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [moduleRoles, setModuleRoles] = useState<UserModuleRole[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [companyAccess, setCompanyAccess] = useState<UserCompanyAccess[]>([]);
  const [projectAccess, setProjectAccess] = useState<UserProjectAccess[]>([]);
  const [roleConfig, setRoleConfig] = useState<RoleConfig>({
    menuVisibility: {},
    dataScopes: {},
  });

  const supabase = createClient();

  // Determine if user is super admin from profile
  const isSuperAdmin = profile?.is_super_admin === true;

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error, 'userId:', userId);
        return null;
      }
      console.log('Profile fetched successfully:', data?.full_name, 'is_super_admin:', data?.is_super_admin);
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const fetchModuleRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_module_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching module roles:', error, 'userId:', userId);
        return [];
      }
      console.log('Module roles fetched:', data?.length, 'roles for user');
      return data || [];
    } catch (error) {
      console.error('Error fetching module roles:', error);
      return [];
    }
  };

  const fetchPermissions = async (userId: string): Promise<string[]> => {
    try {
      // Use the database function to get effective permissions
      // Note: RPC function not in database.types.ts yet
      const { data, error } = await (supabase.rpc as any)('get_user_permissions', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching permissions:', error);
        return [];
      }
      return (data || []).map((row: { permission_code: string }) => row.permission_code);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      return [];
    }
  };

  const fetchCompanyAccess = async (userId: string): Promise<UserCompanyAccess[]> => {
    try {
      const { data, error } = await supabase
        .from('user_company_access' as any)
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching company access:', error);
        return [];
      }
      return (data as unknown as UserCompanyAccess[]) || [];
    } catch (error) {
      console.error('Error fetching company access:', error);
      return [];
    }
  };

  const fetchProjectAccess = async (userId: string): Promise<UserProjectAccess[]> => {
    try {
      const { data, error } = await supabase
        .from('user_project_access' as any)
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching project access:', error);
        return [];
      }
      return (data as unknown as UserProjectAccess[]) || [];
    } catch (error) {
      console.error('Error fetching project access:', error);
      return [];
    }
  };

  const fetchRoleConfig = async (roles: UserModuleRole[]): Promise<RoleConfig> => {
    const config: RoleConfig = {
      menuVisibility: {},
      dataScopes: {},
    };

    try {
      // For each module role, fetch the role's menu visibility and data scopes
      for (const moduleRole of roles) {
        const module = moduleRole.module;
        const roleKey = moduleRole.role;

        // Fetch menu visibility for this role
        // Wrap in try-catch to handle case where table doesn't exist yet
        try {
          const { data: visibilityDataRaw, error: visError } = await supabase
            .from('role_menu_visibility' as any)
            .select('menu_key, is_visible')
            .eq('module', module)
            .eq('role_key', roleKey);

          const visibilityData = visibilityDataRaw as unknown as { menu_key: string; is_visible: boolean }[] | null;
          if (!visError && visibilityData) {
            config.menuVisibility[module] = config.menuVisibility[module] || {};
            for (const item of visibilityData) {
              config.menuVisibility[module][item.menu_key] = item.is_visible;
            }
          }
        } catch (e) {
          // Table might not exist yet, continue gracefully
          console.warn('role_menu_visibility table not available:', e);
        }

        // Fetch data scopes for this role
        try {
          const { data: scopeDataRaw, error: scopeError } = await supabase
            .from('role_data_scope' as any)
            .select('resource, scope_type')
            .eq('module', module)
            .eq('role_key', roleKey);

          const scopeData = scopeDataRaw as unknown as { resource: string; scope_type: string }[] | null;
          if (!scopeError && scopeData) {
            config.dataScopes[module] = config.dataScopes[module] || {};
            for (const item of scopeData) {
              config.dataScopes[module][item.resource] = item.scope_type as DataScopeType;
            }
          }
        } catch (e) {
          // Table might not exist yet, continue gracefully
          console.warn('role_data_scope table not available:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching role config:', error);
    }

    return config;
  };

  // Helper to check if user has access to a module
  const hasModuleAccess = (module: ModuleName): boolean => {
    if (isSuperAdmin) return true;
    return moduleRoles.some(mr => mr.module === module && mr.is_active);
  };

  // Helper to get user's role in a module
  const getModuleRole = (module: ModuleName): string | null => {
    if (isSuperAdmin) return 'admin';
    const moduleRole = moduleRoles.find(mr => mr.module === module && mr.is_active);
    return moduleRole?.role || null;
  };

  // Check if user has a specific permission
  const hasPermission = (permissionCode: string): boolean => {
    if (isSuperAdmin) return true;
    return permissions.includes(permissionCode);
  };

  // Check if user has access to a specific company
  const hasCompanyAccess = (companyId: string, requiredAccess?: string[]): boolean => {
    if (isSuperAdmin) return true;
    const access = companyAccess.find(ca => ca.company_id === companyId);
    if (!access) return false;
    if (!requiredAccess) return true;
    return requiredAccess.includes(access.access_type);
  };

  // Check if user has access to a specific project
  const hasProjectAccess = (projectId: string): boolean => {
    if (isSuperAdmin) return true;
    // Check if user has direct project access
    if (projectAccess.some(pa => pa.project_id === projectId)) return true;
    // Check if user has manager/admin company access (which gives access to all projects in that company)
    // This would require knowing which company the project belongs to
    return false;
  };

  // Get all company IDs the user can access
  const getAccessibleCompanyIds = (): string[] => {
    return companyAccess.map(ca => ca.company_id);
  };

  // Get all project IDs the user can access
  const getAccessibleProjectIds = (): string[] => {
    return projectAccess.map(pa => pa.project_id);
  };

  // Check if a menu item is visible for the user's role
  const isMenuVisible = (module: string, menuKey: string): boolean => {
    // Super admin sees everything
    if (isSuperAdmin) return true;

    // If no config for this module, default to visible
    if (!roleConfig.menuVisibility[module]) return true;

    // Return the visibility setting, defaulting to true if not configured
    return roleConfig.menuVisibility[module][menuKey] ?? true;
  };

  // Get the data scope for a resource in a module
  const getDataScope = (module: string, resource: string): DataScopeType => {
    // Super admin has full access
    if (isSuperAdmin) return 'all';

    // If no config for this module, default to company scope
    if (!roleConfig.dataScopes[module]) return 'company';

    // Return the scope setting, defaulting to company if not configured
    return roleConfig.dataScopes[module][resource] ?? 'company';
  };

  const refreshProfile = async () => {
    if (user) {
      const [profileData, rolesData, permsData, companyData, projectData] = await Promise.all([
        fetchProfile(user.id),
        fetchModuleRoles(user.id),
        fetchPermissions(user.id),
        fetchCompanyAccess(user.id),
        fetchProjectAccess(user.id)
      ]);
      setProfile(profileData);
      setModuleRoles(rolesData);
      setPermissions(permsData);
      setCompanyAccess(companyData);
      setProjectAccess(projectData);

      // Fetch role config after getting module roles
      if (rolesData.length > 0) {
        const config = await fetchRoleConfig(rolesData);
        setRoleConfig(config);
      }
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          const [profileData, rolesData, permsData, companyData, projectData] = await Promise.all([
            fetchProfile(initialSession.user.id),
            fetchModuleRoles(initialSession.user.id),
            fetchPermissions(initialSession.user.id),
            fetchCompanyAccess(initialSession.user.id),
            fetchProjectAccess(initialSession.user.id)
          ]);
          setProfile(profileData);
          setModuleRoles(rolesData);
          setPermissions(permsData);
          setCompanyAccess(companyData);
          setProjectAccess(projectData);

          // Fetch role config after getting module roles
          if (rolesData.length > 0) {
            const config = await fetchRoleConfig(rolesData);
            setRoleConfig(config);
          }
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const [profileData, rolesData, permsData, companyData, projectData] = await Promise.all([
            fetchProfile(currentSession.user.id),
            fetchModuleRoles(currentSession.user.id),
            fetchPermissions(currentSession.user.id),
            fetchCompanyAccess(currentSession.user.id),
            fetchProjectAccess(currentSession.user.id)
          ]);
          setProfile(profileData);
          setModuleRoles(rolesData);
          setPermissions(permsData);
          setCompanyAccess(companyData);
          setProjectAccess(projectData);

          // Fetch role config after getting module roles
          if (rolesData.length > 0) {
            const config = await fetchRoleConfig(rolesData);
            setRoleConfig(config);
          }
        } else {
          setProfile(null);
          setModuleRoles([]);
          setPermissions([]);
          setCompanyAccess([]);
          setProjectAccess([]);
          setRoleConfig({ menuVisibility: {}, dataScopes: {} });
        }

        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setModuleRoles([]);
    setPermissions([]);
    setCompanyAccess([]);
    setProjectAccess([]);
    setRoleConfig({ menuVisibility: {}, dataScopes: {} });
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isSuperAdmin,
    moduleRoles,
    permissions,
    companyAccess,
    projectAccess,
    roleConfig,
    signOut,
    refreshProfile,
    hasModuleAccess,
    getModuleRole,
    hasPermission,
    hasCompanyAccess,
    hasProjectAccess,
    getAccessibleCompanyIds,
    getAccessibleProjectIds,
    isMenuVisible,
    getDataScope
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
