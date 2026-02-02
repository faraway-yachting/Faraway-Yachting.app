import { createClient } from '../client';
import type { Database } from '../database.types';

type BoatAssignment = Database['public']['Tables']['employee_boat_assignments']['Row'];
type BoatAssignmentInsert = Database['public']['Tables']['employee_boat_assignments']['Insert'];

export const employeeBoatAssignmentsApi = {
  async getByEmployee(employeeId: string): Promise<BoatAssignment[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('employee_boat_assignments')
      .select('*')
      .eq('employee_id', employeeId)
      .order('is_primary', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByBoat(boatId: string): Promise<BoatAssignment[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('employee_boat_assignments')
      .select('*')
      .eq('boat_id', boatId);
    if (error) throw error;
    return data ?? [];
  },

  async create(assignment: BoatAssignmentInsert): Promise<BoatAssignment> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('employee_boat_assignments')
      .insert([assignment])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<BoatAssignmentInsert>): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('employee_boat_assignments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('employee_boat_assignments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
