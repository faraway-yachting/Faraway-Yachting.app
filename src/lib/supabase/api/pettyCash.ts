import { createClient } from '../client';
import type { Database } from '../database.types';
import { createAndProcessEvent } from '@/lib/accounting/eventProcessor';
import type {
  PettyCashExpenseEventData,
  PettyCashTopupEventData,
  PettyCashReimbursementEventData,
  ExpenseApprovedEventData,
} from '@/lib/accounting/eventTypes';

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
  company_id: string | null; // Nullable - accountant assigns company during approval
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

// Batch type for grouping reimbursements into single bank transfers
export type PettyCashBatch = {
  id: string;
  batch_number: string;
  company_id: string;
  wallet_holder_id: string | null;
  wallet_holder_name: string;
  bank_account_id: string;
  total_amount: number;
  reimbursement_count: number;
  status: 'pending_payment' | 'paid';
  payment_date: string | null;
  payment_reference: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
 * Balance = Initial balance + Top-ups + Paid Reimbursements - Expenses
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

  // Get sum of submitted expenses only (drafts don't reduce balance)
  const { data: expenses } = await supabase
    .from('petty_cash_expenses')
    .select('amount')
    .eq('wallet_id', walletId)
    .eq('status', 'submitted');

  const expenseTotal = (expenses ?? []).reduce((sum, e) => sum + (e.amount || 0), 0);

  // Get sum of paid reimbursements (money returned to wallet)
  const { data: reimbursements } = await (supabase as any)
    .from('petty_cash_reimbursements')
    .select('final_amount')
    .eq('wallet_id', walletId)
    .eq('status', 'paid');

  const reimbursementTotal = ((reimbursements ?? []) as any[]).reduce((sum: number, r: any) => sum + (r.final_amount || 0), 0);

  // Current balance = Initial + Topups + Paid Reimbursements - Expenses
  return initialBalance + topupTotal + reimbursementTotal - expenseTotal;
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

    // Single RPC call replaces 4 separate queries (wallets + topups + expenses + reimbursements)
    // The SQL function handles balance aggregation and RLS filtering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('get_wallets_with_balances');

    if (error) throw error;

    return ((data ?? []) as Array<PettyCashWallet & { calculated_balance: number }>).map(row => ({
      ...row,
      calculated_balance: Number(row.calculated_balance) || 0,
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

  async getExpensesByStatus(status: 'draft' | 'submitted' | 'rejected'): Promise<PettyCashExpense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_expenses')
      .select('*')
      .eq('status', status)
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
   * Also triggers an accounting event for automatic journal generation
   * Includes duplicate detection to prevent multiple submissions
   */
  async createExpenseWithNumber(expense: Omit<PettyCashExpenseInsert, 'expense_number'>): Promise<PettyCashExpense> {
    const supabase = createClient();

    // Check for duplicate: same wallet_id + amount + date within 5 seconds
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data: recentDuplicates } = await supabase
      .from('petty_cash_expenses')
      .select('id')
      .eq('wallet_id', expense.wallet_id)
      .eq('amount', expense.amount ?? 0)
      .eq('expense_date', expense.expense_date)
      .gte('created_at', fiveSecondsAgo)
      .limit(1);

    if (recentDuplicates && recentDuplicates.length > 0) {
      throw new Error('DUPLICATE_EXPENSE: An identical expense was recently submitted. Please wait before submitting again.');
    }

    const expenseNumber = await this.generateExpenseNumber();
    const createdExpense = await this.createExpense({
      ...expense,
      expense_number: expenseNumber,
    });

    // Fetch wallet info for event data
    try {
      const wallet = await this.getWalletById(expense.wallet_id);
      if (wallet && wallet.company_id) {
        const eventData: PettyCashExpenseEventData = {
          expenseId: createdExpense.id,
          expenseNumber: createdExpense.expense_number || expenseNumber,
          walletId: expense.wallet_id,
          walletName: wallet.wallet_name || 'Petty Cash Wallet',
          companyId: wallet.company_id,
          projectId: createdExpense.project_id || undefined,
          expenseDate: createdExpense.expense_date,
          description: createdExpense.description || 'Petty cash expense',
          amount: createdExpense.amount || 0,
          category: undefined,
          currency: wallet.currency || 'THB',
        };

        // Create and process the accounting event (don't await to avoid blocking)
        createAndProcessEvent(
          'PETTYCASH_EXPENSE_CREATED',
          createdExpense.expense_date,
          [wallet.company_id],
          eventData as unknown as Record<string, unknown>,
          'petty_cash_expense',
          createdExpense.id,
          createdExpense.created_by || undefined
        ).catch(err => {
          console.error('Failed to create petty cash expense event:', err);
        });
      }
    } catch (err) {
      // Don't fail the expense creation if event creation fails
      console.error('Error creating petty cash expense event:', err);
    }

    return createdExpense;
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

  /**
   * Resubmit a rejected expense - updates the SAME expense and SAME reimbursement records.
   * This ensures 1 expense + 1 reimbursement throughout the entire claim lifecycle.
   * When resubmitting, the rejected reimbursement is reset to 'pending' status.
   */
  async resubmitExpense(
    expenseId: string,
    updates: {
      amount?: number;
      description?: string;
      projectId?: string;
      projectName?: string;
      expenseDate?: string;
    }
  ): Promise<{ expense: PettyCashExpense; reimbursement: PettyCashReimbursement }> {
    const supabase = createClient();

    // 1. Get the expense
    const expense = await this.getExpenseById(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // 2. Find the rejected reimbursement linked to this expense
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rejectedReimbursements } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .select('*')
      .eq('expense_id', expenseId)
      .eq('status', 'rejected')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!rejectedReimbursements || rejectedReimbursements.length === 0) {
      // Also check if expense status is 'rejected' (edge case)
      if (expense.status !== 'rejected') {
        throw new Error('Can only resubmit rejected expenses');
      }
    }

    const existingReimbursement = rejectedReimbursements?.[0];

    // 3. Update the expense with changes, set status back to 'submitted'
    const { data: updatedExpense, error: updateError } = await supabase
      .from('petty_cash_expenses')
      .update({
        amount: updates.amount ?? expense.amount,
        description: updates.description ?? expense.description,
        project_id: updates.projectId ?? expense.project_id,
        expense_date: updates.expenseDate ?? expense.expense_date,
        status: 'submitted',
      })
      .eq('id', expenseId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 4. UPDATE the existing reimbursement - reset to 'pending', clear rejection fields
    const newAmount = updates.amount ?? expense.amount;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedReimbursement, error: reimbursementError } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .update({
        amount: newAmount,
        final_amount: newAmount,
        status: 'pending',
        // Clear rejection fields
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        // Clear approval fields (in case it was approved before)
        approved_by: null,
        approved_at: null,
        // Reset company_id since accountant will reassign
        company_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingReimbursement.id)
      .select()
      .single();

    if (reimbursementError) throw reimbursementError;

    return {
      expense: updatedExpense,
      reimbursement: updatedReimbursement as PettyCashReimbursement,
    };
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

  /**
   * Update a top-up
   * Triggers an accounting event when status changes to 'completed'
   */
  async updateTopup(id: string, updates: PettyCashTopupUpdate): Promise<PettyCashTopup> {
    const supabase = createClient();

    // If updating to 'completed' status, we need the original topup data first
    let originalTopup: PettyCashTopup | null = null;
    if (updates.status === 'completed') {
      const { data: orig } = await supabase
        .from('petty_cash_topups')
        .select('*')
        .eq('id', id)
        .single();
      originalTopup = orig;
    }

    const { data, error } = await supabase
      .from('petty_cash_topups')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    // Trigger event when status changes to 'completed'
    if (updates.status === 'completed' && originalTopup && originalTopup.status !== 'completed') {
      try {
        const wallet = await this.getWalletById(data.wallet_id);
        if (wallet && wallet.company_id) {
          const eventData: PettyCashTopupEventData = {
            topupId: data.id,
            walletId: data.wallet_id,
            walletName: wallet.wallet_name || 'Petty Cash Wallet',
            companyId: wallet.company_id,
            topupDate: data.topup_date,
            amount: data.amount,
            bankAccountId: data.bank_account_id || undefined,
            // Note: bank account GL code would need to be fetched from bank_accounts table
            // For now, use default
            bankAccountCode: undefined,
            bankAccountName: undefined,
            reference: undefined,
            currency: wallet.currency || 'THB',
          };

          // Create and process the accounting event
          createAndProcessEvent(
            'PETTYCASH_TOPUP_COMPLETED',
            data.topup_date,
            [wallet.company_id],
            eventData as unknown as Record<string, unknown>,
            'petty_cash_topup',
            data.id,
            undefined
          ).catch(err => {
            console.error('Failed to create petty cash topup event:', err);
          });
        }
      } catch (err) {
        console.error('Error creating petty cash topup event:', err);
      }
    }

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

  async createTopUp(input: {
    wallet_id: string;
    amount: number;
    company_id: string | null;
    bank_account_id: string;
    top_up_date: string;
    reference?: string;
    notes?: string;
    status?: 'pending' | 'approved' | 'completed';
    created_by: string | null;
  }): Promise<PettyCashTopup> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('petty_cash_topups')
      .insert([{
        wallet_id: input.wallet_id,
        amount: input.amount,
        company_id: input.company_id,
        bank_account_id: input.bank_account_id,
        topup_date: input.top_up_date,
        reference: input.reference || null,
        notes: input.notes || null,
        status: input.status || 'completed',
        created_by: input.created_by,
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
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

  /**
   * Get pending reimbursements with wallet holder name and company name
   */
  async getPendingReimbursementsWithDetails(): Promise<(PettyCashReimbursement & { wallet_holder_name: string; company_name: string })[]> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .select(`
        *,
        wallet:petty_cash_wallets(user_name, company_id),
        company:companies(name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((item: { wallet: { user_name: string; company_id: string } | null; company: { name: string } | null }) => {
      const walletData = item.wallet as { user_name: string; company_id: string } | null;
      const companyData = item.company as { name: string } | null;
      return {
        ...item,
        wallet_holder_name: walletData?.user_name || '',
        company_name: companyData?.name || '',
        wallet: undefined,
        company: undefined,
      };
    }) as (PettyCashReimbursement & { wallet_holder_name: string; company_name: string })[];
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
   * Get paid petty cash expenses with reimbursement info by date range
   * Used for P&L reports to include petty cash expenses that may not have linked expenses
   * Also fetches the account code from the linked expense in the main expenses table
   */
  async getPaidPettyCashExpensesByDateRange(
    startDate: string,
    endDate: string
  ): Promise<Array<{
    id: string;
    expenseNumber: string;
    expenseDate: string;
    amount: number;
    description: string | null;
    projectId: string | null;
    companyId: string;
    walletHolderName: string;
    accountingExpenseAccountCode: string | null;
    attachments: Array<{ id: string; name: string; url: string }>;
  }>> {
    const supabase = createClient();

    // Get paid reimbursements with their expense details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .select(`
        *,
        expense:petty_cash_expenses!expense_id(*),
        wallet:petty_cash_wallets!wallet_id(user_name)
      `)
      .eq('status', 'paid')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
      .order('payment_date', { ascending: false });

    if (error) throw error;

    // Get all petty cash expense IDs to fetch linked expenses
    const pettyCashExpenseIds = (data || [])
      .map((r: { expense_id: string }) => r.expense_id)
      .filter(Boolean);

    // Fetch linked expenses from main expenses table to get account codes
    // The linked expense has petty_cash_expense_id pointing to the PC expense
    // Note: petty_cash_expense_id column was added in migration 032
    const linkedExpenseMap = new Map<string, string>();
    if (pettyCashExpenseIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: linkedExpenses } = await (supabase as any)
        .from('expenses')
        .select(`
          petty_cash_expense_id,
          line_items:expense_line_items(account_code)
        `)
        .in('petty_cash_expense_id', pettyCashExpenseIds);

      if (linkedExpenses) {
        for (const le of linkedExpenses as Array<{
          petty_cash_expense_id: string;
          line_items?: Array<{ account_code?: string | null }>;
        }>) {
          const pcExpenseId = le.petty_cash_expense_id;
          const accountCode = le.line_items?.[0]?.account_code;
          if (pcExpenseId && accountCode) {
            linkedExpenseMap.set(pcExpenseId, accountCode);
          }
        }
      }
    }

    // Map to result format, using expense_account_code from petty_cash_expenses,
    // with fallback to linked expense account code for backwards compatibility
    // Also deduplicate by expense ID (in case multiple reimbursements reference the same expense)
    const seenExpenseIds = new Set<string>();
    const results: Array<{
      id: string;
      expenseNumber: string;
      expenseDate: string;
      amount: number;
      description: string | null;
      projectId: string | null;
      companyId: string;
      walletHolderName: string;
      accountingExpenseAccountCode: string | null;
      attachments: Array<{ id: string; name: string; url: string }>;
    }> = [];

    for (const r of (data || []) as Array<{
      expense_id: string;
      company_id: string;
      expense: {
        id: string;
        expense_number: string;
        expense_date: string;
        amount: number | null;
        description: string | null;
        project_id: string | null;
        expense_account_code: string | null;
        attachments: unknown;
      } | null;
      wallet: { user_name: string } | null;
    }>) {
      const pcExpenseId = r.expense?.id || r.expense_id;

      // Skip if we've already processed this expense
      if (seenExpenseIds.has(pcExpenseId)) continue;
      seenExpenseIds.add(pcExpenseId);

      // First try expense_account_code from petty_cash_expenses (new column)
      // Fall back to linked expense account code for backwards compatibility
      const accountCode = r.expense?.expense_account_code || linkedExpenseMap.get(pcExpenseId) || null;

      // Parse attachments from JSONB
      let attachments: Array<{ id: string; name: string; url: string }> = [];
      if (r.expense?.attachments) {
        try {
          const parsed = Array.isArray(r.expense.attachments)
            ? r.expense.attachments
            : JSON.parse(r.expense.attachments as string);
          attachments = parsed.filter((a: { url?: string }) => a?.url);
        } catch {
          // Ignore parse errors
        }
      }

      results.push({
        id: pcExpenseId,
        expenseNumber: r.expense?.expense_number || 'Unknown',
        expenseDate: r.expense?.expense_date || '',
        amount: r.expense?.amount || 0,
        description: r.expense?.description || null,
        projectId: r.expense?.project_id || null,
        companyId: r.company_id,
        walletHolderName: r.wallet?.user_name || 'Unknown',
        accountingExpenseAccountCode: accountCode,
        attachments,
      });
    }

    return results;
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
   * Includes duplicate detection - won't create if reimbursement already exists for this expense
   */
  async createReimbursementWithNumber(
    reimbursement: Omit<PettyCashReimbursementInsert, 'reimbursement_number'>
  ): Promise<PettyCashReimbursement> {
    const supabase = createClient();

    // Check if a reimbursement already exists for this expense_id
    if (reimbursement.expense_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from('petty_cash_reimbursements')
        .select('id, reimbursement_number')
        .eq('expense_id', reimbursement.expense_id)
        .limit(1);

      if (existing && existing.length > 0) {
        // Return existing reimbursement instead of creating duplicate
        console.log(`Reimbursement already exists for expense ${reimbursement.expense_id}: ${existing[0].reimbursement_number}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: fullReimbursement } = await (supabase as any)
          .from('petty_cash_reimbursements')
          .select('*')
          .eq('id', existing[0].id)
          .single();
        return fullReimbursement as PettyCashReimbursement;
      }
    }

    const reimbursementNumber = await this.generateReimbursementNumber();
    return this.createReimbursement({
      ...reimbursement,
      reimbursement_number: reimbursementNumber,
    });
  },

  /**
   * Batch-create reimbursements for multiple expenses in a single INSERT.
   * Uses 3 queries total: 1 count (for sequential numbers) + 1 filter (existing) + 1 insert.
   */
  async batchCreateReimbursements(
    reimbursements: Omit<PettyCashReimbursementInsert, 'reimbursement_number'>[]
  ): Promise<PettyCashReimbursement[]> {
    if (reimbursements.length === 0) return [];

    const supabase = createClient();

    // 1. Single count query to generate sequential reimbursement numbers
    const now = new Date();
    const yymm = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const prefix = `PC-RMB-${yymm}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error: countError } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .select('*', { count: 'exact', head: true })
      .like('reimbursement_number', `${prefix}%`);

    if (countError) throw countError;

    const baseSeq = (count || 0) + 1;
    const withNumbers = reimbursements.map((r, i) => ({
      ...r,
      reimbursement_number: `${prefix}${(baseSeq + i).toString().padStart(4, '0')}`,
    }));

    // 2. Filter out expenses that already have a reimbursement
    const expenseIds = reimbursements.map(r => r.expense_id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .select('expense_id')
      .in('expense_id', expenseIds);

    const existingSet = new Set((existing ?? []).map((e: { expense_id: string }) => e.expense_id));
    const toInsert = withNumbers.filter(r => !existingSet.has(r.expense_id));

    if (toInsert.length === 0) return [];

    // 3. Single batch insert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .insert(toInsert)
      .select();

    if (error) throw error;
    return (data ?? []) as PettyCashReimbursement[];
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
    companyId?: string,
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
        company_id: companyId || null,
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
   * Triggers an accounting event for automatic journal generation
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

    const reimbursement = data as PettyCashReimbursement;

    // Trigger accounting event for paid reimbursement
    try {
      const wallet = await this.getWalletById(reimbursement.wallet_id);
      if (wallet && wallet.company_id) {
        const eventData: PettyCashReimbursementEventData = {
          reimbursementId: reimbursement.id,
          reimbursementNumber: reimbursement.reimbursement_number,
          walletId: reimbursement.wallet_id,
          walletName: wallet.wallet_name || 'Petty Cash Wallet',
          companyId: wallet.company_id,
          paymentDate: paymentDate,
          finalAmount: reimbursement.final_amount,
          bankAccountId: reimbursement.bank_account_id || undefined,
          // Note: bank account GL code would need to be fetched from bank_accounts table
          bankAccountCode: undefined,
          bankAccountName: undefined,
          paymentReference: paymentReference || undefined,
          currency: wallet.currency || 'THB',
        };

        // Create and process the accounting event
        createAndProcessEvent(
          'PETTYCASH_REIMBURSEMENT_PAID',
          paymentDate,
          [wallet.company_id],
          eventData as unknown as Record<string, unknown>,
          'petty_cash_reimbursement',
          reimbursement.id,
          reimbursement.approved_by || undefined
        ).catch(err => {
          console.error('Failed to create petty cash reimbursement event:', err);
        });
      }
    } catch (err) {
      console.error('Error creating petty cash reimbursement event:', err);
    }

    return reimbursement;
  },

  /**
   * Reject a reimbursement
   * Also updates the expense status to 'rejected' to prevent auto-creation of new reimbursements
   */
  async rejectReimbursement(
    id: string,
    rejectedBy: string,
    rejectionReason: string
  ): Promise<PettyCashReimbursement> {
    const supabase = createClient();

    // First get the expense_id to update its status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reimbursement } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .select('expense_id')
      .eq('id', id)
      .single();

    // Update reimbursement status
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

    // Also update the expense status to 'rejected' so it won't trigger auto-creation
    if (reimbursement?.expense_id) {
      await supabase
        .from('petty_cash_expenses')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reimbursement.expense_id);
    }

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

  // ============================================================================
  // Batch Reimbursement Operations
  // Groups multiple reimbursements into one bank transfer
  // ============================================================================

  /**
   * Get approved reimbursements grouped by company + wallet holder
   * Used to show the reimbursement summary for batch creation
   * Note: Only 'approved' reimbursements are shown (not 'pending' - those need approval first)
   */
  async getPendingGroupedByCompanyAndHolder(): Promise<{
    companyId: string;
    companyName: string;
    walletHolderName: string;
    walletHolderId: string | null;
    reimbursements: PettyCashReimbursement[];
    totalAmount: number;
  }[]> {
    const supabase = createClient();

    // Get all APPROVED reimbursements that are NOT already in a batch
    // Only approved claims should appear in the batch creation area
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reimbursements, error } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .select(`
        *,
        wallet:petty_cash_wallets(user_name, user_id),
        company:companies(name)
      `)
      .eq('status', 'approved')
      .is('batch_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group by company_id + wallet holder name
    const groups = new Map<string, {
      companyId: string;
      companyName: string;
      walletHolderName: string;
      walletHolderId: string | null;
      reimbursements: PettyCashReimbursement[];
      totalAmount: number;
    }>();

    for (const r of (reimbursements || []) as Array<{
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
      wallet: { user_name: string; user_id: string | null } | null;
      company: { name: string } | null;
    }>) {
      const walletHolderName = r.wallet?.user_name || 'Unknown';
      const walletHolderId = r.wallet?.user_id || null;
      const companyName = r.company?.name || 'Unknown';
      const key = `${r.company_id}-${walletHolderName}`;

      if (!groups.has(key)) {
        groups.set(key, {
          companyId: r.company_id,
          companyName,
          walletHolderName,
          walletHolderId,
          reimbursements: [],
          totalAmount: 0,
        });
      }

      const group = groups.get(key)!;
      group.reimbursements.push({
        id: r.id,
        reimbursement_number: r.reimbursement_number,
        expense_id: r.expense_id,
        wallet_id: r.wallet_id,
        company_id: r.company_id,
        amount: r.amount,
        adjustment_amount: r.adjustment_amount,
        adjustment_reason: r.adjustment_reason,
        final_amount: r.final_amount,
        status: r.status,
        bank_account_id: r.bank_account_id,
        payment_date: r.payment_date,
        payment_reference: r.payment_reference,
        approved_by: r.approved_by,
        approved_at: r.approved_at,
        rejected_by: r.rejected_by,
        rejected_at: r.rejected_at,
        rejection_reason: r.rejection_reason,
        bank_feed_line_id: r.bank_feed_line_id,
        reconciled_at: r.reconciled_at,
        created_by: r.created_by,
        created_at: r.created_at,
        updated_at: r.updated_at,
      });
      group.totalAmount += r.final_amount || r.amount || 0;
    }

    return Array.from(groups.values());
  },

  /**
   * Get approved reimbursements grouped by wallet and then by bank account
   * Used for the Transfer Summary - shows how much needs to be transferred to each wallet from each bank
   */
  async getApprovedReimbursementsGroupedForTransfer(): Promise<{
    walletId: string;
    walletName: string;
    holderName: string;
    bankAccountGroups: {
      bankAccountId: string;
      bankAccountName: string;
      companyId: string;
      companyName: string;
      amount: number;
      reimbursementIds: string[];
    }[];
    totalAmount: number;
  }[]> {
    const supabase = createClient();

    // Get all APPROVED reimbursements that have a bank_account_id set
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reimbursements, error } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .select(`
        *,
        wallet:petty_cash_wallets(id, wallet_name, user_name),
        company:companies(id, name),
        bank_account:bank_accounts(id, account_name, account_number, bank_information)
      `)
      .eq('status', 'approved')
      .not('bank_account_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group by wallet_id, then by bank_account_id
    const walletGroups = new Map<string, {
      walletId: string;
      walletName: string;
      holderName: string;
      bankAccountGroups: Map<string, {
        bankAccountId: string;
        bankAccountName: string;
        companyId: string;
        companyName: string;
        amount: number;
        reimbursementIds: string[];
      }>;
      totalAmount: number;
    }>();

    for (const r of (reimbursements || []) as Array<{
      id: string;
      wallet_id: string;
      company_id: string;
      bank_account_id: string;
      final_amount: number;
      amount: number;
      wallet: { id: string; wallet_name: string; user_name: string } | null;
      company: { id: string; name: string } | null;
      bank_account: { id: string; account_name: string; account_number: string; bank_information: unknown } | null;
    }>) {
      const walletId = r.wallet_id;
      const walletName = r.wallet?.wallet_name || 'Unknown Wallet';
      const holderName = r.wallet?.user_name || 'Unknown';
      const bankAccountId = r.bank_account_id;
      const bankInfo = r.bank_account?.bank_information as { bankName?: string } | null;
      const bankAccountName = r.bank_account
        ? `${bankInfo?.bankName || 'Bank'} (${r.bank_account.account_number})`
        : 'Unknown Bank';
      const companyId = r.company_id || '';
      const companyName = r.company?.name || 'Unknown';
      const amount = r.final_amount || r.amount || 0;

      // Get or create wallet group
      if (!walletGroups.has(walletId)) {
        walletGroups.set(walletId, {
          walletId,
          walletName,
          holderName,
          bankAccountGroups: new Map(),
          totalAmount: 0,
        });
      }

      const walletGroup = walletGroups.get(walletId)!;
      walletGroup.totalAmount += amount;

      // Get or create bank account group within wallet
      if (!walletGroup.bankAccountGroups.has(bankAccountId)) {
        walletGroup.bankAccountGroups.set(bankAccountId, {
          bankAccountId,
          bankAccountName,
          companyId,
          companyName,
          amount: 0,
          reimbursementIds: [],
        });
      }

      const bankGroup = walletGroup.bankAccountGroups.get(bankAccountId)!;
      bankGroup.amount += amount;
      bankGroup.reimbursementIds.push(r.id);
    }

    // Convert to array format
    return Array.from(walletGroups.values()).map(wg => ({
      walletId: wg.walletId,
      walletName: wg.walletName,
      holderName: wg.holderName,
      bankAccountGroups: Array.from(wg.bankAccountGroups.values()),
      totalAmount: wg.totalAmount,
    }));
  },

  /**
   * Generate a unique batch number in format PC-BATCH-YYMMXXXX
   */
  async generateBatchNumber(): Promise<string> {
    const supabase = createClient();
    const now = new Date();
    const yymm = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const prefix = `PC-BATCH-${yymm}`;

    // Get the count of batches this month to generate sequence
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase as any)
      .from('petty_cash_reimbursement_batches')
      .select('*', { count: 'exact', head: true })
      .like('batch_number', `${prefix}%`);

    if (error) throw error;

    const sequence = ((count || 0) + 1).toString().padStart(4, '0');
    return `${prefix}${sequence}`;
  },

  /**
   * Create a batch from pending reimbursements
   */
  async createBatch(input: {
    reimbursementIds: string[];
    companyId: string;
    walletHolderName: string;
    walletHolderId?: string | null;
    bankAccountId: string;
    createdBy: string;
  }): Promise<PettyCashBatch> {
    const supabase = createClient();

    // Calculate total amount from reimbursements
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reimbursements, error: fetchError } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .select('final_amount, amount')
      .in('id', input.reimbursementIds);

    if (fetchError) throw fetchError;

    const totalAmount = (reimbursements || []).reduce(
      (sum: number, r: { final_amount?: number; amount?: number }) => sum + (r.final_amount || r.amount || 0),
      0
    );

    // Generate batch number
    const batchNumber = await this.generateBatchNumber();

    // Create the batch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: batch, error: createError } = await (supabase as any)
      .from('petty_cash_reimbursement_batches')
      .insert([{
        batch_number: batchNumber,
        company_id: input.companyId,
        wallet_holder_id: input.walletHolderId || null,
        wallet_holder_name: input.walletHolderName,
        bank_account_id: input.bankAccountId,
        total_amount: totalAmount,
        reimbursement_count: input.reimbursementIds.length,
        status: 'pending_payment',
        created_by: input.createdBy,
      }])
      .select()
      .single();

    if (createError) throw createError;

    // Update reimbursements to link them to the batch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .update({
        batch_id: batch.id,
        updated_at: new Date().toISOString(),
      })
      .in('id', input.reimbursementIds);

    if (updateError) throw updateError;

    return batch as PettyCashBatch;
  },

  /**
   * Get all batches
   */
  async getAllBatches(): Promise<PettyCashBatch[]> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('petty_cash_reimbursement_batches')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as PettyCashBatch[];
  },

  /**
   * Get batches by status
   */
  async getBatchesByStatus(status: 'pending_payment' | 'paid'): Promise<PettyCashBatch[]> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('petty_cash_reimbursement_batches')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as PettyCashBatch[];
  },

  /**
   * Get a batch by ID with its reimbursements
   */
  async getBatchById(id: string): Promise<(PettyCashBatch & { reimbursements: PettyCashReimbursement[] }) | null> {
    const supabase = createClient();

    // Get the batch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: batch, error: batchError } = await (supabase as any)
      .from('petty_cash_reimbursement_batches')
      .select('*')
      .eq('id', id)
      .single();

    if (batchError) {
      if (batchError.code === 'PGRST116') return null;
      throw batchError;
    }

    // Get the reimbursements in this batch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reimbursements, error: reimbError } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .select('*')
      .eq('batch_id', id)
      .order('created_at', { ascending: false });

    if (reimbError) throw reimbError;

    return {
      ...batch,
      reimbursements: (reimbursements ?? []) as PettyCashReimbursement[],
    } as PettyCashBatch & { reimbursements: PettyCashReimbursement[] };
  },

  /**
   * Mark a batch as paid (after bank transfer is completed)
   * Also marks all linked reimbursements as paid
   */
  async markBatchPaid(
    batchId: string,
    paymentDate: string,
    paymentReference?: string
  ): Promise<PettyCashBatch> {
    const supabase = createClient();

    // Update the batch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: batch, error: batchError } = await (supabase as any)
      .from('petty_cash_reimbursement_batches')
      .update({
        status: 'paid',
        payment_date: paymentDate,
        payment_reference: paymentReference || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchId)
      .select()
      .single();

    if (batchError) throw batchError;

    // Get all reimbursements in this batch to mark them as paid
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reimbursements } = await (supabase as any)
      .from('petty_cash_reimbursements')
      .select('id, wallet_id, final_amount')
      .eq('batch_id', batchId);

    // Mark all reimbursements as paid
    if (reimbursements && reimbursements.length > 0) {
      const reimbursementIds = reimbursements.map((r: { id: string }) => r.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('petty_cash_reimbursements')
        .update({
          status: 'paid',
          payment_date: paymentDate,
          payment_reference: paymentReference || null,
          updated_at: new Date().toISOString(),
        })
        .in('id', reimbursementIds);

      // Trigger accounting events for each reimbursement
      for (const r of reimbursements as Array<{ id: string; wallet_id: string; final_amount: number }>) {
        try {
          const wallet = await this.getWalletById(r.wallet_id);
          if (wallet && wallet.company_id) {
            const eventData: PettyCashReimbursementEventData = {
              reimbursementId: r.id,
              reimbursementNumber: `BATCH-${batch.batch_number}`,
              walletId: r.wallet_id,
              walletName: wallet.wallet_name || 'Petty Cash Wallet',
              companyId: wallet.company_id,
              paymentDate: paymentDate,
              finalAmount: r.final_amount,
              bankAccountId: batch.bank_account_id || undefined,
              bankAccountCode: undefined,
              bankAccountName: undefined,
              paymentReference: paymentReference || undefined,
              currency: wallet.currency || 'THB',
            };

            createAndProcessEvent(
              'PETTYCASH_REIMBURSEMENT_PAID',
              paymentDate,
              [wallet.company_id],
              eventData as unknown as Record<string, unknown>,
              'petty_cash_reimbursement',
              r.id,
              undefined
            ).catch(err => {
              console.error('Failed to create petty cash reimbursement event:', err);
            });
          }
        } catch (err) {
          console.error('Error creating petty cash reimbursement event:', err);
        }
      }
    }

    return batch as PettyCashBatch;
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
      vendorId?: string;
      vendorName?: string;
      expenseDate: string;
      amount: number;
      projectId?: string;
      description?: string;
      accountCode?: string;
      createdBy?: string;
      // VAT fields
      vatType?: 'no_vat' | 'include' | 'exclude';
      vatRate?: number;
      vatAmount?: number;
      subtotal?: number;
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

    // Calculate VAT breakdown
    let subtotal = expenseData.amount;
    let vatAmount = 0;
    let totalAmount = expenseData.amount;

    if (expenseData.vatType && expenseData.vatType !== 'no_vat' && expenseData.vatRate) {
      const rate = expenseData.vatRate / 100;
      if (expenseData.vatType === 'include') {
        // VAT is included in the amount
        subtotal = expenseData.amount / (1 + rate);
        vatAmount = expenseData.amount - subtotal;
        totalAmount = expenseData.amount;
      } else if (expenseData.vatType === 'exclude') {
        // VAT is excluded - add on top
        subtotal = expenseData.amount;
        vatAmount = expenseData.amount * rate;
        totalAmount = expenseData.amount + vatAmount;
      }
    }

    // Use provided values if available (they may have been pre-calculated)
    if (expenseData.subtotal !== undefined) subtotal = expenseData.subtotal;
    if (expenseData.vatAmount !== undefined) vatAmount = expenseData.vatAmount;

    // Create the expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert([{
        company_id: expenseData.companyId,
        expense_number: expenseNumber,
        vendor_id: expenseData.vendorId || null,
        vendor_name: expenseData.vendorName || 'Petty Cash Expense',
        expense_date: expenseData.expenseDate,
        subtotal: subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        net_payable: totalAmount,
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
        project_id: expenseData.projectId || '',
        description: expenseData.description || 'Petty cash expense',
        amount: subtotal,
        account_code: expenseData.accountCode || null,
        quantity: 1,
        unit_price: subtotal,
        line_order: 1,
      }]);

    if (lineError) throw lineError;

    // Trigger EXPENSE_APPROVED event to create journal entry
    // This ensures the expense appears in P&L reports
    try {
      const approvedEventData: ExpenseApprovedEventData = {
        expenseId: expense.id,
        expenseNumber,
        vendorName: expenseData.vendorName || 'Petty Cash Expense',
        expenseDate: expenseData.expenseDate,
        lineItems: [{
          description: expenseData.description || 'Petty cash expense',
          accountCode: expenseData.accountCode || null,
          amount: subtotal,
        }],
        totalSubtotal: subtotal,
        totalVatAmount: vatAmount,
        totalAmount: totalAmount,
        currency: 'THB',
      };

      await createAndProcessEvent(
        'EXPENSE_APPROVED',
        expenseData.expenseDate,
        [expenseData.companyId],
        approvedEventData as unknown as Record<string, unknown>,
        'expense',
        expense.id,
        expenseData.createdBy,
        true // forcePost: true - ensures journal is posted immediately for P&L reporting
      );
    } catch (eventError) {
      // Log but don't fail - the expense is created, journal entry can be created later
      console.warn('Failed to create journal entry for linked expense:', eventError);
    }

    return { expenseId: expense.id };
  }
};
