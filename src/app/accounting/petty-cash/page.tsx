'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/accounting/AppShell';
import { KPICard } from '@/components/accounting/KPICard';
import { DataTable } from '@/components/accounting/DataTable';
import WalletSummaryCard from '@/components/petty-cash/WalletSummaryCard';
import ExpenseForm from '@/components/petty-cash/ExpenseForm';
import StockPurchaseForm from '@/components/petty-cash/StockPurchaseForm';
import ExpenseFilters, { type FilterValues } from '@/components/petty-cash/ExpenseFilters';
import {
  Wallet,
  Plus,
  Clock,
  Receipt,
  TrendingDown,
  FileText,
  Loader2,
  Package,
} from 'lucide-react';

// Auth import
import { useAuth } from '@/components/auth';

// Supabase API import
import { pettyCashApi, type PettyCashReimbursement } from '@/lib/supabase/api/pettyCash';
import { inventoryPurchasesApi, type InventoryPurchaseRow } from '@/lib/supabase/api/inventoryPurchases';
import type { Database } from '@/lib/supabase/database.types';
import type { Currency } from '@/data/company/types';

// Data imports
import { companiesApi } from '@/lib/supabase/api/companies';
import { projectsApi } from '@/lib/supabase/api/projects';
import type { SimplifiedExpenseInput } from '@/data/petty-cash/expenses';
import { notifyAccountantNewReimbursement } from '@/data/notifications/notifications';

// Supabase expense type
type SupabaseExpense = Database['public']['Tables']['petty_cash_expenses']['Row'];
import {
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusColor,
} from '@/lib/petty-cash/utils';
import type { PettyCashTransaction } from '@/data/petty-cash/types';

// Type for Supabase wallet
type SupabaseWallet = Database['public']['Tables']['petty_cash_wallets']['Row'];

// Type for transformed expense (for display)
interface TransformedExpense {
  id: string;
  expenseNumber: string;
  walletId: string;
  companyId: string | null;
  companyName: string;
  projectId: string;
  projectName: string;
  expenseDate: string;
  description: string;
  amount: number;
  netAmount: number;
  status: string | null;
  createdAt: string;
}

// Type for reimbursement (placeholder until Supabase migration)
interface TransformedReimbursement {
  id: string;
  reimbursementNumber: string;
  expenseNumber: string;
  companyId: string;
  companyName: string;
  finalAmount: number;
  status: string;
  createdAt: string;
}

// Transform Supabase wallet to frontend format expected by components
function transformWallet(dbWallet: SupabaseWallet) {
  return {
    id: dbWallet.id,
    walletName: dbWallet.wallet_name,
    userId: dbWallet.user_id,
    userName: dbWallet.user_name,
    companyId: dbWallet.company_id,
    balance: dbWallet.balance,
    currency: dbWallet.currency as Currency,
    status: dbWallet.status,
    balanceLimit: dbWallet.balance_limit,
    lowBalanceThreshold: dbWallet.low_balance_threshold,
  };
}

// Initial filter state
const initialFilters: FilterValues = {
  dateFrom: '',
  dateTo: '',
  status: '',
  projectId: '',
  companyId: '',
};

export default function PettyCashDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showStockPurchaseForm, setShowStockPurchaseForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'reimbursements' | 'history' | 'stock_purchases'>('expenses');
  const [refreshKey, setRefreshKey] = useState(0);

  // Wallet state from Supabase
  const [wallet, setWallet] = useState<SupabaseWallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [balanceBreakdown, setBalanceBreakdown] = useState<{
    initialBalance: number;
    topups: number;
    paidReimbursements: number;
    submittedExpenses: number;
  } | null>(null);

  // Filter states
  const [expenseFilters, setExpenseFilters] = useState<FilterValues>(initialFilters);
  const [reimbursementFilters, setReimbursementFilters] = useState<FilterValues>(initialFilters);

  // Expenses state from Supabase
  const [expenses, setExpenses] = useState<SupabaseExpense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);

  // Reimbursements state from Supabase
  const [reimbursementsDb, setReimbursementsDb] = useState<PettyCashReimbursement[]>([]);

  // Stock purchases state
  const [stockPurchases, setStockPurchases] = useState<InventoryPurchaseRow[]>([]);

  // Get companies and projects for filters (from Supabase)
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [allProjects, setAllProjects] = useState<{ id: string; name: string; code: string; companyId: string }[]>([]);

  // Load companies and projects
  useEffect(() => {
    async function loadDropdownData() {
      try {
        const [companiesData, projectsData] = await Promise.all([
          companiesApi.getActive(),
          projectsApi.getActive(),
        ]);
        setCompanies(companiesData.map(c => ({ id: c.id, name: c.name })));
        setAllProjects(projectsData.map(p => ({ id: p.id, name: p.name, code: p.code, companyId: p.company_id })));
      } catch (error) {
        console.error('Failed to load dropdown data:', error);
      }
    }
    loadDropdownData();
  }, []);

  // Transform Supabase wallet to frontend format
  const transformedWallet = useMemo(
    () => wallet ? transformWallet(wallet) : null,
    [wallet]
  );

  // Fetch wallet from Supabase using real user ID
  useEffect(() => {
    async function fetchWallet() {
      if (!user?.id) {
        setWalletLoading(false);
        return;
      }

      try {
        // Use the RPC to get calculated balance (correct source of truth)
        const allWallets = await pettyCashApi.getAllWalletsWithCalculatedBalances();
        const activeWallet = allWallets.find(w => w.user_id === user.id && w.status === 'active')
          || allWallets.find(w => w.user_id === user.id)
          || null;

        if (activeWallet) {
          // Override balance with calculated_balance so WalletSummaryCard shows correct amount
          setWallet({ ...activeWallet, balance: activeWallet.calculated_balance });
          setBalanceBreakdown({
            initialBalance: Number(activeWallet.balance) || 0,
            topups: activeWallet.total_topups,
            paidReimbursements: activeWallet.total_paid_reimbursements,
            submittedExpenses: activeWallet.total_submitted_expenses,
          });
        } else {
          setWallet(null);
          setBalanceBreakdown(null);
        }
      } catch (error) {
        console.error('Error fetching wallet:', error);
        setWallet(null);
      } finally {
        setWalletLoading(false);
      }
    }

    if (!authLoading) {
      fetchWallet();
    }
  }, [user?.id, authLoading, refreshKey]);

  // Fetch expenses from Supabase when wallet is loaded
  useEffect(() => {
    async function fetchExpenses() {
      if (!wallet) {
        setExpenses([]);
        setExpensesLoading(false);
        return;
      }

      setExpensesLoading(true);
      try {
        const expensesData = await pettyCashApi.getExpensesByWallet(wallet.id);
        setExpenses(expensesData);
      } catch (error) {
        console.error('Error fetching expenses:', error);
        setExpenses([]);
      } finally {
        setExpensesLoading(false);
      }
    }

    fetchExpenses();
  }, [wallet, refreshKey]);

  // Fetch reimbursements from Supabase when wallet is loaded
  useEffect(() => {
    async function fetchReimbursements() {
      if (!wallet) {
        setReimbursementsDb([]);
        return;
      }
      try {
        const data = await pettyCashApi.getReimbursementsByWallet(wallet.id);
        setReimbursementsDb(data);
      } catch (error) {
        console.error('Error fetching reimbursements:', error);
        setReimbursementsDb([]);
      }
    }
    fetchReimbursements();
  }, [wallet, refreshKey]);

  // Fetch stock purchases when user is loaded
  useEffect(() => {
    async function fetchStockPurchases() {
      if (!user?.id) {
        setStockPurchases([]);
        return;
      }
      try {
        const data = await inventoryPurchasesApi.getByCreator(user.id);
        setStockPurchases(data);
      } catch (error) {
        console.error('Error fetching stock purchases:', error);
        setStockPurchases([]);
      }
    }
    fetchStockPurchases();
  }, [user?.id, refreshKey]);

  // Transform expenses to frontend format for display
  const transformedExpenses = useMemo((): TransformedExpense[] => {
    return expenses.map(e => {
      const project = allProjects.find(p => p.id === e.project_id);
      const company = companies.find(c => c.id === e.company_id);
      return {
        id: e.id,
        expenseNumber: e.expense_number,
        walletId: e.wallet_id,
        companyId: e.company_id,
        companyName: company?.name || '',
        projectId: e.project_id,
        projectName: project?.name || '',
        expenseDate: e.expense_date,
        description: e.description || '',
        amount: e.amount || 0,
        netAmount: e.amount || 0,
        status: e.status,
        createdAt: e.created_at,
      };
    });
  }, [expenses, allProjects, companies]);

  // Transform reimbursements from Supabase to display format
  const reimbursements = useMemo((): TransformedReimbursement[] => {
    return reimbursementsDb.map((r) => {
      const expense = expenses.find(e => e.id === r.expense_id);
      const company = companies.find(c => c.id === r.company_id);
      return {
        id: r.id,
        reimbursementNumber: r.reimbursement_number || '',
        expenseNumber: expense?.expense_number || '',
        companyId: r.company_id || '',
        companyName: company?.name || '',
        finalAmount: Number(r.final_amount) || Number(r.amount) || 0,
        status: r.status,
        createdAt: r.created_at || '',
      };
    });
  }, [reimbursementsDb, expenses, companies]);

  const topUps: { id: string; date: string; amount: number; referenceNumber: string }[] = [];

  // Apply expense filters
  const filteredExpenses = useMemo(() => {
    return transformedExpenses.filter((expense) => {
      if (expenseFilters.dateFrom && expense.expenseDate < expenseFilters.dateFrom) {
        return false;
      }
      if (expenseFilters.dateTo && expense.expenseDate > expenseFilters.dateTo) {
        return false;
      }
      if (expenseFilters.status && expense.status !== expenseFilters.status) {
        return false;
      }
      if (expenseFilters.companyId && expense.companyId !== expenseFilters.companyId) {
        return false;
      }
      if (expenseFilters.projectId && expense.projectId !== expenseFilters.projectId) {
        return false;
      }
      return true;
    });
  }, [transformedExpenses, expenseFilters]);

  // Apply reimbursement filters
  const filteredReimbursements = useMemo(() => {
    return reimbursements.filter((reimbursement) => {
      if (reimbursementFilters.dateFrom && reimbursement.createdAt.split('T')[0] < reimbursementFilters.dateFrom) {
        return false;
      }
      if (reimbursementFilters.dateTo && reimbursement.createdAt.split('T')[0] > reimbursementFilters.dateTo) {
        return false;
      }
      if (reimbursementFilters.status && reimbursement.status !== reimbursementFilters.status) {
        return false;
      }
      if (reimbursementFilters.companyId && reimbursement.companyId !== reimbursementFilters.companyId) {
        return false;
      }
      return true;
    });
  }, [reimbursements, reimbursementFilters]);

  // Calculate stats from actual data
  const pendingReimbursement = useMemo(() => {
    // Sum up submitted expenses (awaiting reimbursement approval)
    return transformedExpenses
      .filter(e => e.status === 'submitted')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [transformedExpenses]);

  const monthlyExpenses = useMemo(() => {
    if (!wallet) return 0;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStart = `${year}-${month.toString().padStart(2, '0')}-01`;
    const monthEnd = `${year}-${month.toString().padStart(2, '0')}-31`;

    return transformedExpenses
      .filter(e => e.expenseDate >= monthStart && e.expenseDate <= monthEnd)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [wallet, transformedExpenses]);

  // Build transaction history from transformed expenses
  const transactionHistory = useMemo((): PettyCashTransaction[] => {
    const transactions: PettyCashTransaction[] = [];

    // Add expenses as transactions (negative amounts)
    transformedExpenses.forEach((exp) => {
      transactions.push({
        id: exp.id,
        type: 'expense',
        date: exp.expenseDate,
        description: exp.description,
        amount: -exp.netAmount,
        companyName: exp.companyName,
        walletId: exp.walletId,
        walletHolderName: wallet?.user_name || '',
        projectName: exp.projectName,
        status: exp.status || 'draft',
        referenceNumber: exp.expenseNumber,
      });
    });

    // Sort by date descending
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transformedExpenses, wallet]);

  // Handle expense creation - saves to Supabase
  const handleCreateExpense = useCallback(
    async (expenseData: SimplifiedExpenseInput) => {
      if (!wallet) return;

      try {
        // Create expense in Supabase with auto-generated number
        // Status 'submitted' so the RPC balance calculation counts it immediately
        const expense = await pettyCashApi.createExpenseWithNumber({
          wallet_id: wallet.id,
          company_id: expenseData.companyId || wallet.company_id,
          project_id: expenseData.projectId,
          expense_date: expenseData.expenseDate,
          description: expenseData.description,
          amount: expenseData.amount,
          status: 'submitted',
          created_by: user?.id || null,
          attachments: JSON.stringify(expenseData.attachments || []),
        } as Parameters<typeof pettyCashApi.createExpenseWithNumber>[0] & { attachments?: string });

        // Create reimbursement record so wallet can be replenished (matches manager page pattern)
        const reimbursement = await pettyCashApi.createReimbursementWithNumber({
          expense_id: expense.id,
          wallet_id: expense.wallet_id,
          company_id: expense.company_id,
          amount: expense.amount || 0,
          adjustment_amount: null,
          adjustment_reason: null,
          final_amount: expense.amount || 0,
          status: 'pending',
          bank_account_id: null,
          payment_date: null,
          payment_reference: null,
          approved_by: null,
          rejected_by: null,
          rejection_reason: null,
          bank_feed_line_id: null,
          created_by: user?.id || null,
        });

        // Notify accountant about the new expense claim
        notifyAccountantNewReimbursement(
          reimbursement.id,
          reimbursement.reimbursement_number,
          transformedWallet?.userName || '',
          expenseData.amount
        );

        // NOTE: No updateWallet call — the RPC calculates balance from submitted expenses automatically
        setShowExpenseForm(false);
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        console.error('Failed to create expense:', error);
        const msg = error instanceof Error ? error.message : 'Unknown error';
        alert(`Failed to create expense: ${msg}`);
      }
    },
    [wallet, user?.id]
  );

  // Status color helper
  const getStatusBadgeClass = (status: string) => {
    const color = getStatusColor(status);
    const styles = {
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      danger: 'bg-red-100 text-red-800',
      info: 'bg-blue-100 text-blue-800',
      default: 'bg-gray-100 text-gray-800',
    };
    return styles[color];
  };

  // Filter options
  const expenseStatusOptions = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const reimbursementStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'paid', label: 'Paid' },
    { value: 'rejected', label: 'Rejected' },
  ];

  // Table columns for expenses
  const expenseColumns = [
    {
      key: 'expenseNumber',
      header: 'Number',
      primary: true,
      render: (row: TransformedExpense) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/accounting/petty-cash/expenses/${row.id}`);
          }}
          className="text-[#5A7A8F] hover:underline font-medium"
        >
          {row.expenseNumber}
        </button>
      ),
    },
    {
      key: 'expenseDate',
      header: 'Date',
      render: (row: TransformedExpense) => formatDate(row.expenseDate),
    },
    { key: 'companyName', header: 'Company', hideOnMobile: true },
    { key: 'projectName', header: 'Project', hideOnMobile: true },
    { key: 'description', header: 'Description', hideOnMobile: true },
    {
      key: 'netAmount',
      header: 'Amount',
      align: 'right' as const,
      render: (row: TransformedExpense) => formatCurrency(row.netAmount),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      render: (row: TransformedExpense) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
            row.status === 'submitted'
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {row.status === 'submitted' ? 'Submitted' : 'Draft'}
        </span>
      ),
    },
  ];

  // Table columns for reimbursements
  const reimbursementColumns = [
    { key: 'reimbursementNumber', header: 'Number', primary: true },
    { key: 'expenseNumber', header: 'Expense' },
    { key: 'companyName', header: 'Company', hideOnMobile: true },
    {
      key: 'finalAmount',
      header: 'Amount',
      align: 'right' as const,
      render: (row: TransformedReimbursement) => formatCurrency(row.finalAmount),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      render: (row: TransformedReimbursement) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(
            row.status
          )}`}
        >
          {getStatusLabel(row.status)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Requested',
      render: (row: TransformedReimbursement) => formatDate(row.createdAt),
    },
  ];

  // Table columns for transaction history
  const historyColumns = [
    {
      key: 'date',
      header: 'Date',
      render: (row: { date: string }) => formatDate(row.date),
    },
    { key: 'referenceNumber', header: 'Reference', primary: true },
    { key: 'description', header: 'Description', hideOnMobile: true },
    {
      key: 'type',
      header: 'Type',
      align: 'center' as const,
      render: (row: { type: string }) => {
        const typeStyles: Record<string, string> = {
          expense: 'bg-red-100 text-red-800',
          topup: 'bg-green-100 text-green-800',
          reimbursement_paid: 'bg-blue-100 text-blue-800',
        };
        const typeLabels: Record<string, string> = {
          expense: 'Expense',
          topup: 'Top-up',
          reimbursement_paid: 'Reimbursed',
        };
        return (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
              typeStyles[row.type] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {typeLabels[row.type] || row.type}
          </span>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right' as const,
      render: (row: { amount: number }) => (
        <span
          className={`font-medium ${
            row.amount >= 0 ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {row.amount >= 0 ? '+' : ''}
          {formatCurrency(row.amount)}
        </span>
      ),
    },
  ];

  // Table columns for stock purchases
  const stockPurchaseColumns = [
    {
      key: 'purchase_number',
      header: 'Number',
      primary: true,
      render: (row: InventoryPurchaseRow) => (
        <span className="font-medium text-gray-900">{row.purchase_number}</span>
      ),
    },
    {
      key: 'purchase_date',
      header: 'Date',
      render: (row: InventoryPurchaseRow) => formatDate(row.purchase_date),
    },
    {
      key: 'vendor_name',
      header: 'Vendor',
      render: (row: InventoryPurchaseRow) => row.vendor_name || '-',
    },
    {
      key: 'category',
      header: 'Category',
      hideOnMobile: true,
      render: (row: InventoryPurchaseRow) => {
        const labels: Record<string, string> = {
          general: 'General',
          provisions: 'Provisions',
          boat_parts: 'Boat Parts',
          office_supplies: 'Office Supplies',
        };
        return labels[row.category || ''] || row.category || '-';
      },
    },
    {
      key: 'total_amount',
      header: 'Amount',
      align: 'right' as const,
      render: (row: InventoryPurchaseRow) => formatCurrency(row.total_amount),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      render: (row: InventoryPurchaseRow) => {
        const styles: Record<string, string> = {
          draft: 'bg-yellow-100 text-yellow-800',
          received: 'bg-green-100 text-green-800',
          void: 'bg-red-100 text-red-800',
        };
        const labels: Record<string, string> = {
          draft: 'Draft',
          received: 'Received',
          void: 'Voided',
        };
        return (
          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${styles[row.status] || 'bg-gray-100 text-gray-800'}`}>
            {labels[row.status] || row.status}
          </span>
        );
      },
    },
  ];

  // Loading state
  if (authLoading || walletLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#5A7A8F] mx-auto mb-4" />
            <p className="text-gray-500">Loading your wallet...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!wallet) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No Wallet Found
            </h3>
            <p className="text-gray-500">
              You don&apos;t have a petty cash wallet assigned.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Info Banner */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Wallet className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Personal Petty Cash Wallet
            </p>
            <p className="text-sm text-blue-700 mt-1">
              You can only see and manage your own wallet transactions. Submit
              expenses and track reimbursement status here.
            </p>
          </div>
        </div>
      </div>

      {/* Wallet Summary Card */}
      <div className="mb-6">
        <WalletSummaryCard
          wallet={transformedWallet}
          pendingReimbursement={pendingReimbursement}
          monthlyExpenses={monthlyExpenses}
          balanceBreakdown={balanceBreakdown}
        />
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KPICard
          title="Total Expenses"
          value={expenses.length}
          icon={Receipt}
          subtitle="All time"
        />
        <KPICard
          title="Submitted"
          value={expenses.filter((e) => e.status === 'submitted').length}
          icon={FileText}
          variant="default"
          subtitle="Awaiting review"
        />
        <KPICard
          title="This Month"
          value={formatCurrency(monthlyExpenses)}
          icon={TrendingDown}
          subtitle="Expenses"
        />
        <KPICard
          title="Submitted"
          value={expenses.filter((e) => e.status === 'submitted').length}
          icon={Clock}
          variant="default"
          subtitle="Awaiting processing"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => setShowExpenseForm(true)}
          disabled={transformedWallet?.status === 'closed'}
          className="inline-flex items-center gap-2 rounded-lg bg-[#5A7A8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a6a7f] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          New Expense
        </button>
        <button
          onClick={() => setShowStockPurchaseForm(true)}
          disabled={transformedWallet?.status === 'closed'}
          className="inline-flex items-center gap-2 rounded-lg border border-[#5A7A8F] px-4 py-2 text-sm font-medium text-[#5A7A8F] hover:bg-[#5A7A8F]/5 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Package className="h-4 w-4" />
          New Stock Purchase
        </button>
        {transformedWallet?.status === 'closed' && (
          <span className="ml-3 text-sm text-red-600 self-center">
            Your wallet is closed. Contact your manager.
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          {[
            { id: 'expenses', label: 'Expenses', icon: Receipt },
            { id: 'reimbursements', label: 'Reimbursements', icon: Clock },
            { id: 'history', label: 'Transaction History', icon: FileText },
            { id: 'stock_purchases', label: 'Stock Purchases', icon: Package },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-[#5A7A8F] text-[#5A7A8F]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'expenses' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            My Expenses
          </h3>
          <ExpenseFilters
            filters={expenseFilters}
            onFilterChange={(updates) => setExpenseFilters((prev) => ({ ...prev, ...updates }))}
            onClear={() => setExpenseFilters(initialFilters)}
            statusOptions={expenseStatusOptions}
            statusLabel="Receipt Status"
            projects={allProjects}
            companies={companies}
          />
          <DataTable
            columns={expenseColumns}
            data={filteredExpenses}
            emptyMessage="No expenses recorded yet"
          />
        </div>
      )}

      {activeTab === 'reimbursements' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Reimbursement Requests
          </h3>
          <ExpenseFilters
            filters={reimbursementFilters}
            onFilterChange={(updates) => setReimbursementFilters((prev) => ({ ...prev, ...updates }))}
            onClear={() => setReimbursementFilters(initialFilters)}
            statusOptions={reimbursementStatusOptions}
            statusLabel="Status"
            projects={allProjects}
            companies={companies}
          />
          <DataTable
            columns={reimbursementColumns}
            data={filteredReimbursements}
            emptyMessage="No reimbursement requests"
          />

          {/* Reimbursement Status Summary */}
          {reimbursements.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Status Summary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['pending', 'approved', 'paid', 'rejected'].map((status) => {
                  const count = reimbursements.filter(
                    (r) => r.status === status
                  ).length;
                  const amount = reimbursements
                    .filter((r) => r.status === status)
                    .reduce((sum, r) => sum + r.finalAmount, 0);
                  return (
                    <div key={status} className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {status}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Transaction History
          </h3>
          <DataTable
            columns={historyColumns}
            data={transactionHistory}
            emptyMessage="No transactions yet"
          />
        </div>
      )}

      {activeTab === 'stock_purchases' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            My Stock Purchases
          </h3>
          <DataTable
            columns={stockPurchaseColumns}
            data={stockPurchases}
            emptyMessage="No stock purchases yet"
          />
        </div>
      )}

      {/* Expense Form Modal */}
      {showExpenseForm && transformedWallet && (
        <ExpenseForm
          walletId={transformedWallet.id}
          walletHolderName={transformedWallet.userName}
          onSave={handleCreateExpense}
          onCancel={() => setShowExpenseForm(false)}
        />
      )}

      {/* Stock Purchase Form Modal */}
      {showStockPurchaseForm && transformedWallet && user?.id && (
        <StockPurchaseForm
          walletId={transformedWallet.id}
          companyId={transformedWallet.companyId}
          currency={transformedWallet.currency}
          userId={user.id}
          onSave={() => {
            setShowStockPurchaseForm(false);
            setRefreshKey((prev) => prev + 1);
          }}
          onCancel={() => setShowStockPurchaseForm(false)}
        />
      )}
    </AppShell>
  );
}
