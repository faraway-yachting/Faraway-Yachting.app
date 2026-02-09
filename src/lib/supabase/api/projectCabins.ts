import { createClient } from '../client';
import type { ProjectCabin } from '@/data/booking/types';

// Snake_case row type matching the DB schema
interface ProjectCabinRow {
  id: string;
  project_id: string;
  cabin_name: string;
  cabin_number: number;
  position: string | null;
  max_guests: number;
  is_ensuite: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function rowToCabin(row: ProjectCabinRow): ProjectCabin {
  return {
    id: row.id,
    projectId: row.project_id,
    cabinName: row.cabin_name,
    cabinNumber: row.cabin_number,
    position: row.position ?? undefined,
    maxGuests: row.max_guests,
    isEnsuite: row.is_ensuite,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const projectCabinsApi = {
  async getByProjectId(projectId: string): Promise<ProjectCabin[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('project_cabins')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return ((data ?? []) as ProjectCabinRow[]).map(rowToCabin);
  },

  async create(cabin: {
    projectId: string;
    cabinName: string;
    cabinNumber: number;
    position?: string;
    maxGuests?: number;
    isEnsuite?: boolean;
    sortOrder?: number;
  }): Promise<ProjectCabin> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('project_cabins')
      .insert({
        project_id: cabin.projectId,
        cabin_name: cabin.cabinName,
        cabin_number: cabin.cabinNumber,
        position: cabin.position ?? null,
        max_guests: cabin.maxGuests ?? 2,
        is_ensuite: cabin.isEnsuite ?? true,
        sort_order: cabin.sortOrder ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToCabin(data as ProjectCabinRow);
  },

  async update(id: string, updates: {
    cabinName?: string;
    cabinNumber?: number;
    position?: string | null;
    maxGuests?: number;
    isEnsuite?: boolean;
    sortOrder?: number;
  }): Promise<ProjectCabin> {
    const supabase = createClient();
    const dbUpdates: Record<string, any> = {};
    if (updates.cabinName !== undefined) dbUpdates.cabin_name = updates.cabinName;
    if (updates.cabinNumber !== undefined) dbUpdates.cabin_number = updates.cabinNumber;
    if (updates.position !== undefined) dbUpdates.position = updates.position;
    if (updates.maxGuests !== undefined) dbUpdates.max_guests = updates.maxGuests;
    if (updates.isEnsuite !== undefined) dbUpdates.is_ensuite = updates.isEnsuite;
    if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

    const { data, error } = await (supabase as any)
      .from('project_cabins')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToCabin(data as ProjectCabinRow);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('project_cabins')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
