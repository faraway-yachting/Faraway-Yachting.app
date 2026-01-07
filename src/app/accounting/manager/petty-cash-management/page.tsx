'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/accounting/AppShell';
import { KPICard } from '@/components/accounting/KPICard';
import { DataTable } from '@/components/accounting/DataTable';
import TopUpModal from '@/components/petty-cash/TopUpModal';
import ReimbursementApprovalModal from '@/components/petty-cash/ReimbursementApprovalModal';
import {
  Wallet,
  Users,
  DollarSign,
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
  Check,
  Square,
  Minus,
} from 'lucide-react';

// Data imports
import {
  getAllWallets,
  getLowBalanceWallets,
  getTotalWalletBalance,
  getWalletById,
  addToWallet,
  getAllTransactions,
} from '@/data/petty-cash/wallets';
import { getActiveCompanies } from '@/data/company/companies';
import { getAllExpenses, getExpenseById, updateReceiptStatus } from '@/data/petty-cash/expenses';
import {
  getAllReimbursements,
  getPendingReimbursements,
  getTotalPendingReimbursements,
  approveReimbursement,
  processReimbursementPayment,
  rejectReimbursement,
} from '@/data/petty-cash/reimbursements';
import { createTopUp, completeTopUp } from '@/data/petty-cash/topups';
import type { PettyCashWallet, PettyCashReimbursement, PettyCashExpense, PettyCashTransaction, TransactionType, ReceiptStatus } from '@/data/petty-cash/types';
import {
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusColor,
  getCurrentMonthStart,
  getCurrentMonthEnd,
} from '@/lib/petty-cash/utils';

export default function PettyCashManagementPage() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedWallet, setSelectedWallet] = useState<PettyCashWallet | null>(null);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedReimbursement, setSelectedReimbursement] = useState<PettyCashReimbursement | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<PettyCashExpense | null>(null);

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

  // Fetch data
  const wallets = useMemo(() => getAllWallets(), [refreshKey]);
  const companies = useMemo(() => getActiveCompanies(), []);
  const expenses = useMemo(() => getAllExpenses(), [refreshKey]);
  const reimbursements = useMemo(() => getAllReimbursements(), [refreshKey]);
  const pendingReimbursements = useMemo(() => getPendingReimbursements(), [refreshKey]);
  const lowBalanceWallets = useMemo(() => getLowBalanceWallets(), [refreshKey]);
  const allTransactions = useMemo(() => getAllTransactions(), [refreshKey]);

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

  // Calculate stats
  const totalBalance = useMemo(() => getTotalWalletBalance(), [refreshKey]);
  const pendingStats = useMemo(() => getTotalPendingReimbursements(), [refreshKey]);

  // Monthly expenses calculation
  const monthlyExpenses = useMemo(() => {
    const monthStart = getCurrentMonthStart();
    const monthEnd = getCurrentMonthEnd();
    return expenses
      .filter((e) => e.expenseDate >= monthStart && e.expenseDate <= monthEnd)
      .reduce((sum, e) => sum + e.netAmount, 0);
  }, [expenses]);

  // Group expenses by company
  const expensesByCompany = useMemo(() => {
    const grouped = new Map<string, { companyName: string; total: number; count: number }>();
    expenses.forEach((exp) => {
      const existing = grouped.get(exp.companyId) || {
        companyName: exp.companyName,
        total: 0,
        count: 0,
      };
      grouped.set(exp.companyId, {
        companyName: exp.companyName,
        total: existing.total + exp.netAmount,
        count: existing.count + 1,
      });
    });
    return Array.from(grouped.entries()).map(([companyId, data]) => ({
      companyId,
      ...data,
    }));
  }, [expenses]);

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
      adjustmentAmount?: number,
      adjustmentReason?: string
    ) => {
      // Approve the reimbursement
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
    { key: 'userRole', header: 'Role' },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right' as const,
      render: (row: PettyCashWallet) => {
        const isLow =
          row.lowBalanceThreshold && row.balance <= row.lowBalanceThreshold;
        return (
          <span className={isLow ? 'text-orange-600 font-medium' : ''}>
            {formatCurrency(row.balance, row.currency)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      render: (row: PettyCashWallet) => (
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(row.status)}`}>
          {getStatusLabel(row.status)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: (row: PettyCashWallet) => (
        <button
          onClick={() => {
            setSelectedWallet(row);
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

  return (
    <AppShell currentRole="manager">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Petty Cash Management
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor all petty cash wallets, approve reimbursements, and manage
          top-ups
        </p>
      </div>

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
          title="Pending Reimbursements"
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
          Approve Reimbursements
          {pendingStats.count > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-white/20 rounded-full">
              {pendingStats.count}
            </span>
          )}
        </button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pending Reimbursements */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Pending Reimbursements
            </h3>
            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
              {pendingReimbursements.length} pending
            </span>
          </div>
          <div className="p-4">
            {pendingReimbursements.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No pending reimbursements
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
                    View all {pendingReimbursements.length} pending
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Expense Summary by Company */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Expenses by Company
            </h3>
          </div>
          <div className="p-4">
            {expensesByCompany.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No expenses recorded
              </p>
            ) : (
              <div className="space-y-3">
                {expensesByCompany.map((item) => (
                  <div
                    key={item.companyId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#5A7A8F]/10 rounded-lg">
                        <Building2 className="h-4 w-4 text-[#5A7A8F]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.companyName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.count} expense{item.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(item.total)}
                    </p>
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
