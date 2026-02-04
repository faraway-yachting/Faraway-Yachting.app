'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/accounting/AppShell';
import { DataTable } from '@/components/accounting/DataTable';
import ReimbursementApprovalModal from '@/components/petty-cash/ReimbursementApprovalModal';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Wallet,
  Filter,
  Building2,
  User,
  DollarSign,
  Loader2,
} from 'lucide-react';

// Data imports - mock data as fallback
import {
  getAllReimbursements as getMockReimbursements,
  approveReimbursement as approveMockReimbursement,
  processReimbursementPayment as processMockReimbursementPayment,
  rejectReimbursement as rejectMockReimbursement,
} from '@/data/petty-cash/reimbursements';
import { getExpenseById as getMockExpenseById } from '@/data/petty-cash/expenses';
import { getWalletById, addToWallet } from '@/data/petty-cash/wallets';
import type { PettyCashReimbursement, PettyCashExpense } from '@/data/petty-cash/types';
import {
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusColor,
} from '@/lib/petty-cash/utils';
import { pettyCashApi, type PettyCashReimbursement as DbReimbursement } from '@/lib/supabase/api/pettyCash';
import { companiesApi } from '@/lib/supabase/api/companies';
import { projectsApi } from '@/lib/supabase/api/projects';
import { useAuth } from '@/components/auth/AuthProvider';
import { notifyWalletHolderClaimPaid, notifyWalletHolderClaimRejected } from '@/data/notifications/notifications';

type StatusFilter = 'all' | 'pending' | 'approved' | 'paid' | 'rejected';
type GroupBy = 'none' | 'company' | 'holder' | 'status';

// Extended reimbursement type with project info
interface ReimbursementWithProject extends PettyCashReimbursement {
  projectId?: string;
  projectName?: string;
}

// Transform database reimbursement to frontend type
function transformReimbursement(
  db: DbReimbursement,
  walletName: string,
  companyName: string,
  expenseNumber: string,
  projectId?: string,
  projectName?: string
): ReimbursementWithProject {
  return {
    id: db.id,
    reimbursementNumber: db.reimbursement_number,
    expenseId: db.expense_id,
    expenseNumber: expenseNumber,
    walletId: db.wallet_id,
    walletHolderName: walletName,
    companyId: db.company_id || '',
    companyName: companyName,
    amount: db.amount,
    adjustmentAmount: db.adjustment_amount || undefined,
    adjustmentReason: db.adjustment_reason || undefined,
    finalAmount: db.final_amount,
    status: db.status,
    bankAccountId: db.bank_account_id || undefined,
    bankAccountName: undefined, // Would need to join with bank_accounts
    paymentDate: db.payment_date || undefined,
    paymentReference: db.payment_reference || undefined,
    approvedBy: db.approved_by || undefined,
    approvedAt: db.approved_at || undefined,
    rejectedBy: db.rejected_by || undefined,
    rejectedAt: db.rejected_at || undefined,
    rejectionReason: db.rejection_reason || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    projectId,
    projectName,
  };
}

export default function ReimbursementsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('company');

  // Modal state
  const [selectedReimbursement, setSelectedReimbursement] = useState<PettyCashReimbursement | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<PettyCashExpense | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Supabase data state
  const [isLoading, setIsLoading] = useState(true);
  const [dbReimbursements, setDbReimbursements] = useState<ReimbursementWithProject[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);

  // Load data from Supabase
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Fetch reimbursements, wallets, expenses, companies, and projects in parallel
        const [reimbursementsData, walletsData, expensesData, companiesData, projectsData] = await Promise.all([
          pettyCashApi.getAllReimbursements(),
          pettyCashApi.getAllWallets(),
          pettyCashApi.getAllExpenses(),
          companiesApi.getAll(),
          projectsApi.getAll(),
        ]);

        // Create lookup maps
        const walletMap = new Map(walletsData.map(w => [w.id, w]));
        const expenseMap = new Map(expensesData.map(e => [e.id, e]));
        const companyMap = new Map(companiesData.map(c => [c.id, c]));
        const projectMap = new Map(projectsData.map(p => [p.id, p]));

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

        // Combine original and newly created reimbursements
        const allReimbursementsData = [
          ...reimbursementsData,
          ...createdReimbursements.filter((r): r is NonNullable<typeof r> => r !== null),
        ];

        // Transform reimbursements
        const transformed = allReimbursementsData.map(r => {
          const wallet = walletMap.get(r.wallet_id);
          const expense = expenseMap.get(r.expense_id);
          const company = r.company_id ? companyMap.get(r.company_id) : null;
          const project = expense?.project_id ? projectMap.get(expense.project_id) : null;

          return transformReimbursement(
            r,
            wallet?.user_name || 'Unknown',
            company?.name || 'Unknown',
            expense?.expense_number || 'Unknown',
            expense?.project_id || undefined,
            project?.name || undefined
          );
        });

        setDbReimbursements(transformed);
        setCompanies(companiesData.map(c => ({ id: c.id, name: c.name })));

      } catch (error) {
        console.error('Error loading reimbursements from Supabase:', error);
        // Fall back to mock data
        setDbReimbursements(getMockReimbursements());
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [refreshKey]);

  // Combine Supabase and mock data (if any)
  const allReimbursements = useMemo((): ReimbursementWithProject[] => {
    // If we have Supabase data, use it
    if (dbReimbursements.length > 0) {
      return dbReimbursements;
    }
    // Fall back to mock data (no project info available)
    return getMockReimbursements().map(r => ({ ...r, projectId: undefined, projectName: undefined }));
  }, [dbReimbursements]);

  // Apply filters
  const filteredReimbursements = useMemo(() => {
    let filtered = allReimbursements;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (companyFilter !== 'all') {
      filtered = filtered.filter((r) => r.companyId === companyFilter);
    }

    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [allReimbursements, statusFilter, companyFilter]);

  // Group reimbursements
  const groupedReimbursements = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Reimbursements': filteredReimbursements };
    }

    const groups: Record<string, ReimbursementWithProject[]> = {};

    filteredReimbursements.forEach((r) => {
      let key: string;
      switch (groupBy) {
        case 'company':
          key = r.companyName;
          break;
        case 'holder':
          key = r.walletHolderName;
          break;
        case 'status':
          key = getStatusLabel(r.status);
          break;
        default:
          key = 'Other';
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(r);
    });

    return groups;
  }, [filteredReimbursements, groupBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const pending = allReimbursements.filter((r) => r.status === 'pending');
    const approved = allReimbursements.filter((r) => r.status === 'approved');
    const paid = allReimbursements.filter((r) => r.status === 'paid');
    const rejected = allReimbursements.filter((r) => r.status === 'rejected');

    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, r) => sum + r.finalAmount, 0),
      approvedCount: approved.length,
      approvedAmount: approved.reduce((sum, r) => sum + r.finalAmount, 0),
      paidCount: paid.length,
      paidAmount: paid.reduce((sum, r) => sum + r.finalAmount, 0),
      rejectedCount: rejected.length,
    };
  }, [allReimbursements]);

  // Loading state for fetching expense
  const [isLoadingExpense, setIsLoadingExpense] = useState(false);

  // Handlers
  const handleReview = useCallback(async (reimbursement: PettyCashReimbursement) => {
    setIsLoadingExpense(true);
    setSelectedReimbursement(reimbursement);

    try {
      // First try to get from Supabase
      const supabaseExpense = await pettyCashApi.getExpenseById(reimbursement.expenseId);

      if (supabaseExpense) {
        // Fetch project name if project_id exists
        let projectName = '';
        if (supabaseExpense.project_id) {
          try {
            const project = await projectsApi.getById(supabaseExpense.project_id);
            projectName = project?.name || '';
          } catch (err) {
            console.error('Error fetching project:', err);
          }
        }

        // Parse attachments from JSON string (column added in migration 032)
        // Cast to extended type since attachments is not in auto-generated types
        const extendedExpense = supabaseExpense as typeof supabaseExpense & { attachments?: unknown };
        let attachments: Array<{ id: string; name: string; url: string; size: number; type: string; uploadedAt: string }> = [];
        if (extendedExpense.attachments) {
          try {
            const parsed = typeof extendedExpense.attachments === 'string'
              ? JSON.parse(extendedExpense.attachments)
              : extendedExpense.attachments;
            if (Array.isArray(parsed)) {
              attachments = parsed.map((a: { id?: string; name?: string; url?: string; size?: number; type?: string; uploadedAt?: string }) => ({
                id: a.id || '',
                name: a.name || '',
                url: a.url || '',
                size: a.size || 0,
                type: a.type || '',
                uploadedAt: a.uploadedAt || new Date().toISOString(),
              }));
            }
          } catch (err) {
            console.error('Error parsing attachments:', err);
          }
        }

        // Transform Supabase expense to frontend format
        // Cast to extended type to access accounting fields (may not be in auto-generated types)
        const extendedExp = supabaseExpense as typeof supabaseExpense & {
          expense_account_code?: string | null;
          accounting_vat_type?: string | null;
          accounting_vat_rate?: number | null;
          accounting_completed_by?: string | null;
          accounting_completed_at?: string | null;
        };
        const amount = supabaseExpense.amount || 0;
        const transformedExpense: PettyCashExpense = {
          id: supabaseExpense.id,
          expenseNumber: supabaseExpense.expense_number,
          walletId: supabaseExpense.wallet_id,
          walletHolderName: reimbursement.walletHolderName,
          companyId: supabaseExpense.company_id || '',
          companyName: reimbursement.companyName,
          expenseDate: supabaseExpense.expense_date,
          description: supabaseExpense.description || '',
          amount: amount,
          projectId: supabaseExpense.project_id,
          projectName: projectName,
          receiptStatus: attachments.length > 0 ? 'original_received' : 'pending',
          attachments: attachments,
          lineItems: [],
          subtotal: amount,
          vatAmount: 0,
          totalAmount: amount,
          whtAmount: 0,
          netAmount: amount,
          status: (supabaseExpense.status === 'submitted' ? 'submitted' : 'draft') as 'draft' | 'submitted',
          createdBy: supabaseExpense.created_by || '',
          createdAt: supabaseExpense.created_at,
          updatedAt: supabaseExpense.created_at,
          // Accounting details (filled by accountant during approval)
          expenseAccountCode: extendedExp.expense_account_code || undefined,
          accountingVatType: (extendedExp.accounting_vat_type as 'include' | 'exclude' | 'no_vat') || undefined,
          accountingVatRate: extendedExp.accounting_vat_rate ?? undefined,
          accountingCompletedBy: extendedExp.accounting_completed_by || undefined,
          accountingCompletedAt: extendedExp.accounting_completed_at || undefined,
        };
        setSelectedExpense(transformedExpense);
      } else {
        // Fall back to mock data
        const mockExpense = getMockExpenseById(reimbursement.expenseId);
        setSelectedExpense(mockExpense || null);
      }
    } catch (error) {
      console.error('Error fetching expense:', error);
      // Fall back to mock data
      const mockExpense = getMockExpenseById(reimbursement.expenseId);
      setSelectedExpense(mockExpense || null);
    } finally {
      setIsLoadingExpense(false);
      setShowApprovalModal(true);
    }
  }, []);

  const handleApprove = useCallback(
    async (
      reimbursementId: string,
      bankAccountId: string,
      bankAccountName: string,
      paymentDate: string,
      expenseAccountCode: string,
      companyId: string,
      vatType: 'include' | 'exclude' | 'no_vat',
      vatRate: number,
      adjustmentAmount?: number,
      adjustmentReason?: string
    ) => {
      try {
        // Check if this is a Supabase reimbursement
        const isDbReimbursement = dbReimbursements.some(r => r.id === reimbursementId);

        if (isDbReimbursement && user?.id) {
          // Approve with bank account info in Supabase (status becomes 'approved')
          // Note: Payment step is now separate - done via batch payment after bank transfer
          await pettyCashApi.approveReimbursement(
            reimbursementId,
            bankAccountId,
            user.id,
            adjustmentAmount,
            adjustmentReason
          );

          // Save accounting details to the petty cash expense record
          // This ensures Company, Expense Account, VAT settings are persisted
          if (selectedExpense?.id) {
            try {
              await pettyCashApi.updateExpense(selectedExpense.id, {
                company_id: companyId || null,
                expense_account_code: expenseAccountCode || null,
                accounting_vat_type: vatType || null,
                accounting_vat_rate: vatRate || 0,
                accounting_completed_by: user.id,
                accounting_completed_at: new Date().toISOString(),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any);
            } catch (updateError) {
              console.warn('Could not update expense accounting details:', updateError);
              // Don't fail the approval if update fails
            }
          }

          // Create linked expense in main expenses table for P&L/Finances
          // This ensures the expense shows in Finances and Reports
          if (selectedExpense && selectedReimbursement) {
            try {
              await pettyCashApi.createLinkedExpense(
                selectedExpense.id,
                {
                  companyId: companyId || selectedReimbursement.companyId || selectedExpense.companyId,
                  vendorName: 'Petty Cash - ' + (selectedReimbursement.walletHolderName || 'Unknown'),
                  expenseDate: selectedExpense.expenseDate,
                  amount: selectedExpense.amount,
                  projectId: selectedExpense.projectId,
                  description: selectedExpense.description || `Petty Cash: ${selectedExpense.expenseNumber}`,
                  accountCode: expenseAccountCode, // Use the account code from the modal
                  createdBy: user.id,
                  // VAT information from the modal
                  vatType: vatType,
                  vatRate: vatRate,
                }
              );
            } catch (linkError) {
              // Don't fail the approval if linked expense creation fails
              // The expense might already be linked
              console.warn('Could not create linked expense (may already exist):', linkError);
            }
          }

          // Note: Wallet credit happens later when batch is marked as paid (after bank transfer)
          // Notification will be sent when batch payment is completed
        } else {
          // Fall back to mock data handlers
          approveMockReimbursement(
            reimbursementId,
            'current-manager',
            bankAccountId,
            bankAccountName,
            adjustmentAmount,
            adjustmentReason
          );

          const updatedReimbursement = processMockReimbursementPayment(
            reimbursementId,
            paymentDate,
            `PAY-${Date.now()}`
          );

          // Credit the wallet (mock)
          if (updatedReimbursement) {
            const wallet = getWalletById(updatedReimbursement.walletId);
            if (wallet) {
              addToWallet(wallet.id, updatedReimbursement.finalAmount);
            }

            // Notify wallet holder that their claim has been processed
            notifyWalletHolderClaimPaid(
              reimbursementId,
              updatedReimbursement.reimbursementNumber,
              updatedReimbursement.finalAmount
            );
          }
        }

        setShowApprovalModal(false);
        setSelectedReimbursement(null);
        setSelectedExpense(null);
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        console.error('Error approving reimbursement:', error);
        alert('Failed to approve reimbursement. Please try again.');
      }
    },
    [dbReimbursements, user, selectedExpense, selectedReimbursement]
  );

  const handleReject = useCallback(
    async (reimbursementId: string, reason: string) => {
      try {
        // Check if this is a Supabase reimbursement
        const isDbReimbursement = dbReimbursements.some(r => r.id === reimbursementId);

        if (isDbReimbursement && user?.id) {
          await pettyCashApi.rejectReimbursement(reimbursementId, user.id, reason);
        } else {
          rejectMockReimbursement(reimbursementId, 'current-manager', reason);
        }

        // Notify wallet holder that their claim has been rejected
        if (selectedReimbursement) {
          notifyWalletHolderClaimRejected(
            reimbursementId,
            selectedReimbursement.reimbursementNumber,
            selectedReimbursement.amount,
            reason
          );
        }

        setShowApprovalModal(false);
        setSelectedReimbursement(null);
        setSelectedExpense(null);
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        console.error('Error rejecting reimbursement:', error);
        alert('Failed to reject reimbursement. Please try again.');
      }
    },
    [dbReimbursements, user, selectedReimbursement]
  );

  // Status badge
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

  // Table columns
  const columns = [
    { key: 'reimbursementNumber', header: 'Number' },
    { key: 'walletHolderName', header: 'Holder' },
    {
      key: 'expenseNumber',
      header: 'Expense',
      render: (row: ReimbursementWithProject) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/accounting/manager/petty-cash-management/expenses/${row.expenseId}`);
          }}
          className="text-[#5A7A8F] hover:underline font-medium"
        >
          {row.expenseNumber}
        </button>
      ),
    },
    {
      key: 'projectName',
      header: 'Project',
      render: (row: ReimbursementWithProject) => (
        <span className="text-gray-700">{row.projectName || '-'}</span>
      ),
    },
    ...(groupBy !== 'company'
      ? [{ key: 'companyName', header: 'Company' }]
      : []),
    {
      key: 'finalAmount',
      header: 'Amount',
      align: 'right' as const,
      render: (row: ReimbursementWithProject) => (
        <span className="font-medium">{formatCurrency(row.finalAmount)}</span>
      ),
    },
    ...(groupBy !== 'status'
      ? [
          {
            key: 'status',
            header: 'Status',
            align: 'center' as const,
            render: (row: ReimbursementWithProject) => (
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(
                  row.status
                )}`}
              >
                {getStatusLabel(row.status)}
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'createdAt',
      header: 'Requested',
      render: (row: ReimbursementWithProject) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: (row: ReimbursementWithProject) => (
        <button
          onClick={() => handleReview(row)}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
            row.status === 'pending'
              ? 'text-white bg-[#5A7A8F] hover:bg-[#4a6a7f]'
              : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
          }`}
        >
          {row.status === 'pending' ? 'Review' : 'View'}
        </button>
      ),
    },
  ];

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/accounting/manager/petty-cash-management')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Petty Cash Management
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Reimbursement Management
            </h1>
            <p className="text-gray-500 mt-1">
              Review and process petty cash reimbursement requests
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div
          className={`bg-white rounded-lg border p-4 cursor-pointer transition-all ${
            statusFilter === 'pending'
              ? 'ring-2 ring-yellow-500 border-yellow-500'
              : 'hover:border-gray-300'
          }`}
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-xl font-bold text-gray-900">{stats.pendingCount}</p>
              <p className="text-xs text-gray-500">
                {formatCurrency(stats.pendingAmount)}
              </p>
            </div>
          </div>
        </div>

        <div
          className={`bg-white rounded-lg border p-4 cursor-pointer transition-all ${
            statusFilter === 'approved'
              ? 'ring-2 ring-blue-500 border-blue-500'
              : 'hover:border-gray-300'
          }`}
          onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-xl font-bold text-gray-900">{stats.approvedCount}</p>
              <p className="text-xs text-gray-500">
                {formatCurrency(stats.approvedAmount)}
              </p>
            </div>
          </div>
        </div>

        <div
          className={`bg-white rounded-lg border p-4 cursor-pointer transition-all ${
            statusFilter === 'paid'
              ? 'ring-2 ring-green-500 border-green-500'
              : 'hover:border-gray-300'
          }`}
          onClick={() => setStatusFilter(statusFilter === 'paid' ? 'all' : 'paid')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Paid</p>
              <p className="text-xl font-bold text-gray-900">{stats.paidCount}</p>
              <p className="text-xs text-gray-500">
                {formatCurrency(stats.paidAmount)}
              </p>
            </div>
          </div>
        </div>

        <div
          className={`bg-white rounded-lg border p-4 cursor-pointer transition-all ${
            statusFilter === 'rejected'
              ? 'ring-2 ring-red-500 border-red-500'
              : 'hover:border-gray-300'
          }`}
          onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Rejected</p>
              <p className="text-xl font-bold text-gray-900">{stats.rejectedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          {/* Company Filter */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400" />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
            >
              <option value="all">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {/* Group By */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500">Group by:</span>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {[
                { value: 'company', icon: Building2, label: 'Company' },
                { value: 'holder', icon: User, label: 'Holder' },
                { value: 'status', icon: Clock, label: 'Status' },
                { value: 'none', icon: Wallet, label: 'None' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setGroupBy(option.value as GroupBy)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                    groupBy === option.value
                      ? 'bg-[#5A7A8F] text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <option.icon className="h-3.5 w-3.5" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {(statusFilter !== 'all' || companyFilter !== 'all') && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Active filters:</span>
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                Status: {getStatusLabel(statusFilter)}
                <button
                  onClick={() => setStatusFilter('all')}
                  className="ml-1 hover:text-gray-900"
                >
                  ×
                </button>
              </span>
            )}
            {companyFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                Company: {companies.find((c) => c.id === companyFilter)?.name}
                <button
                  onClick={() => setCompanyFilter('all')}
                  className="ml-1 hover:text-gray-900"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setStatusFilter('all');
                setCompanyFilter('all');
              }}
              className="text-xs text-[#5A7A8F] hover:underline ml-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Grouped Tables */}
      {Object.entries(groupedReimbursements).map(([groupName, reimbursements]) => (
        <div key={groupName} className="mb-6">
          {groupBy !== 'none' && (
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {groupName}
              </h3>
              <span className="text-sm text-gray-500">
                {reimbursements.length} reimbursement
                {reimbursements.length !== 1 ? 's' : ''} •{' '}
                {formatCurrency(
                  reimbursements.reduce((sum, r) => sum + r.finalAmount, 0)
                )}
              </span>
            </div>
          )}
          <DataTable
            columns={columns}
            data={reimbursements}
            emptyMessage="No reimbursements found"
          />
        </div>
      ))}

      {isLoading && (
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 text-gray-300 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            Loading Reimbursements
          </h3>
          <p className="text-gray-500">Fetching data from database...</p>
        </div>
      )}

      {!isLoading && filteredReimbursements.length === 0 && (
        <div className="text-center py-12">
          <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No Reimbursements Found
          </h3>
          <p className="text-gray-500">
            {statusFilter !== 'all' || companyFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'No reimbursement requests have been submitted yet'}
          </p>
        </div>
      )}

      {/* Loading Modal */}
      {isLoadingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[#5A7A8F]" />
            <span>Loading expense details...</span>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedReimbursement && selectedExpense && (
        <ReimbursementApprovalModal
          reimbursement={selectedReimbursement}
          expense={selectedExpense}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedReimbursement(null);
            setSelectedExpense(null);
          }}
          onExpenseUpdated={(updatedExpense) => {
            setSelectedExpense(updatedExpense);
            setRefreshKey((prev) => prev + 1);
          }}
        />
      )}

      {/* Error state when expense not found */}
      {showApprovalModal && selectedReimbursement && !selectedExpense && !isLoadingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Expense Not Found</h3>
            <p className="text-gray-600 mb-4">
              The expense associated with this reimbursement could not be found.
            </p>
            <button
              onClick={() => {
                setShowApprovalModal(false);
                setSelectedReimbursement(null);
              }}
              className="px-4 py-2 bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4a6a7f]"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </AppShell>
  );
}
