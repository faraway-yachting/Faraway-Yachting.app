import { createClient } from '../client';
import type { TaxiVehicle } from '@/data/taxi/types';

function dbToFrontend(db: Record<string, any>): TaxiVehicle {
  return {
    id: db.id,
    taxiCompanyId: db.taxi_company_id,
    plateNumber: db.plate_number,
    description: db.description ?? undefined,
    notes: db.notes ?? undefined,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export const taxiVehiclesApi = {
  async getByCompanyId(companyId: string): Promise<TaxiVehicle[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_vehicles' as any)
      .select('*')
      .eq('taxi_company_id', companyId)
      .order('plate_number');
    if (error) throw error;
    return (data ?? []).map(dbToFrontend);
  },

  async getActiveByCompanyId(companyId: string): Promise<TaxiVehicle[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_vehicles' as any)
      .select('*')
      .eq('taxi_company_id', companyId)
      .eq('is_active', true)
      .order('plate_number');
    if (error) throw error;
    return (data ?? []).map(dbToFrontend);
  },

  async create(vehicle: {
    taxiCompanyId: string;
    plateNumber: string;
    description?: string;
    notes?: string;
  }): Promise<TaxiVehicle> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_vehicles' as any)
      .insert([{
        taxi_company_id: vehicle.taxiCompanyId,
        plate_number: vehicle.plateNumber,
        description: vehicle.description || null,
        notes: vehicle.notes || null,
      }])
      .select()
      .single();
    if (error) throw error;
    return dbToFrontend(data);
  },

  async update(id: string, updates: Partial<{
    plateNumber: string;
    description: string;
    notes: string;
    isActive: boolean;
  }>): Promise<TaxiVehicle> {
    const supabase = createClient();
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.plateNumber !== undefined) dbUpdates.plate_number = updates.plateNumber;
    if (updates.description !== undefined) dbUpdates.description = updates.description || null;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    const { data, error } = await supabase
      .from('taxi_vehicles' as any)
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
      .from('taxi_vehicles' as any)
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
