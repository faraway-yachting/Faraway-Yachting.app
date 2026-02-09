import { createClient } from '../client';
import type {
  YachtProduct,
  YachtSource,
  ProductCharterType,
} from '@/data/yachtProduct/types';
import { Currency } from '@/data/company/types';

// Database row type (matches the SQL schema)
interface DbYachtProduct {
  id: string;
  yacht_source: 'own' | 'external';
  project_id: string | null;
  external_yacht_id: string | null;
  name: string;
  charter_type: 'full_day_charter' | 'half_day_charter' | 'overnight_charter' | 'cabin_charter' | 'bareboat_charter' | 'other_charter';
  duration: string;
  depart_from: string | null;
  destination: string | null;
  price: number | null;
  currency: string | null;
  default_time: string | null;
  display_order: number | null;
  is_active: boolean | null;
  notes: string | null;
  created_by: string | null;
  default_start_day: number | null;
  default_nights: number | null;
  created_at: string;
  updated_at: string;
}

// Transform functions
function dbYachtProductToFrontend(db: DbYachtProduct): YachtProduct {
  return {
    id: db.id,
    yachtSource: db.yacht_source as YachtSource,
    projectId: db.project_id ?? undefined,
    externalYachtId: db.external_yacht_id ?? undefined,
    name: db.name,
    charterType: db.charter_type as ProductCharterType,
    duration: db.duration,
    departFrom: db.depart_from ?? undefined,
    destination: db.destination ?? undefined,
    price: db.price ?? undefined,
    currency: (db.currency || 'THB') as Currency,
    defaultTime: db.default_time ?? undefined,
    defaultStartDay: db.default_start_day ?? undefined,
    defaultNights: db.default_nights ?? undefined,
    displayOrder: db.display_order ?? 0,
    isActive: db.is_active ?? true,
    notes: db.notes ?? undefined,
    createdBy: db.created_by ?? undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

interface DbYachtProductInsert {
  yacht_source: 'own' | 'external';
  project_id?: string | null;
  external_yacht_id?: string | null;
  name: string;
  charter_type: 'full_day_charter' | 'half_day_charter' | 'overnight_charter' | 'cabin_charter' | 'bareboat_charter' | 'other_charter';
  duration: string;
  depart_from?: string | null;
  destination?: string | null;
  price?: number | null;
  currency?: string;
  default_time?: string | null;
  display_order?: number;
  is_active?: boolean;
  notes?: string | null;
  created_by?: string | null;
  default_start_day?: number | null;
  default_nights?: number | null;
}

function frontendYachtProductToDb(
  product: Partial<YachtProduct>
): DbYachtProductInsert {
  const result: DbYachtProductInsert = {
    yacht_source: product.yachtSource!,
    project_id: product.projectId ?? null,
    external_yacht_id: product.externalYachtId ?? null,
    name: product.name!,
    charter_type: product.charterType!,
    duration: product.duration!,
    depart_from: product.departFrom ?? null,
    destination: product.destination ?? null,
    price: product.price ?? null,
    currency: product.currency || 'THB',
    default_time: product.defaultTime ?? null,
    display_order: product.displayOrder ?? 0,
    is_active: product.isActive ?? true,
    notes: product.notes ?? null,
    created_by: product.createdBy ?? null,
  };
  // Only include schedule fields when set (graceful if migration not yet applied)
  if (product.defaultStartDay != null) {
    result.default_start_day = product.defaultStartDay;
  }
  if (product.defaultNights != null) {
    result.default_nights = product.defaultNights;
  }
  return result;
}

export const yachtProductsApi = {
  /**
   * Get all yacht products
   */
  async getAll(): Promise<YachtProduct[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('yacht_products' as any)
      .select('*')
      .order('display_order');
    if (error) throw error;
    return ((data as unknown as DbYachtProduct[]) ?? []).map(dbYachtProductToFrontend);
  },

  /**
   * Get all active yacht products
   */
  async getActive(): Promise<YachtProduct[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('yacht_products' as any)
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    if (error) throw error;
    return ((data as unknown as DbYachtProduct[]) ?? []).map(dbYachtProductToFrontend);
  },

  /**
   * Get a yacht product by ID
   */
  async getById(id: string): Promise<YachtProduct | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('yacht_products' as any)
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return dbYachtProductToFrontend(data as unknown as DbYachtProduct);
  },

  /**
   * Get products for an owned yacht (by project ID)
   */
  async getByOwnYacht(projectId: string): Promise<YachtProduct[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('yacht_products' as any)
      .select('*')
      .eq('yacht_source', 'own')
      .eq('project_id', projectId)
      .order('display_order');
    if (error) throw error;
    return ((data as unknown as DbYachtProduct[]) ?? []).map(dbYachtProductToFrontend);
  },

  /**
   * Get active products for an owned yacht
   */
  async getActiveByOwnYacht(projectId: string): Promise<YachtProduct[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('yacht_products' as any)
      .select('*')
      .eq('yacht_source', 'own')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('display_order');
    if (error) throw error;
    return ((data as unknown as DbYachtProduct[]) ?? []).map(dbYachtProductToFrontend);
  },

  /**
   * Get products for an external yacht (by localStorage ID)
   */
  async getByExternalYacht(externalYachtId: string): Promise<YachtProduct[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('yacht_products' as any)
      .select('*')
      .eq('yacht_source', 'external')
      .eq('external_yacht_id', externalYachtId)
      .order('display_order');
    if (error) throw error;
    return ((data as unknown as DbYachtProduct[]) ?? []).map(dbYachtProductToFrontend);
  },

  /**
   * Get active products for an external yacht
   */
  async getActiveByExternalYacht(
    externalYachtId: string
  ): Promise<YachtProduct[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('yacht_products' as any)
      .select('*')
      .eq('yacht_source', 'external')
      .eq('external_yacht_id', externalYachtId)
      .eq('is_active', true)
      .order('display_order');
    if (error) throw error;
    return ((data as unknown as DbYachtProduct[]) ?? []).map(dbYachtProductToFrontend);
  },

  /**
   * Get products for a yacht (convenience method that handles both types)
   */
  async getByYacht(
    yachtSource: YachtSource,
    yachtId: string
  ): Promise<YachtProduct[]> {
    if (yachtSource === 'own') {
      return this.getByOwnYacht(yachtId);
    }
    return this.getByExternalYacht(yachtId);
  },

  /**
   * Get active products for a yacht
   */
  async getActiveByYacht(
    yachtSource: YachtSource,
    yachtId: string
  ): Promise<YachtProduct[]> {
    if (yachtSource === 'own') {
      return this.getActiveByOwnYacht(yachtId);
    }
    return this.getActiveByExternalYacht(yachtId);
  },

  /**
   * Create a new yacht product
   */
  async create(product: Partial<YachtProduct>): Promise<YachtProduct> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('yacht_products' as any)
      .insert([frontendYachtProductToDb(product)])
      .select()
      .single();
    if (error) throw error;
    return dbYachtProductToFrontend(data as unknown as DbYachtProduct);
  },

  /**
   * Update a yacht product
   */
  async update(
    id: string,
    updates: Partial<YachtProduct>
  ): Promise<YachtProduct> {
    const supabase = createClient();
    const dbUpdates: Partial<DbYachtProductInsert> = {};

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.charterType !== undefined)
      dbUpdates.charter_type = updates.charterType;
    if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
    if (updates.departFrom !== undefined)
      dbUpdates.depart_from = updates.departFrom ?? null;
    if (updates.destination !== undefined)
      dbUpdates.destination = updates.destination ?? null;
    if (updates.price !== undefined) dbUpdates.price = updates.price ?? null;
    if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
    if (updates.defaultTime !== undefined)
      dbUpdates.default_time = updates.defaultTime ?? null;
    if (updates.displayOrder !== undefined)
      dbUpdates.display_order = updates.displayOrder;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes ?? null;
    if (updates.defaultStartDay !== undefined)
      dbUpdates.default_start_day = updates.defaultStartDay ?? null;
    if (updates.defaultNights !== undefined)
      dbUpdates.default_nights = updates.defaultNights ?? null;

    const { data, error } = await supabase
      .from('yacht_products' as any)
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return dbYachtProductToFrontend(data as unknown as DbYachtProduct);
  },

  /**
   * Delete a yacht product
   */
  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('yacht_products' as any)
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Find a matching product for auto-fill
   * Returns the first active product matching the yacht and charter type
   */
  async findMatchingProduct(
    yachtSource: YachtSource,
    yachtId: string,
    charterType: ProductCharterType
  ): Promise<YachtProduct | null> {
    const supabase = createClient();
    let query = supabase
      .from('yacht_products' as any)
      .select('*')
      .eq('yacht_source', yachtSource)
      .eq('charter_type', charterType)
      .eq('is_active', true)
      .order('display_order')
      .limit(1);

    if (yachtSource === 'own') {
      query = query.eq('project_id', yachtId);
    } else {
      query = query.eq('external_yacht_id', yachtId);
    }

    const { data, error } = await query;
    if (error) throw error;
    const typedData = data as unknown as DbYachtProduct[] | null;
    return typedData && typedData.length > 0 ? dbYachtProductToFrontend(typedData[0]) : null;
  },

  /**
   * Get all products matching charter types for a yacht
   * Used to show available presets based on selected booking type
   */
  async getByYachtAndCharterTypes(
    yachtSource: YachtSource,
    yachtId: string,
    charterTypes: ProductCharterType[]
  ): Promise<YachtProduct[]> {
    const supabase = createClient();
    let query = supabase
      .from('yacht_products' as any)
      .select('*')
      .eq('yacht_source', yachtSource)
      .in('charter_type', charterTypes)
      .eq('is_active', true)
      .order('display_order');

    if (yachtSource === 'own') {
      query = query.eq('project_id', yachtId);
    } else {
      query = query.eq('external_yacht_id', yachtId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return ((data as unknown as DbYachtProduct[]) ?? []).map(dbYachtProductToFrontend);
  },

  /**
   * Reorder products (update display_order for multiple products)
   */
  async reorder(productIds: string[]): Promise<void> {
    const supabase = createClient();
    const updates = productIds.map((id, index) => ({
      id,
      display_order: index,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('yacht_products' as any)
        .update({ display_order: update.display_order })
        .eq('id', update.id);
      if (error) throw error;
    }
  },
};
