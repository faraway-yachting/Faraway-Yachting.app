import { createClient } from '../client';

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  company_id: string | null;
  role: 'admin' | 'manager' | 'accountant' | 'captain' | 'viewer';
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SignUpData = {
  email: string;
  password: string;
  fullName?: string;
};

export type SignInData = {
  email: string;
  password: string;
};

export const authApi = {
  async signUp({ email, password, fullName }: SignUpData) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });
    if (error) throw error;
    return data;
  },

  async signIn({ email, password }: SignInData) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const supabase = createClient();
    // Use global scope to clear all sessions across tabs/windows
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) throw error;
  },

  async getSession() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getUser() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  async resetPassword(email: string) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) throw error;
    return data;
  },

  async updatePassword(newPassword: string) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
    return data;
  },

  // User Profile operations
  async getCurrentProfile(): Promise<UserProfile | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as UserProfile;
  },

  async getProfileById(id: string): Promise<UserProfile | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as UserProfile;
  },

  async updateProfile(id: string, updates: Partial<Omit<UserProfile, 'id' | 'created_at'>>): Promise<UserProfile> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as UserProfile;
  },

  async getAllProfiles(): Promise<UserProfile[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('full_name');
    if (error) throw error;
    return (data ?? []) as UserProfile[];
  },

  async getProfilesByCompany(companyId: string): Promise<UserProfile[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('company_id', companyId)
      .order('full_name');
    if (error) throw error;
    return (data ?? []) as UserProfile[];
  },

  async getProfilesByRole(role: 'admin' | 'manager' | 'accountant' | 'captain' | 'viewer'): Promise<UserProfile[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', role)
      .order('full_name');
    if (error) throw error;
    return (data ?? []) as UserProfile[];
  },

  async assignCompanyToUser(userId: string, companyId: string): Promise<UserProfile> {
    return this.updateProfile(userId, { company_id: companyId });
  },

  async updateUserRole(userId: string, role: 'admin' | 'manager' | 'accountant' | 'captain' | 'viewer'): Promise<UserProfile> {
    return this.updateProfile(userId, { role });
  },

  async deactivateUser(userId: string): Promise<UserProfile> {
    return this.updateProfile(userId, { is_active: false });
  },

  async activateUser(userId: string): Promise<UserProfile> {
    return this.updateProfile(userId, { is_active: true });
  },

  // Auth state listener
  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    const supabase = createClient();
    return supabase.auth.onAuthStateChange(callback);
  }
};
