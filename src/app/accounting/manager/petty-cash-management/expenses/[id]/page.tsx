'use client';

import { useState, useMemo, useCallback } from 'react';
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

// Data imports
import { getExpenseById, updateExpense } from '@/data/petty-cash/expenses';
import { getActiveCompanies } from '@/data/company/companies';
import { getAccountsByType } from '@/data/accounting/chartOfAccounts';
import type { VatType } from '@/data/petty-cash/types';
import {
  formatCurrency,
  formatDate,
  VAT_TYPE_OPTIONS,
} from '@/lib/petty-cash/utils';

export default function PettyCashExpenseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const expenseId = params.id as string;

  // Fetch expense data
  const expense = useMemo(() => getExpenseById(expenseId), [expenseId]);

  // Form state for editable fields
  const [companyId, setCompanyId] = useState(expense?.companyId || '');
  const [expenseAccountCode, setExpenseAccountCode] = useState(expense?.expenseAccountCode || '');
  const [vatType, setVatType] = useState<VatType>(expense?.accountingVatType || 'no_vat');
  const [vatRate, setVatRate] = useState(expense?.accountingVatRate || 7);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load dropdown data
  const companies = useMemo(() => getActiveCompanies(), []);
  const expenseAccounts = useMemo(() => getAccountsByType('Expense'), []);

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

    try {
      const selectedCompany = companies.find((c) => c.id === companyId);
      const selectedAccount = expenseAccounts.find((a) => a.code === expenseAccountCode);

      updateExpense(expense.id, {
        companyId,
        companyName: selectedCompany?.name || '',
        expenseAccountCode,
        expenseAccountName: selectedAccount?.name || '',
        accountingVatType: vatType,
        accountingVatRate: vatRate,
        accountingCompletedBy: 'current-user',
        accountingCompletedAt: new Date().toISOString(),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [expense, companyId, expenseAccountCode, vatType, vatRate, companies, expenseAccounts]);

  // Handle not found
  if (!expense) {
    return (
      <AppShell currentRole="manager">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Expense Not Found</h2>
          <p className="text-gray-500 mb-4">The expense you're looking for doesn't exist.</p>
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
    <AppShell currentRole="manager">
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
              expense.receiptStatus === 'original_received'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {expense.receiptStatus === 'original_received' ? 'Receipt Received' : 'Receipt Pending'}
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
                  <p className="text-sm font-medium text-gray-900">{expense.projectName || '-'}</p>
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
                  value={companyId}
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
