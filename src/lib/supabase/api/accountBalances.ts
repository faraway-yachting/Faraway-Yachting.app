import { createClient } from '../client';
import type { Database } from '../database.types';
import type { AccountBalance, AccountBalanceGroup, AccountType } from '@/data/finances/types';
import type { Currency } from '@/data/company/types';

type BankAccount = Database['public']['Tables']['bank_accounts']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];

/**
 * API for fetching account balances from bank accounts
 * Used for the Cash/Bank/e-Wallet page
 */
export const accountBalancesApi = {
  /**
   * Get all account balances with calculated current balance
   * Uses a single RPC call instead of N+1 queries (1 per bank account)
   * Current balance = opening balance + sum of receipts - sum of expenses
   */
  async getAll(companyId?: string): Promise<AccountBalance[]> {
    const supabase = createClient();

    // Single RPC call replaces: getBankAccounts + N * getAccountMovements (2 queries each)
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
      'get_account_balances',
      companyId ? { p_company_id: companyId } : {}
    );

    if (rpcError) {
      console.error('Error fetching account balances via RPC:', rpcError);
      // Fallback to old N+1 approach if RPC not available (e.g. migration not yet applied)
      return this.getAllFallback(companyId);
    }

    // Still need companies for display names
    const companies = await this.getCompaniesMap();

    return ((rpcData ?? []) as Array<{
      bank_account_id: string;
      account_name: string;
      company_id: string;
      currency: string;
      opening_balance: number;
      opening_balance_date: string | null;
      gl_account_code: string;
      is_active: boolean;
      total_in: number;
      total_out: number;
    }>).map(row => {
      const company = companies.get(row.company_id);
      const openingBalance = Number(row.opening_balance) || 0;
      const totalIn = Number(row.total_in) || 0;
      const totalOut = Number(row.total_out) || 0;
      const currentBalance = openingBalance + totalIn - totalOut;

      const accountType = this.determineAccountType({
        gl_account_code: row.gl_account_code,
        account_name: row.account_name,
      } as BankAccount);

      return {
        id: row.bank_account_id,
        accountId: row.bank_account_id,
        accountName: row.account_name,
        accountType,
        companyId: row.company_id,
        companyName: company?.name || 'Unknown Company',
        currency: row.currency as Currency,
        openingBalance,
        openingBalanceDate: row.opening_balance_date || '',
        currentBalance,
        asOfDate: new Date().toISOString().split('T')[0],
        movements: { totalIn, totalOut },
        glAccountCode: row.gl_account_code,
        isActive: row.is_active,
      };
    });
  },

  /**
   * Fallback: original N+1 approach (used if RPC function not yet deployed)
   */
  async getAllFallback(companyId?: string): Promise<AccountBalance[]> {
    const [bankAccounts, companies] = await Promise.all([
      this.getBankAccounts(companyId),
      this.getCompaniesMap(),
    ]);

    const accountBalances: AccountBalance[] = [];

    for (const account of bankAccounts) {
      const company = companies.get(account.company_id);
      const movements = await this.getAccountMovements(account.id);
      const openingBalance = account.opening_balance || 0;
      const currentBalance = openingBalance + movements.totalIn - movements.totalOut;
      const accountType = this.determineAccountType(account);

      accountBalances.push({
        id: account.id,
        accountId: account.id,
        accountName: account.account_name,
        accountType,
        companyId: account.company_id,
        companyName: company?.name || 'Unknown Company',
        currency: account.currency as Currency,
        openingBalance,
        openingBalanceDate: account.opening_balance_date || '',
        currentBalance,
        asOfDate: new Date().toISOString().split('T')[0],
        movements,
        glAccountCode: account.gl_account_code,
        isActive: account.is_active,
      });
    }

    return accountBalances;
  },

  /**
   * Get account balances grouped by type (cash, bank, e-wallet)
   */
  async getGrouped(companyId?: string): Promise<AccountBalanceGroup[]> {
    const accounts = await this.getAll(companyId);
    return this.groupByType(accounts);
  },

  /**
   * Group accounts by type
   */
  groupByType(accounts: AccountBalance[]): AccountBalanceGroup[] {
    const groups: Map<AccountType, AccountBalance[]> = new Map();

    accounts.forEach(account => {
      if (!groups.has(account.accountType)) {
        groups.set(account.accountType, []);
      }
      groups.get(account.accountType)!.push(account);
    });

    const typeLabels: Record<AccountType, string> = {
      cash: 'Cash Accounts',
      bank: 'Bank Accounts',
      'e-wallet': 'e-Wallets',
    };

    const result: AccountBalanceGroup[] = [];
    const order: AccountType[] = ['cash', 'bank', 'e-wallet'];

    order.forEach(type => {
      const typeAccounts = groups.get(type) || [];
      if (typeAccounts.length > 0) {
        result.push({
          type,
          label: typeLabels[type],
          accounts: typeAccounts,
          totalBalance: typeAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0),
        });
      }
    });

    return result;
  },

  /**
   * Calculate account movements (total in and total out)
   * Based on receipt payments and expense payments linked to this bank account
   */
  async getAccountMovements(bankAccountId: string): Promise<{ totalIn: number; totalOut: number }> {
    const supabase = createClient();

    // Get total receipts received at this bank account
    const { data: receiptPayments, error: receiptError } = await supabase
      .from('receipt_payment_records')
      .select('amount')
      .eq('received_at', bankAccountId);

    if (receiptError) {
      console.error('Error fetching receipt payments:', receiptError);
    }

    const totalIn = (receiptPayments ?? []).reduce((sum, p) => sum + (p.amount || 0), 0);

    // Get total expenses paid from this bank account
    const { data: expensePayments, error: expenseError } = await supabase
      .from('expense_payments')
      .select('amount')
      .eq('paid_from', bankAccountId);

    if (expenseError) {
      console.error('Error fetching expense payments:', expenseError);
    }

    const totalOut = (expensePayments ?? []).reduce((sum, p) => sum + (p.amount || 0), 0);

    return { totalIn, totalOut };
  },

  /**
   * Determine account type based on GL code or account name
   */
  determineAccountType(account: BankAccount): AccountType {
    const glCode = account.gl_account_code;
    const name = account.account_name.toLowerCase();

    // Check GL code patterns
    if (glCode === '1000' || glCode.startsWith('1000')) {
      return 'cash';
    }

    // Check name patterns
    if (name.includes('cash') || name.includes('petty')) {
      return 'cash';
    }
    if (name.includes('wallet') || name.includes('promptpay') || name.includes('paynow')) {
      return 'e-wallet';
    }

    // Default to bank
    return 'bank';
  },

  // Helper: Get bank accounts
  async getBankAccounts(companyId?: string): Promise<BankAccount[]> {
    const supabase = createClient();
    let query = supabase
      .from('bank_accounts')
      .select('*')
      .eq('is_active', true)
      .order('account_name');

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  // Helper: Get companies map
  async getCompaniesMap(): Promise<Map<string, Company>> {
    const supabase = createClient();
    const { data, error } = await supabase.from('companies').select('*');
    if (error) throw error;

    const map = new Map<string, Company>();
    for (const company of data ?? []) {
      map.set(company.id, company);
    }
    return map;
  },

  // Helper: Get companies list for dropdown
  async getCompanies(): Promise<{ id: string; name: string }[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data ?? [];
  },
};
