import { createClient } from '../client';
import type { Database } from '../database.types';

type PettyCashWallet = Database['public']['Tables']['petty_cash_wallets']['Row'];
type PettyCashWalletInsert = Database['public']['Tables']['petty_cash_wallets']['Insert'];
type PettyCashWalletUpdate = Database['public']['Tables']['petty_cash_wallets']['Update'];
type PettyCashExpense = Database['public']['Tables']['petty_cash_expenses']['Row'];
type PettyCashExpenseInsert = Database['public']['Tables']['petty_cash_expenses']['Insert'];
type PettyCashTopup = Database['public']['Tables']['petty_cash_topups']['Row'];
type PettyCashTopupInsert = Database['public']['Tables']['petty_cash_topups']['Insert'];
type PettyCashTopupUpdate = Database['public']['Tables']['petty_cash_topups']['Update'];

export type WalletWithDetails = PettyCashWallet & {
  expenses: PettyCashExpense[];
  topups: PettyCashTopup[];
};

export const pettyCashApi = {
  // Wallet operations
  async getAllWallets(): Promise<PettyCashWallet[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_wallets')
      .select('*')
      .order('wallet_name');
    if (error) throw error;
    return data ?? [];
  },

  async getWalletById(id: string): Promise<PettyCashWallet | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_wallets')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getWalletWithDetails(id: string): Promise<WalletWithDetails | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_wallets')
      .select(`
        *,
        expenses:petty_cash_expenses(*),
        topups:petty_cash_topups(*)
      `)
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as WalletWithDetails;
  },

  async createWallet(wallet: PettyCashWalletInsert): Promise<PettyCashWallet> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_wallets')
      .insert([wallet])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateWallet(id: string, updates: PettyCashWalletUpdate): Promise<PettyCashWallet> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_wallets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteWallet(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('petty_cash_wallets')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getWalletsByCompany(companyId: string): Promise<PettyCashWallet[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_wallets')
      .select('*')
      .eq('company_id', companyId)
      .order('wallet_name');
    if (error) throw error;
    return data ?? [];
  },

  async getWalletsByUser(userId: string): Promise<PettyCashWallet[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_wallets')
      .select('*')
      .eq('user_id', userId)
      .order('wallet_name');
    if (error) throw error;
    return data ?? [];
  },

  async getActiveWallets(): Promise<PettyCashWallet[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_wallets')
      .select('*')
      .eq('status', 'active')
      .order('wallet_name');
    if (error) throw error;
    return data ?? [];
  },

  // Expense operations
  async getAllExpenses(): Promise<PettyCashExpense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_expenses')
      .select('*')
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getExpenseById(id: string): Promise<PettyCashExpense | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_expenses')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async createExpense(expense: PettyCashExpenseInsert): Promise<PettyCashExpense> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_expenses')
      .insert([expense])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteExpense(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('petty_cash_expenses')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getExpensesByWallet(walletId: string): Promise<PettyCashExpense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_expenses')
      .select('*')
      .eq('wallet_id', walletId)
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getExpensesByDateRange(startDate: string, endDate: string): Promise<PettyCashExpense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_expenses')
      .select('*')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Topup operations
  async getAllTopups(): Promise<PettyCashTopup[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_topups')
      .select('*')
      .order('topup_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getTopupById(id: string): Promise<PettyCashTopup | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_topups')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async createTopup(topup: PettyCashTopupInsert): Promise<PettyCashTopup> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_topups')
      .insert([topup])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateTopup(id: string, updates: PettyCashTopupUpdate): Promise<PettyCashTopup> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_topups')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTopup(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('petty_cash_topups')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getTopupsByWallet(walletId: string): Promise<PettyCashTopup[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_topups')
      .select('*')
      .eq('wallet_id', walletId)
      .order('topup_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getTopupsByStatus(status: 'pending' | 'approved' | 'completed'): Promise<PettyCashTopup[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_topups')
      .select('*')
      .eq('status', status)
      .order('topup_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }
};
