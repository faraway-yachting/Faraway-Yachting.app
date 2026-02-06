'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { createClient, clearSupabaseClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/timeout';
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

// Session storage cache for auth data
const AUTH_CACHE_KEY = 'faraway_auth_cache';
const AUTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface AuthCache {
  userId: string;
  profile: UserProfile | null;
  moduleRoles: UserModuleRole[];
  permissions: string[];
  companyAccess: UserCompanyAccess[];
  projectAccess: UserProjectAccess[];
  roleConfig: RoleConfig;
  timestamp: number;
}

function getCachedAuth(userId: string): AuthCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(AUTH_CACHE_KEY);
    if (!cached) return null;
    const data: AuthCache = JSON.parse(cached);
    // Check if cache is for same user and not expired
    if (data.userId === userId && Date.now() - data.timestamp < AUTH_CACHE_TTL) {
      return data;
    }
  } catch (e) {
    // Cache read failed, proceed without cache
  }
  return null;
}

function setCachedAuth(data: AuthCache): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    // Cache write failed, continue without caching
  }
}

function clearCachedAuth(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(AUTH_CACHE_KEY);
  } catch (e) {
    // Ignore cache clear errors
  }
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

  const loadingAuthRef = useRef(false);
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

    if (roles.length === 0) return config;

    // Collect all role keys for batch query
    const roleKeys = roles.map(r => r.role);

    try {
      // Single query for ALL menu visibility settings (instead of per-role)
      try {
        const { data: visibilityDataRaw, error: visError } = await supabase
          .from('role_menu_visibility' as any)
          .select('module, role_key, menu_key, is_visible')
          .in('role_key', roleKeys);

        const visibilityData = visibilityDataRaw as unknown as {
          module: string;
          role_key: string;
          menu_key: string;
          is_visible: boolean
        }[] | null;

        if (!visError && visibilityData) {
          for (const item of visibilityData) {
            // Only include if this module-role combo is in the user's roles
            const hasRole = roles.some(r => r.module === item.module && r.role === item.role_key);
            if (hasRole) {
              config.menuVisibility[item.module] = config.menuVisibility[item.module] || {};
              config.menuVisibility[item.module][item.menu_key] = item.is_visible;
            }
          }
        }
      } catch (e) {
        // Table might not exist yet, continue gracefully
        console.warn('role_menu_visibility table not available:', e);
      }

      // Single query for ALL data scope settings (instead of per-role)
      try {
        const { data: scopeDataRaw, error: scopeError } = await supabase
          .from('role_data_scope' as any)
          .select('module, role_key, resource, scope_type')
          .in('role_key', roleKeys);

        const scopeData = scopeDataRaw as unknown as {
          module: string;
          role_key: string;
          resource: string;
          scope_type: string
        }[] | null;

        if (!scopeError && scopeData) {
          for (const item of scopeData) {
            // Only include if this module-role combo is in the user's roles
            const hasRole = roles.some(r => r.module === item.module && r.role === item.role_key);
            if (hasRole) {
              config.dataScopes[item.module] = config.dataScopes[item.module] || {};
              config.dataScopes[item.module][item.resource] = item.scope_type as DataScopeType;
            }
          }
        }
      } catch (e) {
        // Table might not exist yet, continue gracefully
        console.warn('role_data_scope table not available:', e);
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

  // Consolidated function to load all auth data for a user
  const loadAuthData = useCallback(async (userId: string, skipCache = false): Promise<void> => {
    // Prevent concurrent calls (INITIAL_SESSION + SIGNED_IN fire in quick succession)
    if (loadingAuthRef.current) return;
    loadingAuthRef.current = true;

    try {
      // Check cache first (unless explicitly skipping)
      if (!skipCache) {
        const cached = getCachedAuth(userId);
        if (cached) {
          setProfile(cached.profile);
          setModuleRoles(cached.moduleRoles);
          setPermissions(cached.permissions);
          setCompanyAccess(cached.companyAccess);
          setProjectAccess(cached.projectAccess);
          setRoleConfig(cached.roleConfig);
          return;
        }
      }

      // Fetch all data in parallel with 10-second timeout per query (safety net)
      const [profileDataInitial, rolesData, permsData, companyData, projectData] = await Promise.all([
        withTimeout(fetchProfile(userId), 10000).catch(() => null),
        withTimeout(fetchModuleRoles(userId), 10000).catch(() => []),
        withTimeout(fetchPermissions(userId), 10000).catch(() => []),
        withTimeout(fetchCompanyAccess(userId), 10000).catch(() => []),
        withTimeout(fetchProjectAccess(userId), 10000).catch(() => [])
      ]);

      // Profile is critical (determines is_super_admin) — retry once if it failed
      let profileData = profileDataInitial;
      if (!profileData) {
        console.warn('Profile fetch failed, retrying once...');
        profileData = await withTimeout(fetchProfile(userId), 10000).catch(() => null);
      }

      // Fetch role config (only if there are roles)
      let config: RoleConfig = { menuVisibility: {}, dataScopes: {} };
      if (rolesData.length > 0) {
        config = await fetchRoleConfig(rolesData);
      }

      // Update state
      setProfile(profileData);
      setModuleRoles(rolesData);
      setPermissions(permsData);
      setCompanyAccess(companyData);
      setProjectAccess(projectData);
      setRoleConfig(config);

      // Cache the result
      setCachedAuth({
        userId,
        profile: profileData,
        moduleRoles: rolesData,
        permissions: permsData,
        companyAccess: companyData,
        projectAccess: projectData,
        roleConfig: config,
        timestamp: Date.now(),
      });
    } finally {
      loadingAuthRef.current = false;
    }
  }, []);

  const refreshProfile = async () => {
    if (user) {
      // Skip cache when explicitly refreshing
      await loadAuthData(user.id, true);
    }
  };

  useEffect(() => {
    const client = createClient();
    const { data: { subscription } } = client.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setModuleRoles([]);
          setPermissions([]);
          setCompanyAccess([]);
          setProjectAccess([]);
          setRoleConfig({ menuVisibility: {}, dataScopes: {} });
          clearCachedAuth();
          setIsLoading(false);

          // Redirect to login when sign out is detected (including other tabs)
          if (typeof window !== 'undefined') {
            const authPages = ['/login', '/signup', '/forgot-password', '/auth/'];
            const isOnAuthPage = authPages.some(page => window.location.pathname.startsWith(page));
            if (!isOnAuthPage) {
              window.location.href = '/login';
            }
          }
          return;
        }

        // SIGNED_IN (fresh login) or INITIAL_SESSION (page load with existing session)
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          // Fresh login: skip cache. Page load: use cache if available.
          const skipCache = event === 'SIGNED_IN';
          await loadAuthData(currentSession.user.id, skipCache);
          setIsLoading(false);
          return;
        }

        // INITIAL_SESSION with no user = not authenticated
        if (event === 'INITIAL_SESSION' && !currentSession?.user) {
          setUser(null);
          setSession(null);
          setIsLoading(false);
          return;
        }

        // TOKEN_REFRESHED - just update session, no need to refetch data
        if (event === 'TOKEN_REFRESHED' && currentSession) {
          setSession(currentSession);
          return;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [loadAuthData]);

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    setSession(null);
    setModuleRoles([]);
    setPermissions([]);
    setCompanyAccess([]);
    setProjectAccess([]);
    setRoleConfig({ menuVisibility: {}, dataScopes: {} });
    clearCachedAuth();

    try {
      const freshClient = createClient();
      await freshClient.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.error('Error during sign out:', error);
    }

    clearSupabaseClient();

    window.location.href = '/login';
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
