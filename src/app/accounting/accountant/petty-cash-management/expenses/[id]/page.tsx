'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/accounting/AppShell';
import {
  ArrowLeft,
  Calendar,
  User,
  Building2,
  FolderOpen,
  FileText,
  Receipt,
  ExternalLink,
  Save,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// Supabase API imports
import { pettyCashApi } from '@/lib/supabase/api/pettyCash';
import { companiesApi } from '@/lib/supabase/api/companies';
import { projectsApi } from '@/lib/supabase/api/projects';
import { chartOfAccountsApi } from '@/lib/supabase/api/chartOfAccounts';
import type { VatType } from '@/data/petty-cash/types';
import type { Database } from '@/lib/supabase/database.types';
import {
  formatCurrency,
  formatDate,
  VAT_TYPE_OPTIONS,
} from '@/lib/petty-cash/utils';

// Types from Supabase
type DbExpense = Database['public']['Tables']['petty_cash_expenses']['Row'];
type DbCompany = Database['public']['Tables']['companies']['Row'];
type DbProject = Database['public']['Tables']['projects']['Row'];

// Frontend-friendly expense type
interface FrontendExpense {
  id: string;
  expenseNumber: string;
  walletId: string;
  walletHolderName: string;
  companyId: string;
  companyName: string;
  projectId: string;
  projectName: string;
  expenseDate: string;
  description: string;
  amount: number;
  status: string;
  receiptStatus: string;
  expenseAccountCode?: string;
  accountingVatType?: VatType;
  accountingVatRate?: number;
  attachments: Array<{ id: string; name: string; url: string; size: number; type: string }>;
}

// Account type
interface Account {
  code: string;
  name: string;
  type: string;
}

export default function PettyCashExpenseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const expenseId = params.id as string;

  // Loading states
  const [isLoadingExpense, setIsLoadingExpense] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Expense state
  const [expense, setExpense] = useState<FrontendExpense | null>(null);

  // Form state for editable fields
  const [companyId, setCompanyId] = useState('');
  const [expenseAccountCode, setExpenseAccountCode] = useState('');
  const [vatType, setVatType] = useState<VatType>('no_vat');
  const [vatRate, setVatRate] = useState(7);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Dropdown data
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);

  // Load expense from Supabase
  useEffect(() => {
    async function loadExpense() {
      setIsLoadingExpense(true);
      setLoadError(null);
      try {
        const dbExpense = await pettyCashApi.getExpenseById(expenseId);
        if (!dbExpense) {
          setLoadError('Expense not found');
          setExpense(null);
        } else {
          // We need to get wallet info to show holder name
          const wallet = await pettyCashApi.getWalletById(dbExpense.wallet_id);

          // Cast to extended type that includes expense_account_code (added in migration 037)
          const extendedExpense = dbExpense as typeof dbExpense & { expense_account_code?: string | null };

          const frontendExpense: FrontendExpense = {
            id: dbExpense.id,
            expenseNumber: dbExpense.expense_number,
            walletId: dbExpense.wallet_id,
            walletHolderName: wallet?.user_name || 'Unknown',
            companyId: dbExpense.company_id || '',
            companyName: '', // Will be filled from companies list
            projectId: dbExpense.project_id,
            projectName: '', // Will be filled from projects list
            expenseDate: dbExpense.expense_date,
            description: dbExpense.description || '',
            amount: dbExpense.amount || 0,
            status: dbExpense.status,
            receiptStatus: 'pending', // Not in current schema
            expenseAccountCode: extendedExpense.expense_account_code || undefined,
            attachments: [], // Not in current schema
          };
          setExpense(frontendExpense);

          // Initialize form fields
          setCompanyId(frontendExpense.companyId);
          setExpenseAccountCode(extendedExpense.expense_account_code || '');
        }
      } catch (error) {
        console.error('Failed to load expense:', error);
        setLoadError('Failed to load expense');
      } finally {
        setIsLoadingExpense(false);
      }
    }

    loadExpense();
  }, [expenseId]);

  // Load dropdown data from Supabase
  useEffect(() => {
    async function loadDropdownData() {
      try {
        const [companiesData, projectsData, accountsData, inventoryAccount] = await Promise.all([
          companiesApi.getActive(),
          projectsApi.getActive(),
          chartOfAccountsApi.getByType('expense'),
          chartOfAccountsApi.getByCode('1200'),
        ]);

        setCompanies(companiesData.map((c: DbCompany) => ({ id: c.id, name: c.name })));
        setProjects(projectsData.map((p: DbProject) => ({ id: p.id, name: p.name })));

        // Include GL 1200 (Inventory) so accountants can classify PC expenses as inventory
        const accounts = accountsData.map((a) => ({
          code: a.code,
          name: a.name,
          type: a.account_type,
        }));
        if (inventoryAccount) {
          accounts.unshift({
            code: inventoryAccount.code,
            name: inventoryAccount.name,
            type: inventoryAccount.account_type,
          });
        }
        setExpenseAccounts(accounts);
      } catch (error) {
        console.error('Failed to load dropdown data:', error);
      } finally {
        setIsLoadingData(false);
      }
    }

    loadDropdownData();
  }, []);

  // Get company and project names for display
  const companyName = useMemo(() => {
    return companies.find(c => c.id === expense?.companyId)?.name || '';
  }, [companies, expense?.companyId]);

  const projectName = useMemo(() => {
    return projects.find(p => p.id === expense?.projectId)?.name || '';
  }, [projects, expense?.projectId]);

  // Calculate VAT breakdown
  const vatBreakdown = useMemo(() => {
    const amount = expense?.amount || 0;
    const rate = vatRate / 100;

    if (vatType === 'no_vat') {
      return {
        preVatAmount: amount,
        vatAmount: 0,
        totalAmount: amount,
      };
    } else if (vatType === 'include') {
      // VAT is included in the amount, need to back-calculate
      const preVatAmount = amount / (1 + rate);
      const vatAmount = amount - preVatAmount;
      return {
        preVatAmount,
        vatAmount,
        totalAmount: amount,
      };
    } else {
      // VAT excluded - add VAT on top
      const vatAmount = amount * rate;
      return {
        preVatAmount: amount,
        vatAmount,
        totalAmount: amount + vatAmount,
      };
    }
  }, [expense?.amount, vatType, vatRate]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!expense) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      // Update expense in Supabase (including expense_account_code)
      // Note: expense_account_code column added in migration 037
      await pettyCashApi.updateExpense(expense.id, {
        company_id: companyId,
        expense_account_code: expenseAccountCode || null,
      } as Parameters<typeof pettyCashApi.updateExpense>[1] & { expense_account_code?: string | null });

      // Update local state
      setExpense((prev) => prev ? {
        ...prev,
        companyId,
        companyName: companies.find(c => c.id === companyId)?.name || '',
        expenseAccountCode: expenseAccountCode || undefined,
      } : null);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save expense:', error);
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [expense, companyId, expenseAccountCode, companies]);

  // Loading state
  if (isLoadingExpense || isLoadingData) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#5A7A8F] mb-4" />
          <p className="text-gray-500">Loading expense details...</p>
        </div>
      </AppShell>
    );
  }

  // Handle not found
  if (!expense || loadError) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Expense Not Found</h2>
          <p className="text-gray-500 mb-4">{loadError || "The expense you're looking for doesn't exist."}</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f]"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Expense Details
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {expense.expenseNumber}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
              expense.status === 'submitted'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {expense.status === 'submitted' ? 'Submitted' : 'Draft'}
          </span>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Expense Info */}
        <div className="space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Expense Information</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Expense Date</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(expense.expenseDate)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Wallet Holder</p>
                  <p className="text-sm font-medium text-gray-900">{expense.walletHolderName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <FolderOpen className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Project</p>
                  <p className="text-sm font-medium text-gray-900">{projectName || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Receipt className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
                </div>
              </div>

              {expense.description && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-700">{expense.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Attachments Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Attachments</h3>
            </div>
            <div className="p-4">
              {expense.attachments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No attachments</p>
              ) : (
                <div className="space-y-2">
                  {expense.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{att.name}</p>
                          <p className="text-xs text-gray-500">
                            {(att.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Accounting Details (Editable) */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Accounting Details</h3>
            </div>
            <div className="p-4 space-y-4">
              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <select
                  value={companyId || ''}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expense Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expense Account
                </label>
                <select
                  value={expenseAccountCode}
                  onChange={(e) => setExpenseAccountCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                >
                  <option value="">Select Expense Account</option>
                  {expenseAccounts.map((account) => (
                    <option key={account.code} value={account.code}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* VAT Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VAT Type
                  </label>
                  <select
                    value={vatType}
                    onChange={(e) => setVatType(e.target.value as VatType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  >
                    {VAT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VAT Rate (%)
                  </label>
                  <input
                    type="number"
                    value={vatRate}
                    onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                    disabled={vatType === 'no_vat'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100"
                  />
                </div>
              </div>

              {/* Payment Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pre-VAT Amount:</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(vatBreakdown.preVatAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      VAT {vatType !== 'no_vat' ? `(${vatRate}%)` : ''}:
                    </span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(vatBreakdown.vatAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-700">Total Amount:</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(vatBreakdown.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Save Success Message */}
              {saveSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  Changes saved successfully!
                </div>
              )}

              {/* Save Error Message */}
              {saveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {saveError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => router.back()}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
