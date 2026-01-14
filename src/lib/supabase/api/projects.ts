import { createClient } from '../client';
import type { Database } from '../database.types';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

export const projectsApi = {
  async getAll(): Promise<Project[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Project | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getByCode(code: string): Promise<Project | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('code', code)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async create(project: ProjectInsert): Promise<Project> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .insert([project])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: ProjectUpdate): Promise<Project> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getByCompany(companyId: string): Promise<Project[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('company_id', companyId)
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getActiveByCompany(companyId: string): Promise<Project[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getActive(): Promise<Project[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'active')
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getByStatus(status: 'active' | 'inactive' | 'completed'): Promise<Project[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('status', status)
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async toggleStatus(id: string): Promise<Project> {
    const supabase = createClient();
    // First get the current status
    const { data: current, error: fetchError } = await supabase
      .from('projects')
      .select('status')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    // Cycle through: active -> inactive -> completed -> active
    const statusOrder: Array<'active' | 'inactive' | 'completed'> = ['active', 'inactive', 'completed'];
    const currentIndex = statusOrder.indexOf(current.status as 'active' | 'inactive' | 'completed');
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

    const { data, error } = await supabase
      .from('projects')
      .update({ status: nextStatus })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
