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

// Reimbursement types (manual definition until database types are regenerated)
export type PettyCashReimbursement = {
  id: string;
  reimbursement_number: string;
  expense_id: string;
  wallet_id: string;
  company_id: string;
  amount: number;
  adjustment_amount: number | null;
  adjustment_reason: string | null;
  final_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  bank_account_id: string | null;
  payment_date: string | null;
  payment_reference: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  bank_feed_line_id: string | null;
  reconciled_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PettyCashReimbursementInsert = Omit<PettyCashReimbursement,
  'id' | 'created_at' | 'updated_at' | 'approved_at' | 'rejected_at' | 'reconciled_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  approved_at?: string;
  rejected_at?: string;
  reconciled_at?: string;
};

export type WalletWithDetails = PettyCashWallet & {
  expenses: PettyCashExpense[];
  topups: PettyCashTopup[];
};

// Extended type for wallet creation with email for auto-linking
type WalletCreateWithEmail = PettyCashWalletInsert & {
  user_email?: string;
};

/**
 * Look up a user by email in user_profiles table
 */
async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Look up a user's email by their ID in user_profiles table
 */
async function findUserEmailById(userId: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data.email;
}

/**
 * Grant petty cash permissions to a user by assigning them the petty-cash role
 * if they don't already have an accounting role
 */
async function grantPettyCashPermissions(userId: string): Promise<void> {
  const supabase = createClient();

  // Check if user already has an accounting role
  const { data: existingRole } = await supabase
    .from('user_module_roles')
    .select('id, role')
    .eq('user_id', userId)
    .eq('module', 'accounting')
    .single();

  if (!existingRole) {
    // User has no accounting role - give them petty-cash role
    const { error } = await supabase
      .from('user_module_roles')
      .insert({
        user_id: userId,
        module: 'accounting',
        role: 'petty-cash'
      });

    if (error) {
      console.error('Failed to grant petty cash role:', error);
    }
  }
  // If user already has a role (manager, accountant, etc.), they already have
  // appropriate permissions through their role - no action needed
}

/**
 * Calculate the correct wallet balance from transactions
 * Balance = Initial balance + Top-ups - Expenses
 * Note: The `balance` field in the wallets table is the initial/starting balance,
 * not the current balance. The current balance must be calculated from transactions.
 */
async function calculateWalletBalance(
  walletId: string,
  initialBalance: number
): Promise<number> {
  const supabase = createClient();

  // Get sum of completed topups
  const { data: topups } = await supabase
    .from('petty_cash_topups')
    .select('amount')
    .eq('wallet_id', walletId)
    .eq('status', 'completed');

  const topupTotal = (topups ?? []).reduce((sum, t) => sum + (t.amount || 0), 0);

  // Get sum of expenses (all expenses reduce balance)
  const { data: expenses } = await supabase
    .from('petty_cash_expenses')
    .select('amount')
    .eq('wallet_id', walletId);

  const expenseTotal = (expenses ?? []).reduce((sum, e) => sum + (e.amount || 0), 0);

  // Current balance = Initial + Topups - Expenses
  return initialBalance + topupTotal - expenseTotal;
}

export const pettyCashApi = {
  // User lookup operations
  /**
   * Get a user's email by their ID (for displaying in edit forms)
   */
  async getUserEmailById(userId: string): Promise<string | null> {
    return findUserEmailById(userId);
  },

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

  /**
   * Create a wallet with automatic user linking based on email.
   * If user_email is provided and matches an existing user:
   * 1. Sets user_id on the wallet
   * 2. Grants petty cash permissions to the user (if they don't have an accounting role)
   */
  async createWalletWithAutoLink(wallet: WalletCreateWithEmail): Promise<PettyCashWallet> {
    const supabase = createClient();

    // Extract user_email and prepare wallet data
    const { user_email, ...walletData } = wallet;
    let userId = walletData.user_id;

    // Auto-match email to user_id if email provided
    if (!userId && user_email) {
      const user = await findUserByEmail(user_email);
      if (user) {
        userId = user.id;
      }
    }

    // Create the wallet with user_id (if found)
    const { data, error } = await supabase
      .from('petty_cash_wallets')
      .insert([{
        ...walletData,
        user_id: userId,
      }])
      .select()
      .single();

    if (error) throw error;

    // Auto-grant petty cash permissions if user was found
    if (userId) {
      await grantPettyCashPermissions(userId);
    }

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

  /**
   * Update a wallet with automatic user linking based on email.
   * If user_email is provided and matches an existing user:
   * 1. Sets user_id on the wallet
   * 2. Grants petty cash permissions to the user (if they don't have an accounting role)
   */
  async updateWalletWithAutoLink(
    id: string,
    updates: PettyCashWalletUpdate & { user_email?: string }
  ): Promise<PettyCashWallet> {
    const supabase = createClient();

    // Extract user_email and prepare update data
    const { user_email, ...updateData } = updates;
    let userId = updateData.user_id;

    // Auto-match email to user_id if email provided and user_id not already set
    if (user_email && !userId) {
      const user = await findUserByEmail(user_email);
      if (user) {
        userId = user.id;
      }
    }

    // Update the wallet with user_id (if found)
    const { data, error } = await supabase
      .from('petty_cash_wallets')
      .update({
        ...updateData,
        user_id: userId,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Auto-grant petty cash permissions if user was found
    if (userId) {
      await grantPettyCashPermissions(userId);
    }

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

  /**
   * Get all wallets with calculated current balances
   * The `balance` field in the database is the initial balance.
   * This method calculates the current balance from transactions.
   */
  async getAllWalletsWithCalculatedBalances(): Promise<(PettyCashWallet & { calculated_balance: number })[]> {
    const supabase = createClient();

    // Get all wallets
    const { data: wallets, error: walletsError } = await supabase
      .from('petty_cash_wallets')
      .select('*')
      .order('wallet_name');

    if (walletsError) throw walletsError;
    if (!wallets || wallets.length === 0) return [];

    // Get all topups and expenses in one query each for efficiency
    const walletIds = wallets.map(w => w.id);

    const { data: allTopups } = await supabase
      .from('petty_cash_topups')
      .select('wallet_id, amount')
      .in('wallet_id', walletIds)
      .eq('status', 'completed');

    const { data: allExpenses } = await supabase
      .from('petty_cash_expenses')
      .select('wallet_id, amount')
      .in('wallet_id', walletIds);

    // Group topups and expenses by wallet
    const topupsByWallet = new Map<string, number>();
    const expensesByWallet = new Map<string, number>();

    for (const topup of allTopups ?? []) {
      const current = topupsByWallet.get(topup.wallet_id) || 0;
      topupsByWallet.set(topup.wallet_id, current + (topup.amount || 0));
    }

    for (const expense of allExpenses ?? []) {
      const current = expensesByWallet.get(expense.wallet_id) || 0;
      expensesByWallet.set(expense.wallet_id, current + (expense.amount || 0));
    }

    // Calculate current balance for each wallet
    return wallets.map(wallet => ({
      ...wallet,
      calculated_balance: (wallet.balance || 0) + (topupsByWallet.get(wallet.id) || 0) - (expensesByWallet.get(wallet.id) || 0),
    }));
  },

  /**
   * Get a single wallet with calculated current balance
   */
  async getWalletWithCalculatedBalance(walletId: string): Promise<(PettyCashWallet & { calculated_balance: number }) | null> {
    const supabase = createClient();

    const { data: wallet, error } = await supabase
      .from('petty_cash_wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const calculatedBalance = await calculateWalletBalance(walletId, wallet.balance || 0);

    return {
      ...wallet,
      calculated_balance: calculatedBalance,
    };
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

  /**
   * Generate a unique expense number in format PC-EXP-YYMMXXXX
   */
  async generateExpenseNumber(): Promise<string> {
    const supabase = createClient();
    const now = new Date();
    const yymm = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const prefix = `PC-EXP-${yymm}`;

    // Get the count of expenses this month to generate sequence
    const { count, error } = await supabase
      .from('petty_cash_expenses')
      .select('*', { count: 'exact', head: true })
      .like('expense_number', `${prefix}%`);

    if (error) throw error;

    const sequence = ((count || 0) + 1).toString().padStart(4, '0');
    return `${prefix}${sequence}`;
  },

  /**
   * Create an expense with auto-generated expense number
   */
  async createExpenseWithNumber(expense: Omit<PettyCashExpenseInsert, 'expense_number'>): Promise<PettyCashExpense> {
    const expenseNumber = await this.generateExpenseNumber();
    return this.createExpense({
      ...expense,
      expense_number: expenseNumber,
    });
  },

  /**
   * Update an existing expense
   */
  async updateExpense(id: string, updates: Partial<PettyCashExpenseInsert>): Promise<PettyCashExpense> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_expenses')
      .update(updates)
      .eq('id', id)
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
  },

  // ============================================================================
  // Reimbursement operations
  // Note: petty_cash_reimbursements table is defined in migration 032
  // Using type assertions since database.types.ts may not be updated yet
  // ============================================================================
  async getAllReimbursements(): Promise<PettyCashReimbursement[]> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as PettyCashReimbursement[];
  },

  async getReimbursementById(id: string): Promise<PettyCashReimbursement | null> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as PettyCashReimbursement;
  },

  async getReimbursementByExpenseId(expenseId: string): Promise<PettyCashReimbursement | null> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .select('*')
      .eq('expense_id', expenseId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as PettyCashReimbursement;
  },

  async getReimbursementsByStatus(status: 'pending' | 'approved' | 'paid' | 'rejected'): Promise<PettyCashReimbursement[]> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as PettyCashReimbursement[];
  },

  async getReimbursementsByWallet(walletId: string): Promise<PettyCashReimbursement[]> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as PettyCashReimbursement[];
  },

  /**
   * Generate a unique reimbursement number in format PC-RMB-YYMMXXXX
   */
  async generateReimbursementNumber(): Promise<string> {
    const supabase = createClient();
    const now = new Date();
    const yymm = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const prefix = `PC-RMB-${yymm}`;

    // Get the count of reimbursements this month to generate sequence
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .select('*', { count: 'exact', head: true })
      .like('reimbursement_number', `${prefix}%`);

    if (error) throw error;

    const sequence = ((count || 0) + 1).toString().padStart(4, '0');
    return `${prefix}${sequence}`;
  },

  async createReimbursement(reimbursement: PettyCashReimbursementInsert): Promise<PettyCashReimbursement> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .insert([reimbursement])
      .select()
      .single();
    if (error) throw error;
    return data as PettyCashReimbursement;
  },

  /**
   * Create a reimbursement with auto-generated reimbursement number
   */
  async createReimbursementWithNumber(
    reimbursement: Omit<PettyCashReimbursementInsert, 'reimbursement_number'>
  ): Promise<PettyCashReimbursement> {
    const reimbursementNumber = await this.generateReimbursementNumber();
    return this.createReimbursement({
      ...reimbursement,
      reimbursement_number: reimbursementNumber,
    });
  },

  async updateReimbursement(id: string, updates: Partial<PettyCashReimbursementInsert>): Promise<PettyCashReimbursement> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as PettyCashReimbursement;
  },

  /**
   * Approve a reimbursement with bank account assignment
   */
  async approveReimbursement(
    id: string,
    bankAccountId: string,
    approvedBy: string,
    adjustmentAmount?: number,
    adjustmentReason?: string
  ): Promise<PettyCashReimbursement> {
    const supabase = createClient();

    // First get the current reimbursement to calculate final amount
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: current, error: fetchError } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .select('amount')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const finalAmount = (current?.amount || 0) + (adjustmentAmount || 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .update({
        status: 'approved',
        bank_account_id: bankAccountId,
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        adjustment_amount: adjustmentAmount || 0,
        adjustment_reason: adjustmentReason || null,
        final_amount: finalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PettyCashReimbursement;
  },

  /**
   * Mark reimbursement as paid (after bank transfer)
   */
  async markReimbursementPaid(
    id: string,
    paymentDate: string,
    paymentReference?: string
  ): Promise<PettyCashReimbursement> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .update({
        status: 'paid',
        payment_date: paymentDate,
        payment_reference: paymentReference || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as PettyCashReimbursement;
  },

  /**
   * Reject a reimbursement
   */
  async rejectReimbursement(
    id: string,
    rejectedBy: string,
    rejectionReason: string
  ): Promise<PettyCashReimbursement> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .update({
        status: 'rejected',
        rejected_by: rejectedBy,
        rejected_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as PettyCashReimbursement;
  },

  async deleteReimbursement(id: string): Promise<void> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Get pending reimbursements for bank reconciliation
   * Returns approved but not yet paid reimbursements with bank account info
   */
  async getPendingReimbursementsForReconciliation(bankAccountId?: string): Promise<PettyCashReimbursement[]> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('petty_cash_reimbursements')
      .select('*')
      .eq('status', 'approved');

    if (bankAccountId) {
      query = query.eq('bank_account_id', bankAccountId);
    }

    const { data, error } = await query.order('approved_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as PettyCashReimbursement[];
  },

  // ============================================================================
  // Create expense in main expenses table (for P&L reporting)
  // ============================================================================
  /**
   * Create a main expense record linked to a petty cash expense
   * This should be called when an accountant completes the accounting for a petty cash expense
   */
  async createLinkedExpense(
    pettyCashExpenseId: string,
    expenseData: {
      companyId: string;
      vendorId: string;
      vendorName: string;
      expenseDate: string;
      amount: number;
      projectId: string;
      description?: string;
      accountCode?: string;
      createdBy?: string;
    }
  ): Promise<{ expenseId: string }> {
    const supabase = createClient();

    // Generate expense number
    const now = new Date();
    const yymm = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const prefix = `EXP-${yymm}`;

    const { count } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .like('expense_number', `${prefix}%`);

    const expenseNumber = `${prefix}${((count || 0) + 1).toString().padStart(4, '0')}`;

    // Create the expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert([{
        company_id: expenseData.companyId,
        expense_number: expenseNumber,
        vendor_id: expenseData.vendorId,
        vendor_name: expenseData.vendorName,
        expense_date: expenseData.expenseDate,
        subtotal: expenseData.amount,
        total_amount: expenseData.amount,
        net_payable: expenseData.amount,
        status: 'approved',
        payment_status: 'paid', // Petty cash expenses are already paid
        currency: 'THB',
        petty_cash_expense_id: pettyCashExpenseId,
        created_by: expenseData.createdBy,
        notes: expenseData.description || 'Petty cash expense',
      }])
      .select('id')
      .single();

    if (expenseError) throw expenseError;

    // Create the line item
    const { error: lineError } = await supabase
      .from('expense_line_items')
      .insert([{
        expense_id: expense.id,
        project_id: expenseData.projectId,
        description: expenseData.description || 'Petty cash expense',
        amount: expenseData.amount,
        account_code: expenseData.accountCode,
        quantity: 1,
        unit_price: expenseData.amount,
        line_order: 1,
      }]);

    if (lineError) throw lineError;

    return { expenseId: expense.id };
  }
};
