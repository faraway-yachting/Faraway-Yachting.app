import { createClient } from '../client';
import { nanoid } from 'nanoid';
import type { TaxiPublicLink } from '@/data/taxi/types';

function dbToFrontend(db: Record<string, any>): TaxiPublicLink {
  return {
    id: db.id,
    token: db.token,
    label: db.label,
    taxiCompanyId: db.taxi_company_id,
    isActive: db.is_active,
    expiresAt: db.expires_at ?? undefined,
    createdBy: db.created_by ?? undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export const taxiPublicLinksApi = {
  async getAll(): Promise<TaxiPublicLink[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_public_links' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(dbToFrontend);
  },

  async getByTaxiCompanyId(companyId: string): Promise<TaxiPublicLink[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_public_links' as any)
      .select('*')
      .eq('taxi_company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(dbToFrontend);
  },

  async create(input: {
    label: string;
    taxiCompanyId: string;
    expiresAt?: string | null;
    createdBy?: string;
  }): Promise<TaxiPublicLink> {
    const supabase = createClient();
    const token = nanoid(12);
    const { data, error } = await supabase
      .from('taxi_public_links' as any)
      .insert({
        token,
        label: input.label,
        taxi_company_id: input.taxiCompanyId,
        expires_at: input.expiresAt ?? null,
        created_by: input.createdBy ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return dbToFrontend(data);
  },

  async update(
    id: string,
    input: {
      label?: string;
      isActive?: boolean;
      expiresAt?: string | null;
    }
  ): Promise<void> {
    const supabase = createClient();
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (input.label !== undefined) updates.label = input.label;
    if (input.isActive !== undefined) updates.is_active = input.isActive;
    if (input.expiresAt !== undefined) updates.expires_at = input.expiresAt;

    const { error } = await supabase
      .from('taxi_public_links' as any)
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('taxi_public_links' as any)
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
