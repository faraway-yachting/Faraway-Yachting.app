import { createClient } from '../client';
import type { TaxiDriver } from '@/data/taxi/types';

function dbToFrontend(db: Record<string, any>): TaxiDriver {
  return {
    id: db.id,
    taxiCompanyId: db.taxi_company_id,
    name: db.name,
    phone: db.phone ?? undefined,
    notes: db.notes ?? undefined,
    defaultVehicleId: db.default_vehicle_id ?? undefined,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export const taxiDriversApi = {
  async getByCompanyId(companyId: string): Promise<TaxiDriver[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_drivers' as any)
      .select('*')
      .eq('taxi_company_id', companyId)
      .order('name');
    if (error) throw error;
    return (data ?? []).map(dbToFrontend);
  },

  async getActiveByCompanyId(companyId: string): Promise<TaxiDriver[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_drivers' as any)
      .select('*')
      .eq('taxi_company_id', companyId)
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return (data ?? []).map(dbToFrontend);
  },

  async create(driver: {
    taxiCompanyId: string;
    name: string;
    phone?: string;
    notes?: string;
    defaultVehicleId?: string;
  }): Promise<TaxiDriver> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_drivers' as any)
      .insert([{
        taxi_company_id: driver.taxiCompanyId,
        name: driver.name,
        phone: driver.phone || null,
        notes: driver.notes || null,
        default_vehicle_id: driver.defaultVehicleId || null,
      }])
      .select()
      .single();
    if (error) throw error;
    return dbToFrontend(data);
  },

  async update(id: string, updates: Partial<{
    name: string;
    phone: string;
    notes: string;
    defaultVehicleId: string;
    isActive: boolean;
  }>): Promise<TaxiDriver> {
    const supabase = createClient();
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
    if (updates.defaultVehicleId !== undefined) dbUpdates.default_vehicle_id = updates.defaultVehicleId || null;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    const { data, error } = await supabase
      .from('taxi_drivers' as any)
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
      .from('taxi_drivers' as any)
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
