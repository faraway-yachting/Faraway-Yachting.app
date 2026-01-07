import { createClient } from '../client';
import type { Database } from '../database.types';

type NumberFormatSetting = Database['public']['Tables']['number_format_settings']['Row'];
type NumberFormatSettingInsert = Database['public']['Tables']['number_format_settings']['Insert'];
type NumberFormatSettingUpdate = Database['public']['Tables']['number_format_settings']['Update'];
type PdfSetting = Database['public']['Tables']['pdf_settings']['Row'];
type PdfSettingInsert = Database['public']['Tables']['pdf_settings']['Insert'];
type PdfSettingUpdate = Database['public']['Tables']['pdf_settings']['Update'];

export const settingsApi = {
  // Number Format Settings
  async getAllNumberFormats(): Promise<NumberFormatSetting[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('number_format_settings')
      .select('*')
      .order('document_type');
    if (error) throw error;
    return data ?? [];
  },

  async getNumberFormatByType(
    companyId: string,
    documentType: 'quotation' | 'invoice' | 'receipt' | 'creditNote' | 'debitNote'
  ): Promise<NumberFormatSetting | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('number_format_settings')
      .select('*')
      .eq('company_id', companyId)
      .eq('document_type', documentType)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getNumberFormatsByCompany(companyId: string): Promise<NumberFormatSetting[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('number_format_settings')
      .select('*')
      .eq('company_id', companyId)
      .order('document_type');
    if (error) throw error;
    return data ?? [];
  },

  async createNumberFormat(setting: NumberFormatSettingInsert): Promise<NumberFormatSetting> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('number_format_settings')
      .insert([setting])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateNumberFormat(id: string, updates: NumberFormatSettingUpdate): Promise<NumberFormatSetting> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('number_format_settings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async upsertNumberFormat(setting: NumberFormatSettingInsert): Promise<NumberFormatSetting> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('number_format_settings')
      .upsert([setting], {
        onConflict: 'company_id,document_type'
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteNumberFormat(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('number_format_settings')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // PDF Settings
  async getAllPdfSettings(): Promise<PdfSetting[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('pdf_settings')
      .select('*')
      .order('document_type');
    if (error) throw error;
    return data ?? [];
  },

  async getPdfSettingByType(
    companyId: string | null,
    documentType: 'quotation' | 'invoice' | 'receipt'
  ): Promise<PdfSetting | null> {
    const supabase = createClient();
    let query = supabase
      .from('pdf_settings')
      .select('*')
      .eq('document_type', documentType);

    if (companyId) {
      query = query.eq('company_id', companyId);
    } else {
      query = query.is('company_id', null);
    }

    const { data, error } = await query.single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getPdfSettingsByCompany(companyId: string): Promise<PdfSetting[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('pdf_settings')
      .select('*')
      .eq('company_id', companyId)
      .order('document_type');
    if (error) throw error;
    return data ?? [];
  },

  async createPdfSetting(setting: PdfSettingInsert): Promise<PdfSetting> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('pdf_settings')
      .insert([setting])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updatePdfSetting(id: string, updates: PdfSettingUpdate): Promise<PdfSetting> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('pdf_settings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async upsertPdfSetting(setting: PdfSettingInsert): Promise<PdfSetting> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('pdf_settings')
      .upsert([setting], {
        onConflict: 'company_id,document_type'
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deletePdfSetting(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('pdf_settings')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
