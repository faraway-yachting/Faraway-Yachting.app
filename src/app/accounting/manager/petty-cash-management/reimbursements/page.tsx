'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/accounting/AppShell';
import { DataTable } from '@/components/accounting/DataTable';
import dynamic from 'next/dynamic';

const ReimbursementApprovalModal = dynamic(() =>
  import('@/components/petty-cash/ReimbursementApprovalModal')
);
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
  ChevronDown,
  ChevronUp,
  History,
  Landmark,
  ArrowUpCircle,
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
import { pettyCashApi, type PettyCashReimbursement as DbReimbursement, type PettyCashBatch } from '@/lib/supabase/api/pettyCash';
import { companiesApi } from '@/lib/supabase/api/companies';
import { projectsApi } from '@/lib/supabase/api/projects';
import { bankAccountsApi } from '@/lib/supabase/api/bankAccounts';
import { useAuth } from '@/components/auth/AuthProvider';
import { notifyWalletHolderClaimPaid, notifyWalletHolderClaimRejected } from '@/data/notifications/notifications';

type StatusFilter = 'all' | 'pending' | 'approved' | 'paid' | 'rejected';
type GroupBy = 'none' | 'company' | 'holder' | 'status' | 'bank';

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
  projectName?: string,
  bankAccountName?: string
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
    bankAccountName: bankAccountName,
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
  const [bankAccountFilter, setBankAccountFilter] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('company');

  // Modal state
  const [selectedReimbursement, setSelectedReimbursement] = useState<PettyCashReimbursement | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<PettyCashExpense | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Supabase data state
  const [isLoading, setIsLoading] = useState(true);
  const [dbReimbursements, setDbReimbursements] = useState<ReimbursementWithProject[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [bankAccounts, setBankAccounts] = useState<{ id: string; name: string }[]>([]);
  const [paidBatches, setPaidBatches] = useState<(PettyCashBatch & { companyName?: string; bankAccountName?: string })[]>([]);
  const [showTransferHistory, setShowTransferHistory] = useState(false);

  // Transfer management state
  const [transferSummary, setTransferSummary] = useState<TransferGroup[]>([]);
  const [selectedTransfers, setSelectedTransfers] = useState<Set<string>>(new Set());
  const [isProcessingTransfer, setIsProcessingTransfer] = useState(false);

  // Load data from Supabase
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Fetch reimbursements, wallets, expenses, companies, projects, bank accounts, and batches in parallel
        const [reimbursementsData, walletsData, expensesData, companiesData, projectsData, bankAccountsData, batchesData, transferSummaryData] = await Promise.all([
          pettyCashApi.getAllReimbursements(),
          pettyCashApi.getAllWallets(),
          pettyCashApi.getExpensesByStatus('submitted'),
          companiesApi.getAll(),
          projectsApi.getAll(),
          bankAccountsApi.getAll(),
          pettyCashApi.getBatchesByStatus('paid'),
          pettyCashApi.getApprovedReimbursementsGroupedForTransfer(),
        ]);

        // Create lookup maps
        const walletMap = new Map(walletsData.map(w => [w.id, w]));
        const expenseMap = new Map(expensesData.map(e => [e.id, e]));
        const companyMap = new Map(companiesData.map(c => [c.id, c]));
        const projectMap = new Map(projectsData.map(p => [p.id, p]));
        const bankAccountMap = new Map(bankAccountsData.map(b => [b.id, b]));

        // Set paid batches with enriched names (already filtered to 'paid' by API)
        const enrichedBatches = batchesData
          .map(b => ({
            ...b,
            companyName: companyMap.get(b.company_id)?.name || 'Unknown',
            bankAccountName: bankAccountMap.get(b.bank_account_id)?.account_name || 'Unknown',
          }));
        setPaidBatches(enrichedBatches);

        // Find submitted expenses that don't have reimbursements
        const existingExpenseIds = new Set(reimbursementsData.map(r => r.expense_id));
        const submittedExpensesWithoutReimbursement = expensesData.filter(
          e => e.status === 'submitted' && !existingExpenseIds.has(e.id) && e.company_id
        );

        // Auto-create reimbursements in batch (single INSERT instead of N individual calls)
        let createdReimbursements: DbReimbursement[] = [];
        if (submittedExpensesWithoutReimbursement.length > 0) {
          try {
            createdReimbursements = await pettyCashApi.batchCreateReimbursements(
              submittedExpensesWithoutReimbursement.map(expense => ({
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
            console.log(`Auto-created ${createdReimbursements.length} reimbursements in batch`);
          } catch (err) {
            console.log('Batch reimbursement creation error:', err);
          }
        }

        // Combine original and newly created reimbursements
        const allReimbursementsData = [
          ...reimbursementsData,
          ...createdReimbursements,
        ];

        // Transform reimbursements
        const transformed = allReimbursementsData.map(r => {
          const wallet = walletMap.get(r.wallet_id);
          const expense = expenseMap.get(r.expense_id);
          const company = r.company_id ? companyMap.get(r.company_id) : null;
          const project = expense?.project_id ? projectMap.get(expense.project_id) : null;

          const bankAccount = r.bank_account_id ? bankAccountMap.get(r.bank_account_id) : null;

          return transformReimbursement(
            r,
            wallet?.user_name || 'Unknown',
            company?.name || 'Unknown',
            expense?.expense_number || 'Unknown',
            expense?.project_id || undefined,
            project?.name || undefined,
            bankAccount?.account_name || undefined
          );
        });

        setDbReimbursements(transformed);
        setCompanies(companiesData.map(c => ({ id: c.id, name: c.name })));
        setBankAccounts(bankAccountsData.map(b => ({ id: b.id, name: b.account_name })));
        setTransferSummary(transferSummaryData);

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

    if (bankAccountFilter !== 'all') {
      filtered = filtered.filter((r) => r.bankAccountId === bankAccountFilter);
    }

    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [allReimbursements, statusFilter, companyFilter, bankAccountFilter]);

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
        case 'bank':
          key = r.bankAccountName || 'Not Assigned';
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
            companyId,
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

  // Handle transfer - creates top-up and batch, marks reimbursements as paid
  const handleTransfer = useCallback(async () => {
    if (selectedTransfers.size === 0) {
      alert('Please select at least one transfer group.');
      return;
    }

    setIsProcessingTransfer(true);

    try {
      for (const key of selectedTransfers) {
        const [walletId, bankAccountId] = key.split('::');
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

      setSelectedTransfers(new Set());
      setRefreshKey((prev) => prev + 1);
      alert('Transfer completed successfully! Wallet balances have been updated.');
    } catch (error) {
      console.error('Failed to process transfer:', error);
      alert('Failed to process transfer. Please try again.');
    } finally {
      setIsProcessingTransfer(false);
    }
  }, [selectedTransfers, transferSummary, user?.id]);

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
    { key: 'reimbursementNumber', header: 'Number', primary: true },
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
      hideOnMobile: true,
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
      key: 'paymentDate',
      header: 'Paid On',
      hideOnMobile: true,
      render: (row: ReimbursementWithProject) => row.paymentDate ? formatDate(row.paymentDate) : '-',
    },
    {
      key: 'paymentReference',
      header: 'Reference',
      hideOnMobile: true,
      render: (row: ReimbursementWithProject) => (
        <span className="text-gray-500 text-xs">{row.paymentReference || '-'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Requested',
      hideOnMobile: true,
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

          {/* Bank Account Filter */}
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-gray-400" />
            <select
              value={bankAccountFilter}
              onChange={(e) => setBankAccountFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
            >
              <option value="all">All Bank Accounts</option>
              {bankAccounts.map((ba) => (
                <option key={ba.id} value={ba.id}>
                  {ba.name}
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
                { value: 'bank', icon: Landmark, label: 'Bank' },
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
        {(statusFilter !== 'all' || companyFilter !== 'all' || bankAccountFilter !== 'all') && (
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
            {bankAccountFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                Bank: {bankAccounts.find((b) => b.id === bankAccountFilter)?.name}
                <button
                  onClick={() => setBankAccountFilter('all')}
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
                setBankAccountFilter('all');
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

      {/* Transfer Summary - Execute transfers for approved reimbursements */}
      {!isLoading && transferSummary.length > 0 && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
              <h3 className="text-sm font-semibold text-gray-900">Transfer Summary</h3>
            </div>
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
              {transferSummary.reduce((sum, wg) => sum + wg.bankAccountGroups.reduce((s, bg) => s + bg.reimbursementIds.length, 0), 0)} ready to transfer
            </span>
          </div>
          <div className="p-4 space-y-4">
            {transferSummary.map((walletGroup) => (
              <div
                key={walletGroup.walletId}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
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
                            <div className="font-medium text-gray-900">{bankGroup.companyName}</div>
                            <div className="text-xs text-gray-500">{bankGroup.bankAccountName}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">{formatCurrency(bankGroup.amount)}</div>
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
        </div>
      )}

      {/* Transfer History */}
      {!isLoading && paidBatches.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowTransferHistory(!showTransferHistory)}
            className="w-full flex items-center justify-between bg-white rounded-lg border p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <History className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-gray-900">Transfer History</h3>
                <p className="text-xs text-gray-500">
                  {paidBatches.length} completed transfer{paidBatches.length !== 1 ? 's' : ''} •{' '}
                  {formatCurrency(paidBatches.reduce((sum, b) => sum + b.total_amount, 0))}
                </p>
              </div>
            </div>
            {showTransferHistory ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {showTransferHistory && (
            <div className="mt-2 bg-white rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Batch #</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Wallet Holder</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Company</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Bank Account</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Claims</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Paid On</th>
                  </tr>
                </thead>
                <tbody>
                  {paidBatches
                    .sort((a, b) => new Date(b.payment_date || b.created_at).getTime() - new Date(a.payment_date || a.created_at).getTime())
                    .map((batch) => (
                    <tr key={batch.id} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{batch.batch_number}</td>
                      <td className="px-4 py-3 text-gray-700">{batch.wallet_holder_name}</td>
                      <td className="px-4 py-3 text-gray-700 hidden sm:table-cell">{batch.companyName}</td>
                      <td className="px-4 py-3 text-gray-700 hidden sm:table-cell">{batch.bankAccountName}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(batch.total_amount)}</td>
                      <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">{batch.reimbursement_count}</td>
                      <td className="px-4 py-3 text-gray-600">{batch.payment_date ? formatDate(batch.payment_date) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
