'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/accounting/AppShell';
import { KPICard } from '@/components/accounting/KPICard';
import { DataTable } from '@/components/accounting/DataTable';
import dynamic from 'next/dynamic';

const TopUpModal = dynamic(() => import('@/components/petty-cash/TopUpModal'));
const ReimbursementApprovalModal = dynamic(() =>
  import('@/components/petty-cash/ReimbursementApprovalModal')
);
import WalletSummaryCard from '@/components/petty-cash/WalletSummaryCard';
import ExpenseForm from '@/components/petty-cash/ExpenseForm';
import ExpenseFilters, { type FilterValues as ExpenseFilterValues } from '@/components/petty-cash/ExpenseFilters';
import {
  Wallet,
  Users,
  AlertTriangle,
  TrendingDown,
  CheckCircle,
  Clock,
  ArrowUpCircle,
  Building2,
  ChevronRight,
  Eye,
  ArrowDownCircle,
  RefreshCw,
  Filter,
  X,
  Square,
  Minus,
  Plus,
  Receipt,
  FileText,
  Loader2,
} from 'lucide-react';

// Auth import
import { useAuth } from '@/components/auth';

// Supabase API imports
import { pettyCashApi, type PettyCashReimbursement as SupabaseReimbursement } from '@/lib/supabase/api/pettyCash';
import { companiesApi } from '@/lib/supabase/api/companies';
import { projectsApi } from '@/lib/supabase/api/projects';
import type { Database } from '@/lib/supabase/database.types';
import type { Currency } from '@/data/company/types';
import type { VatType } from '@/data/petty-cash/types';

// Mock data imports (still needed for some features not yet migrated)
import {
  getAllWallets,
  getLowBalanceWallets,
  getTotalWalletBalance,
  addToWallet,
  getAllTransactions,
  deductFromWallet,
} from '@/data/petty-cash/wallets';
import {
  getAllExpenses,
  getExpenseById,
  updateReceiptStatus,
  getExpensesByWallet,
  getMonthlyExpensesForWallet,
} from '@/data/petty-cash/expenses';
import type { SimplifiedExpenseInput } from '@/data/petty-cash/expenses';
import {
  getAllReimbursements,
  approveReimbursement,
  processReimbursementPayment,
  rejectReimbursement,
  getPendingAmountForWallet,
  createReimbursement,
} from '@/data/petty-cash/reimbursements';
import { createTopUp, completeTopUp, getTopUpsByWallet } from '@/data/petty-cash/topups';
import { notifyAccountantNewReimbursement } from '@/data/notifications/notifications';
import type { PettyCashWallet, PettyCashReimbursement, PettyCashExpense, PettyCashTransaction, TransactionType, ReceiptStatus, ExpenseStatus, Attachment } from '@/data/petty-cash/types';
import {
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusColor,
  getCurrentMonthStart,
  getCurrentMonthEnd,
  buildTransactionHistory,
} from '@/lib/petty-cash/utils';

// Types for Supabase data
type SupabaseWallet = Database['public']['Tables']['petty_cash_wallets']['Row'];
type SupabaseWalletWithBalance = SupabaseWallet & { calculated_balance: number };
// Extend expense type to include columns that exist in DB but aren't in generated types
type SupabaseExpenseBase = Database['public']['Tables']['petty_cash_expenses']['Row'];
type SupabaseExpense = SupabaseExpenseBase & {
  attachments?: string | unknown[] | null;
  updated_at?: string;
  // Accounting fields (added in migration 093)
  expense_account_code?: string | null;
  accounting_vat_type?: string | null;
  accounting_vat_rate?: number | null;
  accounting_completed_by?: string | null;
  accounting_completed_at?: string | null;
};
type DbCompany = Database['public']['Tables']['companies']['Row'];
type DbProject = Database['public']['Tables']['projects']['Row'];

// Transform Supabase wallet to frontend format
type TransformedWallet = {
  id: string;
  walletName: string;
  userId: string | null;
  userName: string;
  companyId: string;
  balance: number;
  currency: Currency;
  status: string;
  balanceLimit: number | null;
  lowBalanceThreshold: number | null;
};

function transformWallet(dbWallet: SupabaseWallet): TransformedWallet {
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

// Transform wallet with calculated balance (for "All Wallets" view)
function transformWalletWithCalculatedBalance(dbWallet: SupabaseWalletWithBalance): TransformedWallet {
  return {
    id: dbWallet.id,
    walletName: dbWallet.wallet_name,
    userId: dbWallet.user_id,
    userName: dbWallet.user_name,
    companyId: dbWallet.company_id,
    balance: dbWallet.calculated_balance, // Use calculated balance instead of initial balance
    currency: dbWallet.currency as Currency,
    status: dbWallet.status,
    balanceLimit: dbWallet.balance_limit,
    lowBalanceThreshold: dbWallet.low_balance_threshold,
  };
}

// Transform Supabase expense to frontend-compatible format for display
function transformExpenseForDisplay(
  dbExpense: SupabaseExpense,
  companies: { id: string; name: string }[],
  projects: { id: string; name: string }[],
  walletHolderName: string
) {
  const company = companies.find(c => c.id === dbExpense.company_id);
  const project = projects.find(p => p.id === dbExpense.project_id);
  return {
    id: dbExpense.id,
    expenseNumber: dbExpense.expense_number,
    walletId: dbExpense.wallet_id,
    walletHolderName,
    companyId: dbExpense.company_id,
    companyName: company?.name || '',
    expenseDate: dbExpense.expense_date,
    description: dbExpense.description || '',
    amount: dbExpense.amount || 0,
    projectId: dbExpense.project_id,
    projectName: project?.name || '',
    status: dbExpense.status,
    netAmount: dbExpense.amount || 0, // For simplified expenses, amount = netAmount
    createdAt: dbExpense.created_at,
  };
}

// Initial filter state for My Wallet view
const initialMyWalletFilters: ExpenseFilterValues = {
  dateFrom: '',
  dateTo: '',
  status: '',
  projectId: '',
  companyId: '',
};

export default function PettyCashManagementPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedWallet, setSelectedWallet] = useState<PettyCashWallet | null>(null);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedReimbursement, setSelectedReimbursement] = useState<PettyCashReimbursement | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<PettyCashExpense | null>(null);

  // View mode toggle: 'all-wallets' (default), 'my-wallet', or 'add-expense'
  const [viewMode, setViewMode] = useState<'all-wallets' | 'my-wallet' | 'add-expense'>('all-wallets');

  // Add Expense tab state
  const [addExpenseWalletId, setAddExpenseWalletId] = useState<string>('');

  // My wallet state (fetched from Supabase for current user)
  const [myWallet, setMyWallet] = useState<SupabaseWallet | null>(null);
  const [myWalletLoading, setMyWalletLoading] = useState(true);

  // Supabase-loaded data for My Wallet view
  const [myWalletExpensesDb, setMyWalletExpensesDb] = useState<SupabaseExpense[]>([]);
  const [myWalletReimbursementsDb, setMyWalletReimbursementsDb] = useState<SupabaseReimbursement[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; code: string }[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Supabase data for "All Wallets" view (declared early for use in My Wallet derivation)
  const [allWalletsDb, setAllWalletsDb] = useState<SupabaseWalletWithBalance[]>([]);
  const [allExpensesDb, setAllExpensesDb] = useState<SupabaseExpense[]>([]);
  const [isLoadingAllWallets, setIsLoadingAllWallets] = useState(true);

  // My Wallet view state
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [myWalletTab, setMyWalletTab] = useState<'expenses' | 'reimbursements' | 'history'>('expenses');
  const [myWalletExpenseFilters, setMyWalletExpenseFilters] = useState<ExpenseFilterValues>(initialMyWalletFilters);
  const [myWalletReimbursementFilters, setMyWalletReimbursementFilters] = useState<ExpenseFilterValues>(initialMyWalletFilters);

  // Resubmit state - pre-filled data and tracking to prevent duplicate resubmits
  const [resubmitPrefilledData, setResubmitPrefilledData] = useState<{
    projectId: string;
    projectName?: string;
    expenseDate: string;
    amount: number;
    description: string;
    originalReimbursementId: string;
  } | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null); // Track when editing existing expense for resubmit
  const [resubmittedIds, setResubmittedIds] = useState<Set<string>>(new Set());

  // Transaction filter state
  const [txnDateFrom, setTxnDateFrom] = useState('');
  const [txnDateTo, setTxnDateTo] = useState('');
  const [txnWalletId, setTxnWalletId] = useState('');
  const [txnCompanyId, setTxnCompanyId] = useState('');
  const [txnType, setTxnType] = useState<TransactionType | ''>('');
  const [txnReceiptStatus, setTxnReceiptStatus] = useState<ReceiptStatus | ''>('');

  // Receipt status confirmation dialog state
  const [showReceiptConfirmDialog, setShowReceiptConfirmDialog] = useState(false);
  const [pendingReceiptUncheck, setPendingReceiptUncheck] = useState<PettyCashTransaction | null>(null);

  // Fetch guard to prevent duplicate API calls
  const isFetchingRef = useRef(false);
  const autoCreateInProgressRef = useRef(false);
  const hasAutoCreatedOnceRef = useRef(false); // Only allow auto-creation once per page load
  const lastFetchTimeRef = useRef(0);

  // Consolidated data loading function with fetch guard
  const loadAllData = useCallback(async (forceRefresh = false) => {
    // Prevent concurrent fetches (debounce 500ms unless forced)
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTimeRef.current < 500) {
      return;
    }
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;

    try {
      // Phase 1: Load dropdown data (companies, projects) - these are needed by other queries
      const [companiesData, projectsData] = await Promise.all([
        companiesApi.getActive(),
        projectsApi.getActive(),
      ]);
      const mappedCompanies = companiesData.map((c: DbCompany) => ({ id: c.id, name: c.name }));
      const mappedProjects = projectsData.map((p: DbProject) => ({ id: p.id, name: p.name, code: p.code }));
      setCompanies(mappedCompanies);
      setProjects(mappedProjects);
      setIsLoadingData(false);

      // Phase 2: Load all wallets, expenses, and reimbursements in parallel
      const [
        walletsData,
        allExpensesData,
        reimbursementsData,
        transferSummaryData,
      ] = await Promise.all([
        pettyCashApi.getAllWalletsWithCalculatedBalances(),
        pettyCashApi.getAllExpenses(),
        pettyCashApi.getPendingReimbursementsWithDetails(),
        pettyCashApi.getApprovedReimbursementsGroupedForTransfer(),
      ]);

      setAllWalletsDb(walletsData);
      setAllExpensesDb(allExpensesData);
      setIsLoadingAllWallets(false);

      // Set transfer summary data
      setTransferSummary(transferSummaryData);
      setIsLoadingTransferSummary(false);

      // Transform pending reimbursements
      const transformedPending = reimbursementsData.map((r) => ({
        id: r.id,
        reimbursementNumber: r.reimbursement_number || '',
        walletId: r.wallet_id,
        walletHolderName: r.wallet_holder_name || '',
        expenseId: r.expense_id || '',
        companyId: '',
        companyName: r.company_name || '',
        amount: Number(r.amount) || 0,
        finalAmount: Number(r.final_amount) || Number(r.amount) || 0,
        status: r.status as 'pending' | 'approved' | 'paid' | 'rejected',
        createdAt: r.created_at || '',
        createdBy: r.created_by || '',
        updatedAt: r.updated_at || '',
        notes: '',
        expenseNumber: '',
      }));
      setPendingReimbursements(transformedPending);
      setIsLoadingPendingReimbursements(false);

      // Derive approved count from transfer summary (avoids a separate query)
      const approvedCount = transferSummaryData.reduce(
        (total, group) => total + group.bankAccountGroups.reduce(
          (sum, bg) => sum + bg.reimbursementIds.length, 0
        ), 0
      );
      setApprovedReimbursementCount(approvedCount);

      // Background: Auto-create reimbursements for submitted expenses (non-blocking)
      // Only run ONCE per page load to prevent duplicate creation attempts
      if (!hasAutoCreatedOnceRef.current && !autoCreateInProgressRef.current) {
        hasAutoCreatedOnceRef.current = true; // Mark as attempted - never retry
        autoCreateInProgressRef.current = true;
        const existingExpenseIds = new Set(reimbursementsData.map(r => r.expense_id));
        const submittedWithoutReimb = allExpensesData.filter(
          e => e.status === 'submitted' && !existingExpenseIds.has(e.id) && e.company_id
        );

        if (submittedWithoutReimb.length > 0) {
          // Single batch insert instead of individual requests per expense
          (async () => {
            try {
              await pettyCashApi.batchCreateReimbursements(
                submittedWithoutReimb.map(expense => ({
                  wallet_id: expense.wallet_id,
                  expense_id: expense.id,
                  amount: expense.amount || 0,
                  final_amount: expense.amount || 0,
                  company_id: expense.company_id!,
                  status: 'pending' as const,
                  bank_account_id: null,
                  payment_date: null,
                  payment_reference: null,
                  adjustment_amount: null,
                  adjustment_reason: null,
                  approved_by: null,
                  rejected_by: null,
                  rejection_reason: null,
                  bank_feed_line_id: null,
                  created_by: null,
                }))
              );
              console.log(`Auto-created ${submittedWithoutReimb.length} reimbursements in batch`);
            } catch (err) {
              console.log('Batch reimbursement creation error:', err);
            }
            autoCreateInProgressRef.current = false;
          })();
        } else {
          autoCreateInProgressRef.current = false;
        }
      }
    } catch (error) {
      console.error('Error loading petty cash data:', error);
      setIsLoadingData(false);
      setIsLoadingAllWallets(false);
      setIsLoadingPendingReimbursements(false);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Single effect for initial data load
  useEffect(() => {
    loadAllData(true);
  }, [loadAllData]);

  // Refresh when refreshKey changes (but debounced)
  useEffect(() => {
    if (refreshKey > 0) {
      loadAllData(false);
    }
  }, [refreshKey, loadAllData]);

  // Derive My Wallet from already-loaded allWalletsDb + allExpensesDb (eliminates 3 redundant queries)
  // Only fetch reimbursements-by-wallet separately (not loaded in Phase 2)
  useEffect(() => {
    async function deriveMyWallet() {
      if (!user?.id || allWalletsDb.length === 0) {
        if (!authLoading && allWalletsDb.length === 0 && !isLoadingAllWallets) {
          setMyWalletLoading(false);
        }
        return;
      }

      try {
        // Find user's wallet from already-loaded data (no extra query needed)
        const activeWallet = allWalletsDb.find(w => w.user_id === user.id && w.status === 'active')
          || allWalletsDb.find(w => w.user_id === user.id)
          || null;

        if (activeWallet) {
          // Use calculated_balance from allWalletsDb (already computed by get_wallets_with_balances())
          setMyWallet({
            ...activeWallet,
            balance: activeWallet.calculated_balance,
          });

          // Derive expenses from already-loaded allExpensesDb (no extra query needed)
          const walletExpenses = allExpensesDb.filter(e => e.wallet_id === activeWallet.id);
          setMyWalletExpensesDb(walletExpenses);

          // Only fetch reimbursements — this is the one query we still need
          const reimbursementsData = await pettyCashApi.getReimbursementsByWallet(activeWallet.id);
          setMyWalletReimbursementsDb(reimbursementsData);
        } else {
          setMyWallet(null);
          setMyWalletReimbursementsDb([]);
        }
      } catch (error) {
        console.error('Error deriving my wallet:', error);
        setMyWallet(null);
      } finally {
        setMyWalletLoading(false);
      }
    }

    if (!authLoading) {
      deriveMyWallet();
    }
  }, [user?.id, authLoading, allWalletsDb, allExpensesDb, isLoadingAllWallets, refreshKey]);

  // Transform my wallet to frontend format
  const transformedMyWallet = useMemo(
    () => myWallet ? transformWallet(myWallet) : null,
    [myWallet]
  );

  // Check if user has their own wallet
  const hasOwnWallet = !!myWallet;

  // Transform wallets for display (using calculated balance)
  const wallets = useMemo(() => {
    return allWalletsDb.map(transformWalletWithCalculatedBalance);
  }, [allWalletsDb]);

  // Derive selected wallet for "Add Expense" tab
  const addExpenseWallet = useMemo(() => {
    if (!addExpenseWalletId) return null;
    const w = allWalletsDb.find(w => w.id === addExpenseWalletId);
    return w ? transformWalletWithCalculatedBalance(w) : null;
  }, [addExpenseWalletId, allWalletsDb]);

  // Transform expenses for display in All Wallets view
  const allExpenses = useMemo(() => {
    return allExpensesDb.map(exp => {
      const company = companies.find(c => c.id === exp.company_id);
      const project = projects.find(p => p.id === exp.project_id);
      const wallet = allWalletsDb.find(w => w.id === exp.wallet_id);
      return {
        id: exp.id,
        expenseNumber: exp.expense_number,
        walletId: exp.wallet_id,
        walletHolderName: wallet?.user_name || '',
        companyId: exp.company_id,
        companyName: company?.name || '',
        expenseDate: exp.expense_date,
        description: exp.description || '',
        amount: exp.amount || 0,
        projectId: exp.project_id,
        projectName: project?.name || '',
        status: exp.status,
        netAmount: exp.amount || 0,
        createdAt: exp.created_at,
      };
    });
  }, [allExpensesDb, companies, projects, allWalletsDb]);

  // Still using mock data for all reimbursements list
  const reimbursements = useMemo(() => getAllReimbursements(), [refreshKey]);

  // State for pending and approved reimbursements (loaded by consolidated loadAllData)
  const [pendingReimbursements, setPendingReimbursements] = useState<PettyCashReimbursement[]>([]);
  const [isLoadingPendingReimbursements, setIsLoadingPendingReimbursements] = useState(true);
  const [approvedReimbursementCount, setApprovedReimbursementCount] = useState(0);

  // Transfer Summary state - groups approved reimbursements by wallet → bank account
  type TransferGroup = {
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
  };
  const [transferSummary, setTransferSummary] = useState<TransferGroup[]>([]);
  const [isLoadingTransferSummary, setIsLoadingTransferSummary] = useState(true);
  const [selectedTransfers, setSelectedTransfers] = useState<Set<string>>(new Set()); // Set of "walletId-bankAccountId" keys
  const [isProcessingTransfer, setIsProcessingTransfer] = useState(false);

  // Calculate low balance wallets from Supabase data
  const lowBalanceWallets = useMemo(() => {
    return wallets.filter(w =>
      w.lowBalanceThreshold && w.balance <= w.lowBalanceThreshold && w.status === 'active'
    );
  }, [wallets]);

  // Build transactions from Supabase expenses (topups and reimbursements still from mock)
  const allTransactions = useMemo((): PettyCashTransaction[] => {
    const expenseTransactions: PettyCashTransaction[] = allExpenses.map(exp => ({
      id: exp.id,
      type: 'expense' as const,
      date: exp.expenseDate,
      referenceNumber: exp.expenseNumber,
      walletId: exp.walletId,
      walletHolderName: exp.walletHolderName,
      companyName: exp.companyName,
      description: exp.description,
      amount: -(exp.amount || 0),
      status: exp.status,
      projectName: exp.projectName,
      receiptStatus: 'pending' as const, // Default for now
    }));
    // TODO: Add topups and reimbursements when migrated to Supabase
    return expenseTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allExpenses]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((txn) => {
      if (txnDateFrom && txn.date < txnDateFrom) return false;
      if (txnDateTo && txn.date > txnDateTo) return false;
      if (txnWalletId && txn.walletId !== txnWalletId) return false;
      if (txnCompanyId && txn.companyName !== companies.find(c => c.id === txnCompanyId)?.name) return false;
      if (txnType && txn.type !== txnType) return false;
      // Receipt status filter - only applies to expense type
      if (txnReceiptStatus) {
        if (txn.type !== 'expense') return false;
        if (txn.receiptStatus !== txnReceiptStatus) return false;
      }
      return true;
    });
  }, [allTransactions, txnDateFrom, txnDateTo, txnWalletId, txnCompanyId, txnType, txnReceiptStatus, companies]);

  // Clear transaction filters
  const clearTxnFilters = useCallback(() => {
    setTxnDateFrom('');
    setTxnDateTo('');
    setTxnWalletId('');
    setTxnCompanyId('');
    setTxnType('');
    setTxnReceiptStatus('');
  }, []);

  const hasActiveTxnFilters = txnDateFrom || txnDateTo || txnWalletId || txnCompanyId || txnType || txnReceiptStatus;

  // Calculate stats from Supabase data
  const totalBalance = useMemo(() => {
    return wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  }, [wallets]);

  const pendingStats = useMemo(() => ({
    count: pendingReimbursements.length,
    amount: pendingReimbursements.reduce((sum, r) => sum + r.amount, 0),
  }), [pendingReimbursements]);

  // Monthly expenses calculation from Supabase data
  const monthlyExpenses = useMemo(() => {
    const monthStart = getCurrentMonthStart();
    const monthEnd = getCurrentMonthEnd();
    return allExpenses
      .filter((e) => e.expenseDate >= monthStart && e.expenseDate <= monthEnd)
      .reduce((sum, e) => sum + e.netAmount, 0);
  }, [allExpenses]);

  // ========== My Wallet View Data ==========
  // Use Supabase-loaded projects
  const allProjects = useMemo(() => projects, [projects]);

  // Transform my wallet expenses from Supabase data
  const myWalletExpenses = useMemo(() => {
    if (!myWallet) return [];
    const walletHolderName = myWallet.user_name || '';
    return myWalletExpensesDb.map(exp => transformExpenseForDisplay(exp, companies, projects, walletHolderName));
  }, [myWallet, myWalletExpensesDb, companies, projects]);

  // Transform my wallet reimbursements from Supabase data
  const myWalletReimbursements = useMemo(() => {
    return myWalletReimbursementsDb.map((r) => ({
      id: r.id,
      reimbursementNumber: r.reimbursement_number || '',
      walletId: r.wallet_id,
      walletHolderName: myWallet?.user_name || '',
      expenseId: r.expense_id || '',
      companyId: r.company_id || '',
      companyName: '',
      amount: Number(r.amount) || 0,
      finalAmount: Number(r.final_amount) || Number(r.amount) || 0,
      status: r.status as 'pending' | 'approved' | 'paid' | 'rejected',
      createdAt: r.created_at || '',
      createdBy: r.created_by || '',
      updatedAt: r.updated_at || '',
      notes: '',
      expenseNumber: '',
      rejectionReason: r.rejection_reason || '',
    }));
  }, [myWalletReimbursementsDb, myWallet]);

  const myWalletTopUps = useMemo(
    () => (myWallet ? getTopUpsByWallet(myWallet.id) : []),
    [myWallet, refreshKey]
  );

  // Apply expense filters for My Wallet view
  const filteredMyWalletExpenses = useMemo(() => {
    return myWalletExpenses.filter((expense) => {
      if (myWalletExpenseFilters.dateFrom && expense.expenseDate < myWalletExpenseFilters.dateFrom) {
        return false;
      }
      if (myWalletExpenseFilters.dateTo && expense.expenseDate > myWalletExpenseFilters.dateTo) {
        return false;
      }
      if (myWalletExpenseFilters.status && expense.status !== myWalletExpenseFilters.status) {
        return false;
      }
      if (myWalletExpenseFilters.companyId && expense.companyId !== myWalletExpenseFilters.companyId) {
        return false;
      }
      if (myWalletExpenseFilters.projectId && expense.projectId !== myWalletExpenseFilters.projectId) {
        return false;
      }
      return true;
    });
  }, [myWalletExpenses, myWalletExpenseFilters]);

  // Apply reimbursement filters for My Wallet view
  const filteredMyWalletReimbursements = useMemo(() => {
    return myWalletReimbursements.filter((reimbursement) => {
      if (myWalletReimbursementFilters.dateFrom && reimbursement.createdAt.split('T')[0] < myWalletReimbursementFilters.dateFrom) {
        return false;
      }
      if (myWalletReimbursementFilters.dateTo && reimbursement.createdAt.split('T')[0] > myWalletReimbursementFilters.dateTo) {
        return false;
      }
      if (myWalletReimbursementFilters.status && reimbursement.status !== myWalletReimbursementFilters.status) {
        return false;
      }
      if (myWalletReimbursementFilters.companyId && reimbursement.companyId !== myWalletReimbursementFilters.companyId) {
        return false;
      }
      return true;
    });
  }, [myWalletReimbursements, myWalletReimbursementFilters]);

  // Calculate stats for My Wallet
  const myWalletPendingReimbursement = useMemo(
    () => (myWallet ? getPendingAmountForWallet(myWallet.id) : 0),
    [myWallet, refreshKey]
  );

  const myWalletMonthlyExpenses = useMemo(() => {
    if (!myWallet) return 0;
    const now = new Date();
    return getMonthlyExpensesForWallet(myWallet.id, now.getFullYear(), now.getMonth() + 1);
  }, [myWallet, refreshKey]);

  // Build transaction history for My Wallet
  // Note: Transaction history still uses mock data for expenses/topups/reimbursements
  // until those are fully migrated to Supabase
  const myWalletExpensesMock = useMemo(
    () => (myWallet ? getExpensesByWallet(myWallet.id) : []),
    [myWallet, refreshKey]
  );
  const myWalletTransactionHistory = useMemo(
    () => buildTransactionHistory(myWalletExpensesMock, myWalletTopUps, myWalletReimbursements),
    [myWalletExpensesMock, myWalletTopUps, myWalletReimbursements]
  );

  // Handle expense creation in My Wallet view - Save to Supabase
  const handleCreateMyExpense = useCallback(
    async (expenseData: SimplifiedExpenseInput) => {
      if (!transformedMyWallet || !myWallet) {
        alert('Wallet not available. Please refresh and try again.');
        return;
      }

      // Note: Company is NOT required at submission time
      // Accountant will assign the company when reviewing/approving the claim
      const companyId = expenseData.companyId || null; // Don't fall back to wallet company
      if (!expenseData.projectId) {
        alert('Please select a project for this expense.');
        console.error('Failed to create expense: No project_id specified');
        return;
      }
      if (!expenseData.walletId) {
        alert('Wallet ID is missing. Please refresh and try again.');
        console.error('Failed to create expense: No wallet_id specified');
        return;
      }
      if (!expenseData.expenseDate) {
        alert('Please select an expense date.');
        console.error('Failed to create expense: No expense_date specified');
        return;
      }

      try {
        // Build the payload with validated data
        // Note: created_by should be the user's UUID, not their name
        const expensePayload = {
          wallet_id: expenseData.walletId,
          company_id: companyId,
          expense_date: expenseData.expenseDate,
          description: expenseData.description || null,
          project_id: expenseData.projectId,
          amount: expenseData.amount,
          status: 'submitted' as const,
          created_by: myWallet.user_id || null,  // Use user_id from wallet, not the name
          attachments: expenseData.attachments ? JSON.stringify(expenseData.attachments) : '[]',
        };
        // Create the expense in Supabase
        const expense = await pettyCashApi.createExpenseWithNumber(expensePayload);

        // Update local state with the new expense
        setMyWalletExpensesDb(prev => [expense, ...prev]);

        // Create reimbursement in Supabase
        const reimbursementPayload = {
          expense_id: expense.id,
          wallet_id: expense.wallet_id,
          company_id: expense.company_id,
          amount: expense.amount || 0,
          adjustment_amount: null,
          adjustment_reason: null,
          final_amount: expense.amount || 0,
          status: 'pending' as const,
          bank_account_id: null,
          payment_date: null,
          payment_reference: null,
          approved_by: null,
          rejected_by: null,
          rejection_reason: null,
          bank_feed_line_id: null,
          created_by: myWallet.user_id || null,
        };
        const reimbursement = await pettyCashApi.createReimbursementWithNumber(reimbursementPayload);

        // Send notification to accountant (using mock notification system for now)
        notifyAccountantNewReimbursement(
          reimbursement.id,
          reimbursement.reimbursement_number,
          transformedMyWallet.userName,
          expense.amount || 0
        );

        // Close form and refresh
        setShowExpenseForm(false);
        setRefreshKey((prev) => prev + 1);
      } catch (error: unknown) {
        const supabaseError = error as { message?: string };
        const errorMessage = supabaseError.message || (error instanceof Error ? error.message : 'Unknown error');
        console.error('Failed to create expense:', error);
        alert(`Failed to create expense: ${errorMessage}`);
      }
    },
    [transformedMyWallet, myWallet, companies]
  );

  // Handle expense creation for any wallet (Add Expense tab)
  const handleCreateExpenseForWallet = useCallback(
    async (expenseData: SimplifiedExpenseInput) => {
      const wallet = allWalletsDb.find(w => w.id === addExpenseWalletId);
      if (!wallet) {
        alert('Please select a wallet first.');
        return;
      }
      if (!expenseData.projectId) {
        alert('Please select a project for this expense.');
        return;
      }
      if (!expenseData.expenseDate) {
        alert('Please select an expense date.');
        return;
      }

      try {
        const expensePayload = {
          wallet_id: wallet.id,
          company_id: expenseData.companyId || null,
          expense_date: expenseData.expenseDate,
          description: expenseData.description || null,
          project_id: expenseData.projectId,
          amount: expenseData.amount,
          status: 'submitted' as const,
          created_by: wallet.user_id || null,
          attachments: expenseData.attachments ? JSON.stringify(expenseData.attachments) : '[]',
        };
        const expense = await pettyCashApi.createExpenseWithNumber(expensePayload);

        const reimbursementPayload = {
          expense_id: expense.id,
          wallet_id: expense.wallet_id,
          company_id: expense.company_id,
          amount: expense.amount || 0,
          adjustment_amount: null,
          adjustment_reason: null,
          final_amount: expense.amount || 0,
          status: 'pending' as const,
          bank_account_id: null,
          payment_date: null,
          payment_reference: null,
          approved_by: null,
          rejected_by: null,
          rejection_reason: null,
          bank_feed_line_id: null,
          created_by: wallet.user_id || null,
        };
        const reimbursement = await pettyCashApi.createReimbursementWithNumber(reimbursementPayload);

        const walletTransformed = transformWalletWithCalculatedBalance(wallet as SupabaseWalletWithBalance);
        notifyAccountantNewReimbursement(
          reimbursement.id,
          reimbursement.reimbursement_number,
          walletTransformed.userName,
          expense.amount || 0
        );

        alert(`Expense created for ${walletTransformed.userName}'s wallet.`);
        setAddExpenseWalletId('');
        setRefreshKey((prev) => prev + 1);
      } catch (error: unknown) {
        const supabaseError = error as { message?: string };
        const errorMessage = supabaseError.message || (error instanceof Error ? error.message : 'Unknown error');
        console.error('Failed to create expense:', error);
        alert(`Failed to create expense: ${errorMessage}`);
      }
    },
    [addExpenseWalletId, allWalletsDb]
  );

  // Handle resubmit for rejected claims - opens form to EDIT the same expense
  const handleResubmitClaim = useCallback(
    (reimbursement: PettyCashReimbursement) => {
      // Check if already resubmitted AND not rejected again
      // If status is 'rejected', allow resubmit regardless (supports multiple reject cycles)
      if (resubmittedIds.has(reimbursement.id) && reimbursement.status !== 'rejected') {
        alert('This claim has already been resubmitted. Please check your pending claims.');
        return;
      }

      if (!transformedMyWallet || !myWallet) {
        alert('Wallet not available. Please refresh and try again.');
        return;
      }

      // Find the original expense by ID
      const originalExpense = myWalletExpensesDb.find((e) => e.id === reimbursement.expenseId);
      if (!originalExpense) {
        alert('Original expense not found. Please refresh and try again.');
        return;
      }

      // Set the expense ID for editing (NOT creating new)
      setEditingExpenseId(originalExpense.id);

      // Look up project name from projects array
      const project = projects.find(p => p.id === originalExpense.project_id);

      // Set pre-filled data and open the form for user review
      setResubmitPrefilledData({
        projectId: originalExpense.project_id || '',
        projectName: project?.name || '',
        expenseDate: originalExpense.expense_date,
        amount: originalExpense.amount || 0,
        description: originalExpense.description || '',
        originalReimbursementId: reimbursement.id,
      });
      setShowExpenseForm(true);
    },
    [transformedMyWallet, myWallet, myWalletExpensesDb, resubmittedIds, projects]
  );

  // Handle expense form save - used for both new claims and resubmits
  const handleExpenseFormSave = useCallback(
    async (expenseData: SimplifiedExpenseInput) => {
      try {
        if (editingExpenseId) {
          // RESUBMIT: Update existing expense and create new reimbursement
          const { expense: updatedExpense, reimbursement: newReimbursement } = await pettyCashApi.resubmitExpense(editingExpenseId, {
            amount: expenseData.amount,
            description: expenseData.description,
            projectId: expenseData.projectId,
            projectName: expenseData.projectName,
            expenseDate: expenseData.expenseDate,
          });

          // Update local state: replace the old expense with the updated one
          setMyWalletExpensesDb(prev => prev.map(e =>
            e.id === editingExpenseId ? updatedExpense : e
          ));

          // Add the new reimbursement to local state
          setMyWalletReimbursementsDb(prev => [newReimbursement, ...prev]);

          // Mark the original reimbursement as resubmitted to prevent duplicates in UI
          if (resubmitPrefilledData?.originalReimbursementId) {
            setResubmittedIds((prev) => new Set(prev).add(resubmitPrefilledData.originalReimbursementId));
          }

          // Clear editing state
          setEditingExpenseId(null);
          setResubmitPrefilledData(null);

          // Close form and refresh
          setShowExpenseForm(false);
          setRefreshKey((prev) => prev + 1);
        } else {
          // NEW: Create new expense and reimbursement (existing logic)
          // Clear pre-filled data
          setResubmitPrefilledData(null);
          await handleCreateMyExpense(expenseData);
        }
      } catch (error) {
        console.error('Error saving expense:', error);
        alert('Failed to save expense. Please try again.');
      }
    },
    [editingExpenseId, resubmitPrefilledData, handleCreateMyExpense]
  );

  // Handle expense form cancel
  const handleExpenseFormCancel = useCallback(() => {
    setShowExpenseForm(false);
    setResubmitPrefilledData(null);
    setEditingExpenseId(null);
  }, []);

  // ========== End My Wallet View Data ==========

  // Handle top-up
  const handleTopUp = useCallback(
    (data: {
      walletId: string;
      walletHolderName: string;
      amount: number;
      companyId: string;
      companyName: string;
      bankAccountId: string;
      bankAccountName: string;
      topUpDate: string;
      reference?: string;
      notes?: string;
    }) => {
      // Create and immediately complete the top-up
      const topUp = createTopUp({
        ...data,
        createdBy: 'Manager',
      });

      // Complete the top-up
      completeTopUp(topUp.id, 'Manager', data.reference);

      // Add to wallet balance
      addToWallet(data.walletId, data.amount);

      // Close modal and refresh
      setShowTopUpModal(false);
      setSelectedWallet(null);
      setRefreshKey((prev) => prev + 1);
    },
    []
  );

  // Handle reimbursement approval
  const handleApproveReimbursement = useCallback(
    async (
      reimbursementId: string,
      bankAccountId: string,
      bankAccountName: string,
      paymentDate: string,
      expenseAccountCode: string,
      companyId: string,
      vatType: VatType,
      vatRate: number,
      adjustmentAmount?: number,
      adjustmentReason?: string
    ) => {
      // Check if this is a Supabase reimbursement
      const isDbReimbursement = pendingReimbursements.some(r => r.id === reimbursementId);

      if (isDbReimbursement && user?.id) {
        try {
          // Approve with bank account info in Supabase (status becomes 'approved')
          // Note: Wallet credit happens later when batch is marked paid
          await pettyCashApi.approveReimbursement(
            reimbursementId,
            bankAccountId,
            user.id,
            companyId,
            adjustmentAmount,
            adjustmentReason
          );

          // Save accounting details to the petty cash expense record
          // This ensures Company, Expense Account, VAT settings are persisted
          if (selectedExpense?.id) {
            await pettyCashApi.updateExpense(selectedExpense.id, {
              company_id: companyId || null,
              expense_account_code: expenseAccountCode || null,
              accounting_vat_type: vatType || null,
              accounting_vat_rate: vatRate || 0,
              accounting_completed_by: user.id,
              accounting_completed_at: new Date().toISOString(),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);
          }
        } catch (error) {
          console.error('Failed to approve reimbursement:', error);
          alert('Failed to approve reimbursement. Please try again.');
          return;
        }
      } else {
        // Fall back to mock data handlers
        const approved = approveReimbursement(
          reimbursementId,
          'Manager',
          bankAccountId,
          bankAccountName,
          adjustmentAmount,
          adjustmentReason
        );

        if (approved) {
          // Process payment immediately for mock data
          processReimbursementPayment(approved.id, paymentDate, `PAY-${Date.now()}`);
          addToWallet(approved.walletId, approved.finalAmount);
        }
      }

      setSelectedReimbursement(null);
      setSelectedExpense(null);
      setRefreshKey((prev) => prev + 1);
    },
    [pendingReimbursements, user?.id, selectedExpense]
  );

  // Handle reimbursement rejection
  const handleRejectReimbursement = useCallback(
    async (reimbursementId: string, reason: string) => {
      // Check if this is a Supabase reimbursement
      const isDbReimbursement = pendingReimbursements.some(r => r.id === reimbursementId);

      if (isDbReimbursement && user?.id) {
        try {
          // Reject in Supabase - this also updates the expense status to 'rejected'
          await pettyCashApi.rejectReimbursement(reimbursementId, user.id, reason);
        } catch (error) {
          console.error('Failed to reject reimbursement:', error);
          alert('Failed to reject reimbursement. Please try again.');
          return;
        }
      } else {
        // Fall back to mock data handler
        rejectReimbursement(reimbursementId, 'Manager', reason);
      }

      setSelectedReimbursement(null);
      setSelectedExpense(null);
      setRefreshKey((prev) => prev + 1);
    },
    [pendingReimbursements, user?.id]
  );

  // Handle transfer from Transfer Summary - creates top-up and marks reimbursements as paid
  const handleTransfer = useCallback(
    async () => {
      if (selectedTransfers.size === 0) {
        alert('Please select at least one transfer group.');
        return;
      }

      setIsProcessingTransfer(true);

      try {
        // Process each selected transfer group
        for (const key of selectedTransfers) {
          const [walletId, bankAccountId] = key.split('::');

          // Find the corresponding group
          const walletGroup = transferSummary.find(wg => wg.walletId === walletId);
          const bankGroup = walletGroup?.bankAccountGroups.find(bg => bg.bankAccountId === bankAccountId);

          if (!walletGroup || !bankGroup) continue;

          const today = new Date().toISOString().split('T')[0];

          // Create a top-up for this wallet
          await pettyCashApi.createTopUp({
            wallet_id: walletId,
            amount: bankGroup.amount,
            company_id: bankGroup.companyId || null,
            bank_account_id: bankAccountId,
            top_up_date: today,
            reference: `Reimbursement transfer`,
            notes: `Transfer for ${bankGroup.reimbursementIds.length} approved reimbursement(s)`,
            status: 'completed',
            created_by: user?.id || null,
          });

          // Create a batch record and mark all reimbursements as paid
          const batch = await pettyCashApi.createBatch({
            reimbursementIds: bankGroup.reimbursementIds,
            companyId: bankGroup.companyId || '',
            walletHolderName: walletGroup.holderName,
            walletHolderId: null,
            bankAccountId: bankAccountId,
            createdBy: user?.id || '',
          });
          await pettyCashApi.markBatchPaid(batch.id, today);
        }

        // Clear selection and refresh
        setSelectedTransfers(new Set());
        setRefreshKey((prev) => prev + 1);
        alert('Transfer completed successfully! Wallet balances have been updated.');
      } catch (error) {
        console.error('Failed to process transfer:', error);
        alert('Failed to process transfer. Please try again.');
      } finally {
        setIsProcessingTransfer(false);
      }
    },
    [selectedTransfers, transferSummary, user?.id]
  );

  // Toggle transfer selection
  const toggleTransferSelection = useCallback((walletId: string, bankAccountId: string) => {
    const key = `${walletId}::${bankAccountId}`;
    setSelectedTransfers(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Calculate selected transfer amount
  const selectedTransferAmount = useMemo(() => {
    let total = 0;
    for (const key of selectedTransfers) {
      const [walletId, bankAccountId] = key.split('::');
      const walletGroup = transferSummary.find(wg => wg.walletId === walletId);
      const bankGroup = walletGroup?.bankAccountGroups.find(bg => bg.bankAccountId === bankAccountId);
      if (bankGroup) {
        total += bankGroup.amount;
      }
    }
    return total;
  }, [selectedTransfers, transferSummary]);

  // Handle receipt status checkbox change
  const handleReceiptStatusChange = useCallback(
    (transaction: PettyCashTransaction, newStatus: ReceiptStatus) => {
      if (newStatus === 'pending') {
        // Unchecking - show confirmation dialog
        setPendingReceiptUncheck(transaction);
        setShowReceiptConfirmDialog(true);
      } else {
        // Checking - update immediately
        updateReceiptStatus(transaction.id, newStatus);
        setRefreshKey((prev) => prev + 1);
      }
    },
    []
  );

  // Confirm receipt status uncheck
  const confirmReceiptUncheck = useCallback(() => {
    if (pendingReceiptUncheck) {
      updateReceiptStatus(pendingReceiptUncheck.id, 'pending');
      setRefreshKey((prev) => prev + 1);
    }
    setShowReceiptConfirmDialog(false);
    setPendingReceiptUncheck(null);
  }, [pendingReceiptUncheck]);

  // Cancel receipt status uncheck
  const cancelReceiptUncheck = useCallback(() => {
    setShowReceiptConfirmDialog(false);
    setPendingReceiptUncheck(null);
  }, []);

  // Open reimbursement for review
  const handleViewReimbursement = useCallback(
    (reimbursement: PettyCashReimbursement) => {
      // First try to find the expense in Supabase data
      const dbExpense = allExpensesDb.find((e) => e.id === reimbursement.expenseId);

      if (dbExpense) {
        try {
          // Transform Supabase expense to frontend format
          const company = companies.find((c) => c.id === dbExpense.company_id);
          const project = projects.find((p) => p.id === dbExpense.project_id);
          const wallet = allWalletsDb.find((w) => w.id === dbExpense.wallet_id);

          // Safely parse attachments - could be string, array, or null
          let parsedAttachments: Attachment[] = [];
          if (dbExpense.attachments) {
            if (typeof dbExpense.attachments === 'string') {
              try {
                parsedAttachments = JSON.parse(dbExpense.attachments);
              } catch {
                console.warn('Failed to parse attachments JSON:', dbExpense.attachments);
                parsedAttachments = [];
              }
            } else if (Array.isArray(dbExpense.attachments)) {
              parsedAttachments = dbExpense.attachments as Attachment[];
            }
          }

          const expenseAmount = dbExpense.amount || 0;
          const transformedExpense: PettyCashExpense = {
            id: dbExpense.id,
            expenseNumber: dbExpense.expense_number || '',
            walletId: dbExpense.wallet_id,
            walletHolderName: wallet?.user_name || '',
            companyId: dbExpense.company_id || '',
            companyName: company?.name || '',
            expenseDate: dbExpense.expense_date,
            description: dbExpense.description || '',
            amount: expenseAmount,
            projectId: dbExpense.project_id,
            projectName: project?.name || '',
            receiptStatus: 'pending' as const,
            attachments: parsedAttachments,
            lineItems: [],
            // For simplified expenses, all totals equal the amount
            subtotal: expenseAmount,
            vatAmount: 0,
            totalAmount: expenseAmount,
            whtAmount: 0,
            netAmount: expenseAmount,
            status: (dbExpense.status as ExpenseStatus) || 'submitted',
            createdBy: dbExpense.created_by || '',
            createdAt: dbExpense.created_at,
            updatedAt: dbExpense.updated_at || dbExpense.created_at,
            // Accounting details (filled by accountant during approval)
            expenseAccountCode: dbExpense.expense_account_code || undefined,
            accountingVatType: (dbExpense.accounting_vat_type as 'include' | 'exclude' | 'no_vat') || undefined,
            accountingVatRate: dbExpense.accounting_vat_rate ?? undefined,
            accountingCompletedBy: dbExpense.accounting_completed_by || undefined,
            accountingCompletedAt: dbExpense.accounting_completed_at || undefined,
          };

          setSelectedReimbursement(reimbursement);
          setSelectedExpense(transformedExpense);
          return;
        } catch (error) {
          console.error('Error transforming expense:', error);
          // Fall through to mock data
        }
      }

      // Fall back to mock data if not found in Supabase
      const mockExpense = getExpenseById(reimbursement.expenseId);
      if (mockExpense) {
        setSelectedReimbursement(reimbursement);
        setSelectedExpense(mockExpense);
      } else {
        // Create a minimal expense object from reimbursement data to allow modal to open
        console.warn('Expense not found for reimbursement, using minimal data:', reimbursement.id);
        const reimbAmount = reimbursement.amount || 0;
        const minimalExpense: PettyCashExpense = {
          id: reimbursement.expenseId || reimbursement.id,
          expenseNumber: reimbursement.expenseNumber || '',
          walletId: reimbursement.walletId,
          walletHolderName: reimbursement.walletHolderName,
          companyId: reimbursement.companyId || '',
          companyName: reimbursement.companyName || '',
          expenseDate: reimbursement.createdAt.split('T')[0] || new Date().toISOString().split('T')[0],
          description: '',
          amount: reimbAmount,
          projectId: '',
          projectName: '',
          receiptStatus: 'pending' as const,
          attachments: [],
          lineItems: [],
          // For simplified expenses, all totals equal the amount
          subtotal: reimbAmount,
          vatAmount: 0,
          totalAmount: reimbAmount,
          whtAmount: 0,
          netAmount: reimbAmount,
          status: 'submitted' as ExpenseStatus,
          createdBy: (reimbursement as PettyCashReimbursement & { createdBy?: string }).createdBy || '',
          createdAt: reimbursement.createdAt,
          updatedAt: reimbursement.updatedAt,
        };
        setSelectedReimbursement(reimbursement);
        setSelectedExpense(minimalExpense);
      }
    },
    [allExpensesDb, companies, projects, allWalletsDb]
  );

  // Status badge helper
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

  // Wallet table columns
  const walletColumns = [
    { key: 'userName', header: 'Holder Name', primary: true },
    { key: 'walletName', header: 'Wallet' },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right' as const,
      render: (row: TransformedWallet) => {
        const isLow =
          row.lowBalanceThreshold && row.balance <= row.lowBalanceThreshold;
        return (
          <span className={isLow ? 'text-orange-600 font-medium' : ''}>
            {formatCurrency(row.balance, row.currency as 'THB' | 'EUR' | 'USD' | 'SGD' | 'GBP' | 'AED')}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      hideOnMobile: true,
      align: 'center' as const,
      render: (row: TransformedWallet) => (
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(row.status)}`}>
          {getStatusLabel(row.status)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: (row: TransformedWallet) => (
        <button
          onClick={() => {
            // Convert to PettyCashWallet format for the modal
            setSelectedWallet({
              id: row.id,
              walletName: row.walletName,
              userId: row.userId || '',
              userName: row.userName,
              userRole: '',
              userEmail: '',
              companyId: row.companyId,
              companyName: '',
              balance: row.balance,
              currency: row.currency as 'THB' | 'EUR' | 'USD' | 'SGD' | 'GBP' | 'AED',
              status: (row.status === 'inactive' ? 'closed' : row.status) as 'active' | 'closed',
              balanceLimit: row.balanceLimit || 0,
              lowBalanceThreshold: row.lowBalanceThreshold || 0,
              createdAt: '',
              updatedAt: '',
            });
            setShowTopUpModal(true);
          }}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100"
        >
          <ArrowUpCircle className="h-3 w-3" />
          Top-up
        </button>
      ),
    },
  ];

  // Pending reimbursement columns
  const reimbursementColumns = [
    { key: 'reimbursementNumber', header: 'Number', primary: true },
    { key: 'walletHolderName', header: 'Holder' },
    { key: 'companyName', header: 'Company', hideOnMobile: true },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right' as const,
      render: (row: PettyCashReimbursement) => formatCurrency(row.amount),
    },
    {
      key: 'createdAt',
      header: 'Requested',
      hideOnMobile: true,
      render: (row: PettyCashReimbursement) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: (row: PettyCashReimbursement) => (
        <button
          onClick={() => handleViewReimbursement(row)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#5A7A8F] bg-[#5A7A8F]/10 rounded hover:bg-[#5A7A8F]/20"
        >
          <Eye className="h-3 w-3" />
          Review
        </button>
      ),
    },
  ];

  // Transaction type helpers
  const getTransactionTypeLabel = (type: TransactionType) => {
    const labels: Record<TransactionType, string> = {
      expense: 'Expense',
      topup: 'Top-up',
      reimbursement_paid: 'Reimbursement',
    };
    return labels[type];
  };

  const getTransactionTypeIcon = (type: TransactionType) => {
    switch (type) {
      case 'expense':
        return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
      case 'topup':
        return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      case 'reimbursement_paid':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
    }
  };

  // Transaction table columns
  const transactionColumns = [
    {
      key: 'type',
      header: 'Type',
      width: '115px',
      render: (row: PettyCashTransaction) => (
        <div className="flex items-center gap-1.5">
          {getTransactionTypeIcon(row.type)}
          <span className="text-xs">{getTransactionTypeLabel(row.type)}</span>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      width: '85px',
      render: (row: PettyCashTransaction) => (
        <span className="text-xs whitespace-nowrap">{formatDate(row.date)}</span>
      ),
    },
    {
      key: 'referenceNumber',
      header: 'Reference',
      primary: true,
      render: (row: PettyCashTransaction) => {
        // Only make clickable for expense type
        if (row.type === 'expense') {
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/accounting/manager/petty-cash-management/expenses/${row.id}`);
              }}
              className="text-[#5A7A8F] hover:underline font-medium text-sm"
            >
              {row.referenceNumber}
            </button>
          );
        }
        return <span className="text-sm">{row.referenceNumber}</span>;
      },
    },
    { key: 'walletHolderName', header: 'Holder', hideOnMobile: true },
    { key: 'companyName', header: 'Company', hideOnMobile: true },
    {
      key: 'description',
      header: 'Description',
      hideOnMobile: true,
      render: (row: PettyCashTransaction) => (
        <span className="text-sm text-gray-600 truncate max-w-[150px] block">
          {row.description}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right' as const,
      render: (row: PettyCashTransaction) => (
        <span className={row.amount >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
          {row.amount >= 0 ? '+' : ''}{formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: 'receiptStatus',
      header: 'Receipt',
      hideOnMobile: true,
      align: 'center' as const,
      render: (row: PettyCashTransaction) => {
        // Only show checkbox for expense type
        if (row.type !== 'expense') {
          return (
            <span className="text-gray-400">
              <Minus className="h-4 w-4 mx-auto" />
            </span>
          );
        }

        const isChecked = row.receiptStatus === 'original_received';

        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReceiptStatusChange(
                row,
                isChecked ? 'pending' : 'original_received'
              );
            }}
            className={`p-1 rounded transition-colors ${
              isChecked
                ? 'text-green-600 hover:bg-green-50'
                : 'text-gray-400 hover:bg-gray-100'
            }`}
            title={isChecked ? 'Receipt received - click to uncheck' : 'Receipt pending - click to mark as received'}
          >
            {isChecked ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <Square className="h-5 w-5" />
            )}
          </button>
        );
      },
    },
  ];

  // ========== My Wallet View Table Columns ==========
  // Type for transformed expense display
  type ExpenseDisplay = ReturnType<typeof transformExpenseForDisplay>;

  // Table columns for expenses in My Wallet view
  const myExpenseColumns = [
    {
      key: 'expenseNumber',
      header: 'Number',
      primary: true,
      render: (row: ExpenseDisplay) => (
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
      render: (row: ExpenseDisplay) => formatDate(row.expenseDate),
    },
    { key: 'companyName', header: 'Company' },
    { key: 'projectName', header: 'Project', hideOnMobile: true },
    { key: 'description', header: 'Description', hideOnMobile: true },
    {
      key: 'netAmount',
      header: 'Amount',
      align: 'right' as const,
      render: (row: ExpenseDisplay) => formatCurrency(row.netAmount),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      render: (row: ExpenseDisplay) => (
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

  // Table columns for reimbursements in My Wallet view
  const myReimbursementColumns = [
    { key: 'reimbursementNumber', header: 'Number', primary: true },
    { key: 'expenseNumber', header: 'Expense' },
    { key: 'companyName', header: 'Company', hideOnMobile: true },
    {
      key: 'finalAmount',
      header: 'Amount',
      align: 'right' as const,
      render: (row: PettyCashReimbursement) => formatCurrency(row.finalAmount),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      render: (row: PettyCashReimbursement) => (
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
      key: 'rejectionReason',
      header: 'Rejection Reason',
      hideOnMobile: true,
      render: (row: PettyCashReimbursement) => (
        row.status === 'rejected' && row.rejectionReason ? (
          <span className="text-sm text-red-600">{row.rejectionReason}</span>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      key: 'createdAt',
      header: 'Requested',
      hideOnMobile: true,
      render: (row: PettyCashReimbursement) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: (row: PettyCashReimbursement) => (
        row.status === 'rejected' ? (
          <button
            onClick={() => handleResubmitClaim(row)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded hover:bg-amber-200"
          >
            <RefreshCw className="h-3 w-3" />
            Edit & Resubmit
          </button>
        ) : null
      ),
    },
  ];

  // Table columns for transaction history in My Wallet view
  const myHistoryColumns = [
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

  // Filter options for My Wallet view
  const expenseStatusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
  ];

  const myReimbursementStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'paid', label: 'Paid' },
    { value: 'rejected', label: 'Rejected' },
  ];
  // ========== End My Wallet View Table Columns ==========

  // Loading state
  if (authLoading || myWalletLoading || isLoadingData || isLoadingAllWallets) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#5A7A8F] mx-auto mb-4" />
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Header with View Toggle */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Petty Cash Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {viewMode === 'all-wallets'
                ? 'Monitor all petty cash wallets, approve reimbursements, and manage top-ups'
                : viewMode === 'add-expense'
                ? 'Add an expense on behalf of any wallet holder'
                : 'Manage your personal petty cash wallet'
              }
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setViewMode('all-wallets')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'all-wallets'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                All Wallets
              </span>
            </button>
            {hasOwnWallet && (
              <button
                onClick={() => setViewMode('my-wallet')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'my-wallet'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  My Wallet
                </span>
              </button>
            )}
            <button
              onClick={() => setViewMode('add-expense')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'add-expense'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Expense
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========== MY WALLET VIEW ========== */}
      {viewMode === 'my-wallet' && transformedMyWallet && (
        <>
          {/* Info Banner */}
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Wallet className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Personal Petty Cash Wallet
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  This is your personal wallet. Submit expenses and track reimbursement status here.
                </p>
              </div>
            </div>
          </div>

          {/* Rejected Claims Alert - Show prominently when there are rejected claims */}
          {myWalletReimbursements.filter(r => r.status === 'rejected').length > 0 && (
            <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">
                    Action Required: {myWalletReimbursements.filter(r => r.status === 'rejected').length} Claim{myWalletReimbursements.filter(r => r.status === 'rejected').length !== 1 ? 's' : ''} Rejected
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    Your claim{myWalletReimbursements.filter(r => r.status === 'rejected').length !== 1 ? 's have' : ' has'} been rejected by the accountant. Please review the reason and resubmit if needed.
                  </p>
                  <div className="mt-3 space-y-2">
                    {myWalletReimbursements
                      .filter(r => r.status === 'rejected')
                      .map((r) => (
                        <div key={r.id} className="flex items-center justify-between p-2 bg-white rounded border border-red-200">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{r.reimbursementNumber}</span>
                            <span className="text-sm text-gray-500 ml-2">• {formatCurrency(r.amount)}</span>
                            {r.rejectionReason && (
                              <p className="text-xs text-red-600 mt-0.5">Reason: {r.rejectionReason}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleResubmitClaim(r)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Edit & Resubmit
                          </button>
                        </div>
                      ))}
                  </div>
                  <button
                    onClick={() => setMyWalletTab('reimbursements')}
                    className="mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline"
                  >
                    View all in Claim History →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Wallet Summary Card */}
          <div className="mb-6">
            <WalletSummaryCard
              wallet={transformedMyWallet}
              pendingReimbursement={myWalletPendingReimbursement}
              monthlyExpenses={myWalletMonthlyExpenses}
            />
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <KPICard
              title="Total Claims"
              value={myWalletExpenses.length}
              icon={Receipt}
              subtitle="All time"
            />
            <KPICard
              title="Submitted"
              value={myWalletExpenses.filter((e) => e.status === 'submitted').length}
              icon={FileText}
              variant="default"
              subtitle="Awaiting review"
            />
            <KPICard
              title="This Month"
              value={formatCurrency(myWalletMonthlyExpenses)}
              icon={TrendingDown}
              subtitle="Claims"
            />
            <KPICard
              title="Pending Claims"
              value={myWalletReimbursements.filter((r) => r.status === 'pending').length}
              icon={Clock}
              variant={
                myWalletReimbursements.filter((r) => r.status === 'pending').length > 0
                  ? 'warning'
                  : 'default'
              }
              subtitle="Awaiting approval"
            />
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <button
              onClick={() => setShowExpenseForm(true)}
              disabled={myWallet?.status === 'closed'}
              className="inline-flex items-center gap-2 rounded-lg bg-[#5A7A8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a6a7f] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              New Claim
            </button>
            {myWallet?.status === 'closed' && (
              <span className="ml-3 text-sm text-red-600">
                Your wallet is closed. Contact your manager.
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex gap-6">
              {[
                { id: 'expenses', label: 'My Claims', icon: Receipt, badge: 0 },
                { id: 'reimbursements', label: 'Claim History', icon: Clock, badge: myWalletReimbursements.filter(r => r.status === 'rejected').length },
                { id: 'history', label: 'Transaction History', icon: FileText, badge: 0 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMyWalletTab(tab.id as typeof myWalletTab)}
                  className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                    myWalletTab === tab.id
                      ? 'border-[#5A7A8F] text-[#5A7A8F]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {myWalletTab === 'expenses' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                My Expenses
              </h3>
              <ExpenseFilters
                filters={myWalletExpenseFilters}
                onFilterChange={(updates) => setMyWalletExpenseFilters((prev) => ({ ...prev, ...updates }))}
                onClear={() => setMyWalletExpenseFilters(initialMyWalletFilters)}
                statusOptions={expenseStatusOptions}
                statusLabel="Status"
                projects={allProjects}
                companies={companies}
              />
              <DataTable
                columns={myExpenseColumns}
                data={filteredMyWalletExpenses}
                emptyMessage="No expenses recorded yet"
              />
            </div>
          )}

          {myWalletTab === 'reimbursements' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Reimbursement Requests
              </h3>
              <ExpenseFilters
                filters={myWalletReimbursementFilters}
                onFilterChange={(updates) => setMyWalletReimbursementFilters((prev) => ({ ...prev, ...updates }))}
                onClear={() => setMyWalletReimbursementFilters(initialMyWalletFilters)}
                statusOptions={myReimbursementStatusOptions}
                statusLabel="Status"
                projects={projects}
                companies={companies}
              />
              <DataTable
                columns={myReimbursementColumns}
                data={filteredMyWalletReimbursements}
                emptyMessage="No reimbursement requests"
              />

              {/* Reimbursement Status Summary */}
              {myWalletReimbursements.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Status Summary
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['pending', 'approved', 'paid', 'rejected'].map((status) => {
                      const count = myWalletReimbursements.filter(
                        (r) => r.status === status
                      ).length;
                      const amount = myWalletReimbursements
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

          {myWalletTab === 'history' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Transaction History
              </h3>
              <DataTable
                columns={myHistoryColumns}
                data={myWalletTransactionHistory}
                emptyMessage="No transactions yet"
              />
            </div>
          )}

          {/* Expense Form Modal */}
          {showExpenseForm && transformedMyWallet && (
            <ExpenseForm
              walletId={transformedMyWallet.id}
              walletHolderName={transformedMyWallet.userName}
              onSave={handleExpenseFormSave}
              onCancel={handleExpenseFormCancel}
              initialData={resubmitPrefilledData ? {
                projectId: resubmitPrefilledData.projectId,
                expenseDate: resubmitPrefilledData.expenseDate,
                amount: resubmitPrefilledData.amount,
                description: resubmitPrefilledData.description,
              } : undefined}
              isResubmit={!!resubmitPrefilledData}
            />
          )}
        </>
      )}

      {/* ========== ADD EXPENSE VIEW ========== */}
      {viewMode === 'add-expense' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <Receipt className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Add Expense on Behalf
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Select a wallet and submit an expense on behalf of the wallet holder. The expense will appear in their wallet and create a reimbursement claim.
                </p>
              </div>
            </div>
          </div>

          {/* Wallet Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Wallet</label>
            <select
              value={addExpenseWalletId}
              onChange={(e) => setAddExpenseWalletId(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
            >
              <option value="">— Select a wallet —</option>
              {allWalletsDb
                .filter(w => w.status === 'active')
                .map(w => (
                  <option key={w.id} value={w.id}>
                    {w.wallet_name} ({w.user_name})
                  </option>
                ))}
            </select>
          </div>

          {/* Selected Wallet Info */}
          {addExpenseWallet && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 max-w-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{addExpenseWallet.walletName}</p>
                  <p className="text-xs text-gray-500">Holder: {addExpenseWallet.userName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(addExpenseWallet.balance, addExpenseWallet.currency)}
                  </p>
                  <p className="text-xs text-gray-500">Balance</p>
                </div>
              </div>
            </div>
          )}

          {/* Expense Form */}
          {addExpenseWalletId ? (
            <ExpenseForm
              walletId={addExpenseWalletId}
              walletHolderName={addExpenseWallet?.userName || ''}
              onSave={handleCreateExpenseForWallet}
              onCancel={() => setAddExpenseWalletId('')}
            />
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Select a wallet above to add an expense</p>
            </div>
          )}
        </div>
      )}

      {/* ========== ALL WALLETS VIEW ========== */}
      {viewMode === 'all-wallets' && (
        <>
          {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KPICard
          title="Total Outstanding"
          value={formatCurrency(totalBalance)}
          icon={Wallet}
          variant="success"
          subtitle="Across all wallets"
        />
        <KPICard
          title="Pending Claims"
          value={pendingStats.count}
          icon={Clock}
          variant={pendingStats.count > 0 ? 'warning' : 'default'}
          subtitle={formatCurrency(pendingStats.amount)}
        />
        <KPICard
          title="Low Balance Wallets"
          value={lowBalanceWallets.length}
          icon={AlertTriangle}
          variant={lowBalanceWallets.length > 0 ? 'danger' : 'default'}
          subtitle="Need attention"
        />
        <KPICard
          title="This Month Expenses"
          value={formatCurrency(monthlyExpenses)}
          icon={TrendingDown}
          subtitle="All holders"
        />
      </div>

      {/* Low Balance Alert */}
      {lowBalanceWallets.length > 0 && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-orange-900">
                Low Balance Alert
              </h3>
              <p className="text-sm text-orange-700 mt-1">
                The following wallets have low balance:{' '}
                {lowBalanceWallets.map((w) => w.userName).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => router.push('/accounting/manager/petty-cash-management/reimbursements')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] shadow-sm"
        >
          <CheckCircle className="h-4 w-4" />
          Review Claims
          {pendingStats.count > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-white/20 rounded-full">
              {pendingStats.count}
            </span>
          )}
        </button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pending Claims */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Pending Claims
            </h3>
            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
              {pendingReimbursements.length} pending
            </span>
          </div>
          <div className="p-4">
            {pendingReimbursements.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No pending claims
              </p>
            ) : (
              <div className="space-y-3">
                {pendingReimbursements.slice(0, 5).map((rmb) => (
                  <div
                    key={rmb.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleViewReimbursement(rmb)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {rmb.walletHolderName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {rmb.companyName} · {formatDate(rmb.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(rmb.amount)}
                      </p>
                      <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
                    </div>
                  </div>
                ))}
                {pendingReimbursements.length > 5 && (
                  <button
                    onClick={() =>
                      router.push('/accounting/manager/petty-cash-management/reimbursements')
                    }
                    className="w-full text-center text-sm text-[#5A7A8F] hover:underline py-2"
                  >
                    View all {pendingReimbursements.length} pending claims
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Transfer Summary - Approved claims grouped by wallet and bank account */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Transfer Summary
            </h3>
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
              {approvedReimbursementCount} approved
            </span>
          </div>
          <div className="p-4">
            {isLoadingTransferSummary ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : transferSummary.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No pending transfers
              </p>
            ) : (
              <div className="space-y-4">
                {transferSummary.map((walletGroup) => (
                  <div
                    key={walletGroup.walletId}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    {/* Wallet Header */}
                    <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-[#5A7A8F]" />
                        <span className="text-sm font-medium text-gray-900">
                          {walletGroup.walletName} ({walletGroup.holderName})
                        </span>
                      </div>
                      <span className="text-sm font-bold text-green-700">
                        Total: {formatCurrency(walletGroup.totalAmount)}
                      </span>
                    </div>
                    {/* Bank Account Groups */}
                    <div className="divide-y divide-gray-100">
                      {walletGroup.bankAccountGroups.map((bankGroup) => {
                        const isSelected = selectedTransfers.has(`${walletGroup.walletId}::${bankGroup.bankAccountId}`);
                        return (
                          <div
                            key={bankGroup.bankAccountId}
                            className={`px-3 py-2 flex items-center justify-between text-sm cursor-pointer transition-colors ${
                              isSelected ? 'bg-green-50' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => toggleTransferSelection(walletGroup.walletId, bankGroup.bankAccountId)}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="h-4 w-4 text-[#5A7A8F] border-gray-300 rounded focus:ring-[#5A7A8F]"
                              />
                              <div>
                                <div className="font-medium text-gray-900">
                                  {bankGroup.companyName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {bankGroup.bankAccountName}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-gray-900">
                                {formatCurrency(bankGroup.amount)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {bankGroup.reimbursementIds.length} claim{bankGroup.reimbursementIds.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {/* Transfer Button */}
                {selectedTransfers.size > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <button
                      onClick={handleTransfer}
                      disabled={isProcessingTransfer}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessingTransfer ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <ArrowUpCircle className="h-4 w-4" />
                          Transfer Selected: {formatCurrency(selectedTransferAmount)}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* All Wallets Table */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            All Petty Cash Wallets
          </h3>
          <span className="text-sm text-gray-500">
            {wallets.filter((w) => w.status === 'active').length} active wallets
          </span>
        </div>
        <DataTable
          columns={walletColumns}
          data={wallets}
          emptyMessage="No wallets found"
        />
      </div>

      {/* All Transactions Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            All Transactions
          </h3>
          <span className="text-sm text-gray-500">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
            {hasActiveTxnFilters && ` (filtered from ${allTransactions.length})`}
          </span>
        </div>

        {/* Transaction Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
            {hasActiveTxnFilters && (
              <button
                onClick={clearTxnFilters}
                className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
              >
                <X className="h-3 w-3" />
                Clear All
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Date From */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={txnDateFrom}
                onChange={(e) => setTxnDateFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              />
            </div>
            {/* Date To */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={txnDateTo}
                onChange={(e) => setTxnDateTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              />
            </div>
            {/* Wallet Holder */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Wallet Holder
              </label>
              <select
                value={txnWalletId}
                onChange={(e) => setTxnWalletId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              >
                <option value="">All Holders</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.userName}
                  </option>
                ))}
              </select>
            </div>
            {/* Company */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Company
              </label>
              <select
                value={txnCompanyId}
                onChange={(e) => setTxnCompanyId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              >
                <option value="">All Companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            {/* Transaction Type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Type
              </label>
              <select
                value={txnType}
                onChange={(e) => setTxnType(e.target.value as TransactionType | '')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              >
                <option value="">All Types</option>
                <option value="expense">Expense</option>
                <option value="topup">Top-up</option>
                <option value="reimbursement_paid">Reimbursement</option>
              </select>
            </div>
            {/* Receipt Status */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Receipt Status
              </label>
              <select
                value={txnReceiptStatus}
                onChange={(e) => setTxnReceiptStatus(e.target.value as ReceiptStatus | '')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="original_received">Received</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <DataTable
          columns={transactionColumns}
          data={filteredTransactions}
          emptyMessage="No transactions found"
        />
      </div>
        </>
      )}

      {/* Top-up Modal */}
      {showTopUpModal && selectedWallet && (
        <TopUpModal
          wallet={selectedWallet}
          onSubmit={handleTopUp}
          onClose={() => {
            setShowTopUpModal(false);
            setSelectedWallet(null);
          }}
        />
      )}

      {/* Reimbursement Approval Modal */}
      {selectedReimbursement && selectedExpense && (
        <ReimbursementApprovalModal
          reimbursement={selectedReimbursement}
          expense={selectedExpense}
          onApprove={handleApproveReimbursement}
          onReject={handleRejectReimbursement}
          onClose={() => {
            setSelectedReimbursement(null);
            setSelectedExpense(null);
          }}
          onExpenseUpdated={(updatedExpense) => {
            setSelectedExpense(updatedExpense);
            setRefreshKey((prev) => prev + 1);
          }}
        />
      )}

      {/* Receipt Status Confirmation Dialog */}
      {showReceiptConfirmDialog && pendingReceiptUncheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={cancelReceiptUncheck}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Uncheck
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to mark this receipt as &quot;Pending&quot;?
              </p>
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">
                  {pendingReceiptUncheck.referenceNumber}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {pendingReceiptUncheck.walletHolderName} · {pendingReceiptUncheck.companyName}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={cancelReceiptUncheck}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmReceiptUncheck}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
