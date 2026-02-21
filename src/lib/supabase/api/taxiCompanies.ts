import { createClient } from '../client';
import type { TaxiCompany } from '@/data/taxi/types';

export const taxiCompaniesApi = {
  async getAll(): Promise<TaxiCompany[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_companies')
      .select('*')
      .order('name');
    if (error) throw error;
    return (data ?? []).map(dbToFrontend);
  },

  async getActive(): Promise<TaxiCompany[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_companies')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return (data ?? []).map(dbToFrontend);
  },

  async getById(id: string): Promise<TaxiCompany | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_companies')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return dbToFrontend(data);
  },

  async create(company: {
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    lineId?: string;
    notes?: string;
  }): Promise<TaxiCompany> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_companies')
      .insert([{
        name: company.name,
        contact_person: company.contactPerson || null,
        phone: company.phone || null,
        email: company.email || null,
        line_id: company.lineId || null,
        notes: company.notes || null,
      }])
      .select()
      .single();
    if (error) throw error;
    return dbToFrontend(data);
  },

  async update(id: string, updates: Partial<{
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    lineId: string;
    notes: string;
    isActive: boolean;
  }>): Promise<TaxiCompany> {
    const supabase = createClient();
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.contactPerson !== undefined) dbUpdates.contact_person = updates.contactPerson || null;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
    if (updates.email !== undefined) dbUpdates.email = updates.email || null;
    if (updates.lineId !== undefined) dbUpdates.line_id = updates.lineId || null;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    const { data, error } = await supabase
      .from('taxi_companies')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return dbToFrontend(data);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('taxi_companies')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

function dbToFrontend(db: Record<string, any>): TaxiCompany {
  return {
    id: db.id,
    name: db.name,
    contactPerson: db.contact_person ?? undefined,
    phone: db.phone ?? undefined,
    email: db.email ?? undefined,
    lineId: db.line_id ?? undefined,
    notes: db.notes ?? undefined,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}
