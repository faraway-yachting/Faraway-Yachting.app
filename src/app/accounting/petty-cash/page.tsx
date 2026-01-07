'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/accounting/AppShell';
import { KPICard } from '@/components/accounting/KPICard';
import { DataTable } from '@/components/accounting/DataTable';
import WalletSummaryCard from '@/components/petty-cash/WalletSummaryCard';
import ExpenseForm from '@/components/petty-cash/ExpenseForm';
import ExpenseFilters, { type FilterValues } from '@/components/petty-cash/ExpenseFilters';
import {
  Wallet,
  Plus,
  Clock,
  Receipt,
  TrendingDown,
  FileText,
} from 'lucide-react';

// Data imports
import { getWalletByUserId, deductFromWallet } from '@/data/petty-cash/wallets';
import {
  getExpensesByWallet,
  createSimplifiedExpense,
  getMonthlyExpensesForWallet,
  type SimplifiedExpenseInput,
} from '@/data/petty-cash/expenses';
import {
  getReimbursementsByWallet,
  getPendingAmountForWallet,
  createReimbursement,
} from '@/data/petty-cash/reimbursements';
import { notifyAccountantNewReimbursement } from '@/data/notifications/notifications';
import { getTopUpsByWallet } from '@/data/petty-cash/topups';
import { getActiveCompanies } from '@/data/company/companies';
import { getAllProjects } from '@/data/project/projects';
import type { PettyCashExpense, PettyCashReimbursement } from '@/data/petty-cash/types';
import {
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusColor,
  buildTransactionHistory,
} from '@/lib/petty-cash/utils';

// Mock current user ID - in real app this would come from auth
const CURRENT_USER_ID = 'user-001';

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
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'reimbursements' | 'history'>('expenses');
  const [refreshKey, setRefreshKey] = useState(0);

  // Filter states
  const [expenseFilters, setExpenseFilters] = useState<FilterValues>(initialFilters);
  const [reimbursementFilters, setReimbursementFilters] = useState<FilterValues>(initialFilters);

  // Get companies and projects for filters
  const companies = useMemo(() => getActiveCompanies(), []);
  const allProjects = useMemo(() => getAllProjects(), []);

  // Get current user's wallet
  const wallet = useMemo(
    () => getWalletByUserId(CURRENT_USER_ID),
    [refreshKey]
  );

  // Get wallet data
  const expenses = useMemo(
    () => (wallet ? getExpensesByWallet(wallet.id) : []),
    [wallet, refreshKey]
  );

  const reimbursements = useMemo(
    () => (wallet ? getReimbursementsByWallet(wallet.id) : []),
    [wallet, refreshKey]
  );

  const topUps = useMemo(
    () => (wallet ? getTopUpsByWallet(wallet.id) : []),
    [wallet, refreshKey]
  );

  // Apply expense filters
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (expenseFilters.dateFrom && expense.expenseDate < expenseFilters.dateFrom) {
        return false;
      }
      if (expenseFilters.dateTo && expense.expenseDate > expenseFilters.dateTo) {
        return false;
      }
      if (expenseFilters.status && expense.receiptStatus !== expenseFilters.status) {
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
  }, [expenses, expenseFilters]);

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

  // Calculate stats
  const pendingReimbursement = useMemo(
    () => (wallet ? getPendingAmountForWallet(wallet.id) : 0),
    [wallet, refreshKey]
  );

  const monthlyExpenses = useMemo(() => {
    if (!wallet) return 0;
    const now = new Date();
    return getMonthlyExpensesForWallet(wallet.id, now.getFullYear(), now.getMonth() + 1);
  }, [wallet, refreshKey]);

  // Build transaction history
  const transactionHistory = useMemo(
    () => buildTransactionHistory(expenses, topUps, reimbursements),
    [expenses, topUps, reimbursements]
  );

  // Handle expense creation (simplified)
  const handleCreateExpense = useCallback(
    (expenseData: SimplifiedExpenseInput) => {
      if (!wallet) return;

      // Create the simplified expense
      const expense = createSimplifiedExpense(expenseData);

      // Deduct from wallet
      deductFromWallet(wallet.id, expense.netAmount);

      // Create reimbursement request
      const reimbursement = createReimbursement(
        expense.id,
        expense.expenseNumber,
        wallet.id,
        wallet.userName,
        expense.companyId,
        expense.companyName,
        expense.netAmount
      );

      // Send notification to accountant
      notifyAccountantNewReimbursement(
        reimbursement.id,
        reimbursement.reimbursementNumber,
        wallet.userName,
        expense.netAmount
      );

      // Close form and refresh
      setShowExpenseForm(false);
      setRefreshKey((prev) => prev + 1);
    },
    [wallet]
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
  const receiptStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'original_received', label: 'Received' },
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
      render: (row: PettyCashExpense) => (
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
      render: (row: PettyCashExpense) => formatDate(row.expenseDate),
    },
    { key: 'companyName', header: 'Company' },
    { key: 'projectName', header: 'Project' },
    { key: 'description', header: 'Description' },
    {
      key: 'netAmount',
      header: 'Amount',
      align: 'right' as const,
      render: (row: PettyCashExpense) => formatCurrency(row.netAmount),
    },
    {
      key: 'receiptStatus',
      header: 'Receipt',
      align: 'center' as const,
      render: (row: PettyCashExpense) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
            row.receiptStatus === 'original_received'
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {row.receiptStatus === 'original_received' ? 'Received' : 'Pending'}
        </span>
      ),
    },
  ];

  // Table columns for reimbursements
  const reimbursementColumns = [
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

  // Table columns for transaction history
  const historyColumns = [
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

  if (!wallet) {
    return (
      <AppShell currentRole="petty-cash">
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
    <AppShell currentRole="petty-cash">
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
          wallet={wallet}
          pendingReimbursement={pendingReimbursement}
          monthlyExpenses={monthlyExpenses}
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
          title="Pending Receipts"
          value={expenses.filter((e) => e.receiptStatus === 'pending').length}
          icon={FileText}
          variant={
            expenses.filter((e) => e.receiptStatus === 'pending').length > 0
              ? 'warning'
              : 'default'
          }
          subtitle="Original not received"
        />
        <KPICard
          title="This Month"
          value={formatCurrency(monthlyExpenses)}
          icon={TrendingDown}
          subtitle="Expenses"
        />
        <KPICard
          title="Pending Reimb."
          value={reimbursements.filter((r) => r.status === 'pending').length}
          icon={Clock}
          variant={
            reimbursements.filter((r) => r.status === 'pending').length > 0
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
          disabled={wallet.status === 'closed'}
          className="inline-flex items-center gap-2 rounded-lg bg-[#5A7A8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a6a7f] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          New Expense
        </button>
        {wallet.status === 'closed' && (
          <span className="ml-3 text-sm text-red-600">
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
            statusOptions={receiptStatusOptions}
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

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <ExpenseForm
          walletId={wallet.id}
          walletHolderName={wallet.userName}
          onSave={handleCreateExpense}
          onCancel={() => setShowExpenseForm(false)}
        />
      )}
    </AppShell>
  );
}
