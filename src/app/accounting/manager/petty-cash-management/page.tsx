'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/accounting/AppShell';
import { KPICard } from '@/components/accounting/KPICard';
import { DataTable } from '@/components/accounting/DataTable';
import TopUpModal from '@/components/petty-cash/TopUpModal';
import ReimbursementApprovalModal from '@/components/petty-cash/ReimbursementApprovalModal';
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
import type { PettyCashWallet, PettyCashReimbursement, PettyCashExpense, PettyCashTransaction, TransactionType, ReceiptStatus } from '@/data/petty-cash/types';
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
type SupabaseExpense = Database['public']['Tables']['petty_cash_expenses']['Row'];
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

  // View mode toggle: 'all-wallets' (default) or 'my-wallet'
  const [viewMode, setViewMode] = useState<'all-wallets' | 'my-wallet'>('all-wallets');

  // My wallet state (fetched from Supabase for current user)
  const [myWallet, setMyWallet] = useState<SupabaseWallet | null>(null);
  const [myWalletLoading, setMyWalletLoading] = useState(true);

  // Supabase-loaded data for My Wallet view
  const [myWalletExpensesDb, setMyWalletExpensesDb] = useState<SupabaseExpense[]>([]);
  const [myWalletReimbursementsDb, setMyWalletReimbursementsDb] = useState<SupabaseReimbursement[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; code: string }[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // My Wallet view state
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [myWalletTab, setMyWalletTab] = useState<'expenses' | 'reimbursements' | 'history'>('expenses');
  const [myWalletExpenseFilters, setMyWalletExpenseFilters] = useState<ExpenseFilterValues>(initialMyWalletFilters);
  const [myWalletReimbursementFilters, setMyWalletReimbursementFilters] = useState<ExpenseFilterValues>(initialMyWalletFilters);

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

  // Fetch companies and projects from Supabase
  useEffect(() => {
    async function loadDropdownData() {
      try {
        const [companiesData, projectsData] = await Promise.all([
          companiesApi.getActive(),
          projectsApi.getActive(),
        ]);
        setCompanies(companiesData.map((c: DbCompany) => ({ id: c.id, name: c.name })));
        setProjects(projectsData.map((p: DbProject) => ({ id: p.id, name: p.name, code: p.code })));
      } catch (error) {
        console.error('Error loading dropdown data:', error);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadDropdownData();
  }, []);

  // Fetch user's own wallet from Supabase (with calculated balance)
  useEffect(() => {
    async function fetchMyWallet() {
      if (!user?.id) {
        setMyWalletLoading(false);
        return;
      }

      try {
        const wallets = await pettyCashApi.getWalletsByUser(user.id);
        const activeWallet = wallets.find(w => w.status === 'active') || wallets[0] || null;

        // Fetch wallet with calculated balance if found
        if (activeWallet) {
          const walletWithBalance = await pettyCashApi.getWalletWithCalculatedBalance(activeWallet.id);
          if (walletWithBalance) {
            // Replace balance with calculated_balance for proper display
            setMyWallet({
              ...walletWithBalance,
              balance: walletWithBalance.calculated_balance,
            });
          } else {
            setMyWallet(activeWallet);
          }

          // Also fetch expenses and reimbursements for this wallet from Supabase
          const [expensesData, reimbursementsData] = await Promise.all([
            pettyCashApi.getExpensesByWallet(activeWallet.id),
            pettyCashApi.getReimbursementsByWallet(activeWallet.id),
          ]);
          setMyWalletExpensesDb(expensesData);
          setMyWalletReimbursementsDb(reimbursementsData);
        } else {
          setMyWallet(null);
          setMyWalletReimbursementsDb([]);
        }
      } catch (error) {
        console.error('Error fetching my wallet:', error);
        setMyWallet(null);
      } finally {
        setMyWalletLoading(false);
      }
    }

    if (!authLoading) {
      fetchMyWallet();
    }
  }, [user?.id, authLoading, refreshKey]);

  // Transform my wallet to frontend format
  const transformedMyWallet = useMemo(
    () => myWallet ? transformWallet(myWallet) : null,
    [myWallet]
  );

  // Check if user has their own wallet
  const hasOwnWallet = !!myWallet;

  // Supabase data for "All Wallets" view
  const [allWalletsDb, setAllWalletsDb] = useState<SupabaseWalletWithBalance[]>([]);
  const [allExpensesDb, setAllExpensesDb] = useState<SupabaseExpense[]>([]);
  const [isLoadingAllWallets, setIsLoadingAllWallets] = useState(true);

  // Fetch all wallets and expenses from Supabase
  useEffect(() => {
    async function fetchAllWalletsData() {
      try {
        const [walletsData, expensesData] = await Promise.all([
          pettyCashApi.getAllWalletsWithCalculatedBalances(), // Use calculated balance method
          pettyCashApi.getAllExpenses(),
        ]);
        setAllWalletsDb(walletsData);
        setAllExpensesDb(expensesData);
      } catch (error) {
        console.error('Error fetching all wallets data:', error);
      } finally {
        setIsLoadingAllWallets(false);
      }
    }
    fetchAllWalletsData();
  }, [refreshKey]);

  // Transform wallets for display (using calculated balance)
  const wallets = useMemo(() => {
    return allWalletsDb.map(transformWalletWithCalculatedBalance);
  }, [allWalletsDb]);

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

  // Fetch pending reimbursements from Supabase
  const [pendingReimbursements, setPendingReimbursements] = useState<PettyCashReimbursement[]>([]);
  const [isLoadingPendingReimbursements, setIsLoadingPendingReimbursements] = useState(true);

  useEffect(() => {
    const fetchPendingReimbursements = async () => {
      setIsLoadingPendingReimbursements(true);
      try {
        // Fetch reimbursements and all expenses in parallel
        const [reimbursementsData, expensesData] = await Promise.all([
          pettyCashApi.getPendingReimbursementsWithDetails(),
          pettyCashApi.getAllExpenses(),
        ]);

        // Find submitted expenses that don't have reimbursements
        const existingExpenseIds = new Set(reimbursementsData.map(r => r.expense_id));
        const submittedExpensesWithoutReimbursement = expensesData.filter(
          e => e.status === 'submitted' && !existingExpenseIds.has(e.id) && e.company_id
        );

        // Auto-create reimbursements for submitted expenses that don't have them
        const createdReimbursements = await Promise.all(
          submittedExpensesWithoutReimbursement.map(async (expense) => {
            try {
              const reimbursement = await pettyCashApi.createReimbursementWithNumber({
                wallet_id: expense.wallet_id,
                expense_id: expense.id,
                amount: expense.amount || 0,
                final_amount: expense.amount || 0,
                company_id: expense.company_id!,
                status: 'pending' as const,
                // Optional fields - set to null for auto-created reimbursements
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
              });
              console.log(`Auto-created reimbursement for expense ${expense.expense_number}`);
              return reimbursement;
            } catch (error) {
              console.error(`Failed to auto-create reimbursement for expense ${expense.expense_number}:`, error);
              return null;
            }
          })
        );

        // If we created any new reimbursements, refresh the data
        let finalData = reimbursementsData;
        if (createdReimbursements.some(r => r !== null)) {
          // Refetch to get complete data with wallet/company details
          finalData = await pettyCashApi.getPendingReimbursementsWithDetails();
        }

        const transformed = finalData.map((r) => ({
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
        setPendingReimbursements(transformed);
      } catch (error) {
        console.error('Failed to fetch pending reimbursements:', error);
        setPendingReimbursements([]);
      } finally {
        setIsLoadingPendingReimbursements(false);
      }
    };
    fetchPendingReimbursements();
  }, [refreshKey]);

  // Fetch approved reimbursements (Payment Queue) from Supabase
  const [approvedReimbursements, setApprovedReimbursements] = useState<PettyCashReimbursement[]>([]);
  const [isLoadingApprovedReimbursements, setIsLoadingApprovedReimbursements] = useState(true);

  useEffect(() => {
    const fetchApprovedReimbursements = async () => {
      setIsLoadingApprovedReimbursements(true);
      try {
        const data = await pettyCashApi.getReimbursementsByStatus('approved');
        const transformed = data.map((r) => ({
          id: r.id,
          reimbursementNumber: r.reimbursement_number || '',
          walletId: r.wallet_id,
          walletHolderName: '',
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
        }));
        setApprovedReimbursements(transformed);
      } catch (error) {
        console.error('Failed to fetch approved reimbursements:', error);
        setApprovedReimbursements([]);
      } finally {
        setIsLoadingApprovedReimbursements(false);
      }
    };
    fetchApprovedReimbursements();
  }, [refreshKey]);

  // Group approved reimbursements by company for Payment Queue
  const paymentQueueByCompany = useMemo(() => {
    const grouped = new Map<string, { companyId: string; companyName: string; claims: typeof approvedReimbursements; total: number }>();
    approvedReimbursements.forEach((rmb) => {
      const companyId = rmb.companyId || 'unassigned';
      const company = companies.find(c => c.id === companyId);
      const existing = grouped.get(companyId) || {
        companyId,
        companyName: company?.name || 'Unassigned',
        claims: [],
        total: 0,
      };
      existing.claims.push(rmb);
      existing.total += rmb.finalAmount;
      grouped.set(companyId, existing);
    });
    return Array.from(grouped.values());
  }, [approvedReimbursements, companies]);

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

      // Validate required fields with user-friendly error messages
      const companyId = expenseData.companyId || myWallet.company_id;
      if (!companyId) {
        alert('No company is associated with your wallet. Please contact your manager.');
        console.error('Failed to create expense: No company_id available. Wallet:', myWallet);
        return;
      }
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
    (
      reimbursementId: string,
      bankAccountId: string,
      bankAccountName: string,
      paymentDate: string,
      _expenseAccountCode: string,
      _companyId: string,
      _vatType: VatType,
      _vatRate: number,
      adjustmentAmount?: number,
      adjustmentReason?: string
    ) => {
      // Approve the reimbursement
      // Note: expenseAccountCode, companyId, vatType, vatRate are saved via the modal's onExpenseUpdated
      const approved = approveReimbursement(
        reimbursementId,
        'Manager',
        bankAccountId,
        bankAccountName,
        adjustmentAmount,
        adjustmentReason
      );

      if (approved) {
        // Process payment immediately
        processReimbursementPayment(approved.id, paymentDate, `PAY-${Date.now()}`);

        // Add to wallet balance
        addToWallet(approved.walletId, approved.finalAmount);
      }

      setSelectedReimbursement(null);
      setSelectedExpense(null);
      setRefreshKey((prev) => prev + 1);
    },
    []
  );

  // Handle reimbursement rejection
  const handleRejectReimbursement = useCallback(
    (reimbursementId: string, reason: string) => {
      rejectReimbursement(reimbursementId, 'Manager', reason);
      setSelectedReimbursement(null);
      setSelectedExpense(null);
      setRefreshKey((prev) => prev + 1);
    },
    []
  );

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
      const expense = getExpenseById(reimbursement.expenseId);
      if (expense) {
        setSelectedReimbursement(reimbursement);
        setSelectedExpense(expense);
      }
    },
    []
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
    { key: 'userName', header: 'Holder Name' },
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
    { key: 'reimbursementNumber', header: 'Number' },
    { key: 'walletHolderName', header: 'Holder' },
    { key: 'companyName', header: 'Company' },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right' as const,
      render: (row: PettyCashReimbursement) => formatCurrency(row.amount),
    },
    {
      key: 'createdAt',
      header: 'Requested',
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
    { key: 'walletHolderName', header: 'Holder' },
    { key: 'companyName', header: 'Company' },
    {
      key: 'description',
      header: 'Description',
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
    { key: 'projectName', header: 'Project' },
    { key: 'description', header: 'Description' },
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
    { key: 'reimbursementNumber', header: 'Number' },
    { key: 'expenseNumber', header: 'Expense' },
    { key: 'companyName', header: 'Company' },
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
      key: 'createdAt',
      header: 'Requested',
      render: (row: PettyCashReimbursement) => formatDate(row.createdAt),
    },
  ];

  // Table columns for transaction history in My Wallet view
  const myHistoryColumns = [
    {
      key: 'date',
      header: 'Date',
      render: (row: { date: string }) => formatDate(row.date),
    },
    { key: 'referenceNumber', header: 'Reference' },
    { key: 'description', header: 'Description' },
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
                : 'Manage your personal petty cash wallet'
              }
            </p>
          </div>

          {/* View Mode Toggle - Only show if user has own wallet */}
          {hasOwnWallet && (
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
            </div>
          )}
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
                { id: 'expenses', label: 'My Claims', icon: Receipt },
                { id: 'reimbursements', label: 'Claim History', icon: Clock },
                { id: 'history', label: 'Transaction History', icon: FileText },
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
              onSave={handleCreateMyExpense}
              onCancel={() => setShowExpenseForm(false)}
            />
          )}
        </>
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

        {/* Payment Queue - Approved claims ready for payment */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Payment Queue
            </h3>
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
              {approvedReimbursements.length} approved
            </span>
          </div>
          <div className="p-4">
            {paymentQueueByCompany.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No claims ready for payment
              </p>
            ) : (
              <div className="space-y-4">
                {paymentQueueByCompany.map((group) => (
                  <div
                    key={group.companyId}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[#5A7A8F]" />
                        <span className="text-sm font-medium text-gray-900">
                          {group.companyName}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-green-700">
                        {formatCurrency(group.total)}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {group.claims.slice(0, 3).map((claim) => (
                        <div
                          key={claim.id}
                          className="px-3 py-2 flex items-center justify-between text-sm"
                        >
                          <span className="text-gray-600">
                            {claim.reimbursementNumber}
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(claim.finalAmount)}
                          </span>
                        </div>
                      ))}
                      {group.claims.length > 3 && (
                        <div className="px-3 py-2 text-xs text-gray-500 text-center">
                          +{group.claims.length - 3} more claim{group.claims.length - 3 !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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
