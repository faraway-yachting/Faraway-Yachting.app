'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { ModuleName, UserModuleRole } from '@/lib/supabase/api/userModuleRoles';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  moduleRoles: UserModuleRole[];
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasModuleAccess: (module: ModuleName) => boolean;
  getModuleRole: (module: ModuleName) => string | null;
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
        console.error('Error fetching profile:', error);
        return null;
      }
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
        console.error('Error fetching module roles:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching module roles:', error);
      return [];
    }
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

  const refreshProfile = async () => {
    if (user) {
      const [profileData, rolesData] = await Promise.all([
        fetchProfile(user.id),
        fetchModuleRoles(user.id)
      ]);
      setProfile(profileData);
      setModuleRoles(rolesData);
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
          const [profileData, rolesData] = await Promise.all([
            fetchProfile(initialSession.user.id),
            fetchModuleRoles(initialSession.user.id)
          ]);
          setProfile(profileData);
          setModuleRoles(rolesData);
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
          const [profileData, rolesData] = await Promise.all([
            fetchProfile(currentSession.user.id),
            fetchModuleRoles(currentSession.user.id)
          ]);
          setProfile(profileData);
          setModuleRoles(rolesData);
        } else {
          setProfile(null);
          setModuleRoles([]);
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
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isSuperAdmin,
    moduleRoles,
    signOut,
    refreshProfile,
    hasModuleAccess,
    getModuleRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
