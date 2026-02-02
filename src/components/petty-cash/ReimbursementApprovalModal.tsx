'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { X, Check, XCircle, Loader2, FileText, ExternalLink, Edit3, Download, Eye, Image as ImageIcon } from 'lucide-react';
import type { PettyCashReimbursement, PettyCashExpense, VatType } from '@/data/petty-cash/types';
import { companiesApi, bankAccountsApi } from '@/lib/supabase/api';
import type { Database } from '@/lib/supabase/database.types';
import { getAccountsByType } from '@/data/accounting/chartOfAccounts';
import { updateExpense } from '@/data/petty-cash/expenses';
import { VAT_TYPE_OPTIONS } from '@/lib/petty-cash/utils';

type Company = Database['public']['Tables']['companies']['Row'];
type BankAccount = Database['public']['Tables']['bank_accounts']['Row'];
import {
  formatCurrency,
  formatDate,
  getTodayISO,
  getStatusColor,
  getStatusLabel,
} from '@/lib/petty-cash/utils';

interface ReimbursementApprovalModalProps {
  reimbursement: PettyCashReimbursement;
  expense: PettyCashExpense;
  onApprove: (
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
  ) => void;
  onReject: (reimbursementId: string, reason: string) => void;
  onClose: () => void;
  onExpenseUpdated?: (expense: PettyCashExpense) => void;
  onSaveEdit?: (
    reimbursementId: string,
    data: {
      companyId: string;
      expenseAccountCode: string;
      vatType: VatType;
      vatRate: number;
      bankAccountId: string;
      paymentDate: string;
    }
  ) => Promise<void>;
}

export default function ReimbursementApprovalModal({
  reimbursement,
  expense,
  onApprove,
  onReject,
  onClose,
  onExpenseUpdated,
  onSaveEdit,
}: ReimbursementApprovalModalProps) {
  const [mode, setMode] = useState<'view' | 'reject' | 'edit'>('view');
  const [bankAccountId, setBankAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayISO());
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Expense edit state
  const [editCompanyId, setEditCompanyId] = useState(expense.companyId || '');
  const [editExpenseAccountCode, setEditExpenseAccountCode] = useState(expense.expenseAccountCode || '');
  const [editVatType, setEditVatType] = useState<VatType>(expense.accountingVatType || 'no_vat');
  const [editVatRate, setEditVatRate] = useState(expense.accountingVatRate || 7);

  // Attachment preview state
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; name: string; type: string } | null>(null);

  // Companies and bank accounts from Supabase
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allBankAccounts, setAllBankAccounts] = useState<BankAccount[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load companies and bank accounts from Supabase
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const [companiesData, bankAccountsData] = await Promise.all([
          companiesApi.getActive(),
          bankAccountsApi.getActive(),
        ]);
        setCompanies(companiesData);
        setAllBankAccounts(bankAccountsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, []);

  // Filter bank accounts by selected company (use editCompanyId for filtering)
  const bankAccounts = useMemo(() => {
    if (!editCompanyId) {
      return allBankAccounts; // Show all if no company selected
    }
    return allBankAccounts.filter(acc => acc.company_id === editCompanyId);
  }, [allBankAccounts, editCompanyId]);

  // Get expense accounts from CoA for editing
  const expenseAccounts = useMemo(() => getAccountsByType('Expense'), []);

  // Calculate final amount
  const finalAmount = useMemo(() => {
    const adjustment = parseFloat(adjustmentAmount) || 0;
    return reimbursement.amount + adjustment;
  }, [reimbursement.amount, adjustmentAmount]);

  // Calculate VAT breakdown for edit form
  const vatBreakdown = useMemo(() => {
    const amount = expense.amount || 0;
    const rate = editVatRate / 100;

    if (editVatType === 'no_vat') {
      return {
        preVatAmount: amount,
        vatAmount: 0,
        totalAmount: amount,
      };
    } else if (editVatType === 'include') {
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
  }, [expense.amount, editVatType, editVatRate]);

  // Handle approve (single-step approval)
  const handleApprove = async () => {
    const newErrors: Record<string, string> = {};

    // Validate all required fields in single form
    if (!editCompanyId) {
      newErrors.editCompany = 'Please select a company';
    }
    if (!editExpenseAccountCode) {
      newErrors.editExpenseAccount = 'Please select an expense account';
    }
    if (!bankAccountId) {
      newErrors.bankAccountId = 'Please select a bank account';
    }
    if (!paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }
    if (adjustmentAmount && !adjustmentReason) {
      newErrors.adjustmentReason = 'Please provide a reason for the adjustment';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsProcessing(true);
    try {
      const selectedAccount = bankAccounts.find((a) => a.id === bankAccountId);
      onApprove(
        reimbursement.id,
        bankAccountId,
        selectedAccount?.account_name || '',
        paymentDate,
        editExpenseAccountCode,
        editCompanyId,
        editVatType,
        editVatRate,
        adjustmentAmount ? parseFloat(adjustmentAmount) : undefined,
        adjustmentReason || undefined
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle save edit for approved/paid claims
  const handleSaveEdit = async () => {
    if (!onSaveEdit) return;

    const newErrors: Record<string, string> = {};
    if (!editCompanyId) {
      newErrors.editCompany = 'Please select a company';
    }
    if (!editExpenseAccountCode) {
      newErrors.editExpenseAccount = 'Please select an expense account';
    }
    if (!bankAccountId) {
      newErrors.bankAccountId = 'Please select a bank account';
    }
    if (!paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsProcessing(true);
    try {
      await onSaveEdit(reimbursement.id, {
        companyId: editCompanyId,
        expenseAccountCode: editExpenseAccountCode,
        vatType: editVatType,
        vatRate: editVatRate,
        bankAccountId,
        paymentDate,
      });
      setMode('view');
    } catch (error) {
      setErrors({ save: 'Failed to save changes' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setErrors({ rejectionReason: 'Please provide a reason for rejection' });
      return;
    }

    setIsProcessing(true);
    try {
      onReject(reimbursement.id, rejectionReason);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle save expense details
  const handleSaveExpenseDetails = useCallback(async () => {
    setIsProcessing(true);
    setErrors({});

    try {
      const selectedCompany = companies.find((c) => c.id === editCompanyId);
      const selectedAccount = expenseAccounts.find((a) => a.code === editExpenseAccountCode);

      const updatedExpense = updateExpense(expense.id, {
        companyId: editCompanyId,
        companyName: selectedCompany?.name || '',
        expenseAccountCode: editExpenseAccountCode,
        expenseAccountName: selectedAccount?.name || '',
        accountingVatType: editVatType,
        accountingVatRate: editVatRate,
        accountingCompletedBy: 'current-user',
        accountingCompletedAt: new Date().toISOString(),
      });

      if (updatedExpense && onExpenseUpdated) {
        onExpenseUpdated(updatedExpense);
      }
      setMode('view');
    } catch (error) {
      setErrors({ save: 'Failed to save expense details' });
    } finally {
      setIsProcessing(false);
    }
  }, [expense.id, editCompanyId, editExpenseAccountCode, editVatType, editVatRate, companies, expenseAccounts, onExpenseUpdated]);

  const statusColor = getStatusColor(reimbursement.status);
  const statusStyles = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    default: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50">
      <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
        <div className="w-full max-w-3xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Expense Claim Review
              </h2>
              <p className="text-sm text-gray-500">
                {reimbursement.reimbursementNumber}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  statusStyles[statusColor]
                }`}
              >
                {getStatusLabel(reimbursement.status)}
              </span>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Reimbursement Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mb-6">
              <div>
                <p className="text-xs text-gray-500">Holder</p>
                <p className="text-sm font-medium text-gray-900">
                  {reimbursement.walletHolderName}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Company</p>
                <p className="text-sm font-medium text-gray-900">
                  {reimbursement.companyName}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Amount</p>
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(reimbursement.amount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Request Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(reimbursement.createdAt)}
                </p>
              </div>
            </div>

            {/* Expense Details */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Related Expense: {expense.expenseNumber}
                </h3>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4 bg-white">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-500">Date:</span>{' '}
                      <span className="font-medium">
                        {formatDate(expense.expenseDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Receipt:</span>{' '}
                      <span
                        className={`font-medium ${
                          expense.receiptStatus === 'original_received'
                            ? 'text-green-600'
                            : 'text-yellow-600'
                        }`}
                      >
                        {expense.receiptStatus === 'original_received'
                          ? 'Received'
                          : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Show description if available */}
                  {expense.description && (
                    <p className="text-gray-700 mb-4">{expense.description}</p>
                  )}

                  {/* Simplified expense (no line items) - show simple table */}
                  {expense.lineItems.length === 0 ? (
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                            Project
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                            Description
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-3 py-2 text-gray-600">
                            {expense.projectName || '-'}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {expense.description || '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-900">
                            {formatCurrency(expense.amount)}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td
                            colSpan={2}
                            className="px-3 py-2 text-right font-medium text-gray-700"
                          >
                            Net Amount:
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900">
                            {formatCurrency(expense.netAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    /* Line Items table for full expenses */
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                            Project
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                            Category
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                            Description
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {expense.lineItems.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 text-gray-600">
                              {item.projectName}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {item.categoryName}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {item.description}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-900">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-2 text-right font-medium text-gray-700"
                          >
                            Net Amount:
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900">
                            {formatCurrency(expense.netAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}

                  {/* Company info - show warning if not assigned */}
                  {!expense.companyId && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                      <strong>Note:</strong> Company not assigned. Click "Edit Details" to assign.
                    </div>
                  )}
                </div>

                {/* Attachments */}
                {expense.attachments.length > 0 && (
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-3">
                      Attachments ({expense.attachments.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {expense.attachments.map((att) => {
                        const isImage = att.type?.startsWith('image/') ||
                          att.name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/);

                        return (
                          <div
                            key={att.id}
                            className="border border-gray-200 rounded-lg overflow-hidden bg-white"
                          >
                            {/* Thumbnail preview */}
                            <div
                              className="relative h-24 bg-gray-100 cursor-pointer group"
                              onClick={() => setPreviewAttachment({ url: att.url, name: att.name, type: att.type })}
                            >
                              {isImage ? (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // If image fails to load, show placeholder
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      target.parentElement?.querySelector('.placeholder')?.classList.remove('hidden');
                                    }}
                                  />
                                  <div className="placeholder hidden absolute inset-0 flex items-center justify-center">
                                    <ImageIcon className="h-8 w-8 text-gray-400" />
                                  </div>
                                </>
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <FileText className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                              {/* Hover overlay */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            {/* File info and actions */}
                            <div className="p-2">
                              <p className="text-xs text-gray-700 truncate mb-2" title={att.name}>
                                {att.name}
                              </p>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setPreviewAttachment({ url: att.url, name: att.name, type: att.type })}
                                  className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-xs text-[#5A7A8F] bg-[#5A7A8F]/10 rounded hover:bg-[#5A7A8F]/20"
                                >
                                  <Eye className="h-3 w-3" />
                                  View
                                </button>
                                <a
                                  href={att.url}
                                  download={att.name}
                                  className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                                  onClick={(e) => {
                                    // For base64 URLs, we need to handle download differently
                                    if (att.url.startsWith('data:')) {
                                      e.preventDefault();
                                      const link = document.createElement('a');
                                      link.href = att.url;
                                      link.download = att.name;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }
                                  }}
                                >
                                  <Download className="h-3 w-3" />
                                  Save
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Approval Details - Single combined form for pending claims */}
            {reimbursement.status === 'pending' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-4 mb-6">
                <h4 className="text-sm font-semibold text-green-800">
                  Approval Details
                </h4>

                {errors.save && (
                  <div className="p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                    {errors.save}
                  </div>
                )}

                {isLoadingData ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">Loading...</span>
                  </div>
                ) : (
                  <>
                    {/* Section: Expense Classification */}
                    <div className="border-b border-green-200 pb-4">
                      <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Expense Classification
                      </h5>

                      {/* Company */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={editCompanyId}
                          onChange={(e) => {
                            setEditCompanyId(e.target.value);
                            setBankAccountId(''); // Reset bank account when company changes
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 ${
                            errors.editCompany ? 'border-red-300' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select Company</option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                        {errors.editCompany && (
                          <p className="mt-1 text-sm text-red-600">{errors.editCompany}</p>
                        )}
                      </div>

                      {/* Expense Account */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expense Account <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={editExpenseAccountCode}
                          onChange={(e) => setEditExpenseAccountCode(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 ${
                            errors.editExpenseAccount ? 'border-red-300' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select Expense Account</option>
                          {expenseAccounts.map((account) => (
                            <option key={account.code} value={account.code}>
                              {account.code} - {account.name}
                            </option>
                          ))}
                        </select>
                        {errors.editExpenseAccount && (
                          <p className="mt-1 text-sm text-red-600">{errors.editExpenseAccount}</p>
                        )}
                      </div>

                      {/* VAT Settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            VAT Type
                          </label>
                          <select
                            value={editVatType}
                            onChange={(e) => setEditVatType(e.target.value as VatType)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
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
                            value={editVatRate}
                            onChange={(e) => setEditVatRate(parseFloat(e.target.value) || 0)}
                            disabled={editVatType === 'no_vat'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 disabled:bg-gray-100"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section: Payment Details */}
                    <div className="border-b border-green-200 pb-4">
                      <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Payment Details
                      </h5>

                      {/* Bank Account */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Pay from Bank Account <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={bankAccountId}
                          onChange={(e) => setBankAccountId(e.target.value)}
                          disabled={!editCompanyId}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                            errors.bankAccountId ? 'border-red-300' : 'border-gray-300'
                          }`}
                        >
                          <option value="">{editCompanyId ? 'Select Bank Account' : 'Select company first'}</option>
                          {bankAccounts.map((account) => {
                            const bankInfo = typeof account.bank_information === 'string'
                              ? JSON.parse(account.bank_information)
                              : account.bank_information as { bankName?: string };
                            return (
                              <option key={account.id} value={account.id}>
                                {bankInfo?.bankName || 'Bank'} - {account.account_name} ({account.account_number}) [{account.currency}]
                              </option>
                            );
                          })}
                        </select>
                        {!editCompanyId && (
                          <p className="mt-1 text-xs text-gray-500">
                            Please select a company first to see available bank accounts
                          </p>
                        )}
                        {editCompanyId && bankAccounts.length === 0 && (
                          <p className="mt-1 text-xs text-yellow-600">
                            No bank accounts found for this company
                          </p>
                        )}
                        {errors.bankAccountId && (
                          <p className="mt-1 text-sm text-red-600">{errors.bankAccountId}</p>
                        )}
                      </div>

                      {/* Payment Date */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className={`w-full md:w-48 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 ${
                            errors.paymentDate ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {errors.paymentDate && (
                          <p className="mt-1 text-sm text-red-600">{errors.paymentDate}</p>
                        )}
                      </div>

                      {/* Adjustment */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Adjustment Amount (optional)
                          </label>
                          <input
                            type="number"
                            value={adjustmentAmount}
                            onChange={(e) => setAdjustmentAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Positive to add, negative to deduct
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Adjustment Reason
                            {adjustmentAmount && <span className="text-red-500"> *</span>}
                          </label>
                          <input
                            type="text"
                            value={adjustmentReason}
                            onChange={(e) => setAdjustmentReason(e.target.value)}
                            placeholder="Reason for adjustment"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 ${
                              errors.adjustmentReason ? 'border-red-300' : 'border-gray-300'
                            }`}
                          />
                          {errors.adjustmentReason && (
                            <p className="mt-1 text-sm text-red-600">{errors.adjustmentReason}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="bg-white border border-green-200 rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-gray-700 mb-3">Payment Summary</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Pre-VAT Amount:</span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(vatBreakdown.preVatAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            VAT {editVatType !== 'no_vat' ? `(${editVatRate}%)` : ''}:
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(vatBreakdown.vatAmount)}
                          </span>
                        </div>
                        {adjustmentAmount && parseFloat(adjustmentAmount) !== 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Adjustment:</span>
                            <span className={`font-medium ${parseFloat(adjustmentAmount) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {parseFloat(adjustmentAmount) > 0 ? '+' : ''}{formatCurrency(parseFloat(adjustmentAmount))}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                          <span className="font-semibold text-gray-700">Final Payment Amount:</span>
                          <span className="font-bold text-green-700 text-lg">
                            {formatCurrency(finalAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Accounting Details for Approved/Paid claims - View or Edit mode */}
            {(reimbursement.status === 'approved' || reimbursement.status === 'paid') && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700">
                    Accounting Details
                  </h4>
                  {mode === 'view' && (
                    <button
                      onClick={() => setMode('edit')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#5A7A8F] bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Edit3 className="h-3 w-3" />
                      Edit
                    </button>
                  )}
                </div>

                {errors.save && (
                  <div className="p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                    {errors.save}
                  </div>
                )}

                {mode === 'view' ? (
                  /* Read-only view */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Company:</span>
                        <p className="font-medium text-gray-900">
                          {companies.find(c => c.id === editCompanyId)?.name || reimbursement.companyName || '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Expense Account:</span>
                        <p className="font-medium text-gray-900">
                          {expenseAccounts.find(a => a.code === editExpenseAccountCode)?.name
                            ? `${editExpenseAccountCode} - ${expenseAccounts.find(a => a.code === editExpenseAccountCode)?.name}`
                            : expense.expenseAccountName || '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">VAT Type:</span>
                        <p className="font-medium text-gray-900">
                          {VAT_TYPE_OPTIONS.find(v => v.value === editVatType)?.label || 'No VAT'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">VAT Rate:</span>
                        <p className="font-medium text-gray-900">{editVatRate}%</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Bank Account:</span>
                        <p className="font-medium text-gray-900">
                          {reimbursement.bankAccountName || bankAccounts.find(b => b.id === bankAccountId)?.account_name || '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Payment Date:</span>
                        <p className="font-medium text-gray-900">
                          {reimbursement.paymentDate ? formatDate(reimbursement.paymentDate) : formatDate(paymentDate)}
                        </p>
                      </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
                      <h5 className="text-sm font-semibold text-gray-700 mb-3">Payment Summary</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Pre-VAT Amount:</span>
                          <span className="font-medium text-gray-900">{formatCurrency(vatBreakdown.preVatAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">VAT {editVatType !== 'no_vat' ? `(${editVatRate}%)` : ''}:</span>
                          <span className="font-medium text-gray-900">{formatCurrency(vatBreakdown.vatAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                          <span className="font-semibold text-gray-700">Total Amount:</span>
                          <span className="font-bold text-gray-900">{formatCurrency(reimbursement.finalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Edit mode - show form fields */
                  <div className="space-y-4">
                    {/* Company */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={editCompanyId}
                        onChange={(e) => {
                          setEditCompanyId(e.target.value);
                          setBankAccountId('');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                          errors.editCompany ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select Company</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                      {errors.editCompany && <p className="mt-1 text-sm text-red-600">{errors.editCompany}</p>}
                    </div>

                    {/* Expense Account */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expense Account <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={editExpenseAccountCode}
                        onChange={(e) => setEditExpenseAccountCode(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                          errors.editExpenseAccount ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select Expense Account</option>
                        {expenseAccounts.map((account) => (
                          <option key={account.code} value={account.code}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                      </select>
                      {errors.editExpenseAccount && <p className="mt-1 text-sm text-red-600">{errors.editExpenseAccount}</p>}
                    </div>

                    {/* VAT Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">VAT Type</label>
                        <select
                          value={editVatType}
                          onChange={(e) => setEditVatType(e.target.value as VatType)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          {VAT_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">VAT Rate (%)</label>
                        <input
                          type="number"
                          value={editVatRate}
                          onChange={(e) => setEditVatRate(parseFloat(e.target.value) || 0)}
                          disabled={editVatType === 'no_vat'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-100"
                        />
                      </div>
                    </div>

                    {/* Bank Account */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Account <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={bankAccountId}
                        onChange={(e) => setBankAccountId(e.target.value)}
                        disabled={!editCompanyId}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-100 ${
                          errors.bankAccountId ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">{editCompanyId ? 'Select Bank Account' : 'Select company first'}</option>
                        {bankAccounts.map((account) => {
                          const bankInfo = typeof account.bank_information === 'string'
                            ? JSON.parse(account.bank_information)
                            : account.bank_information as { bankName?: string };
                          return (
                            <option key={account.id} value={account.id}>
                              {bankInfo?.bankName || 'Bank'} - {account.account_name} ({account.account_number}) [{account.currency}]
                            </option>
                          );
                        })}
                      </select>
                      {errors.bankAccountId && <p className="mt-1 text-sm text-red-600">{errors.bankAccountId}</p>}
                    </div>

                    {/* Payment Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className={`w-full md:w-48 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                          errors.paymentDate ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.paymentDate && <p className="mt-1 text-sm text-red-600">{errors.paymentDate}</p>}
                    </div>

                    {/* Edit mode buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => setMode('view')}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50"
                      >
                        {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Rejection Form */}
            {reimbursement.status === 'pending' && mode === 'reject' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-4">
                <h4 className="text-sm font-semibold text-red-800">
                  Reject Claim
                </h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Rejection <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="Please provide a reason for rejecting this claim"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 ${
                      errors.rejectionReason ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.rejectionReason && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.rejectionReason}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>

            {reimbursement.status === 'pending' && (
              <div className="flex items-center gap-3">
                {mode === 'view' && (
                  <>
                    <button
                      onClick={() => setMode('reject')}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Claim
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Check className="h-4 w-4" />
                      Approve Claim
                    </button>
                  </>
                )}

                {mode === 'reject' && (
                  <>
                    <button
                      onClick={() => setMode('view')}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                      Confirm Rejection
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-900 truncate max-w-[300px]">
                  {previewAttachment.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewAttachment.url}
                  download={previewAttachment.name}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f]"
                  onClick={(e) => {
                    // For base64 URLs, handle download
                    if (previewAttachment.url.startsWith('data:')) {
                      e.preventDefault();
                      const link = document.createElement('a');
                      link.href = previewAttachment.url;
                      link.download = previewAttachment.name;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            {/* Preview Content */}
            <div className="flex items-center justify-center bg-gray-100 p-4 min-h-[400px] max-h-[calc(90vh-60px)] overflow-auto">
              {previewAttachment.type?.startsWith('image/') ||
              previewAttachment.name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/) ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'text-center text-gray-500';
                      errorDiv.innerHTML = '<p>Unable to load image</p>';
                      parent.appendChild(errorDiv);
                    }
                  }}
                />
              ) : previewAttachment.type === 'application/pdf' ||
                previewAttachment.name?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewAttachment.url}
                  className="w-full h-[600px]"
                  title={previewAttachment.name}
                />
              ) : (
                <div className="text-center text-gray-500">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">Preview not available</p>
                  <p className="text-sm mb-4">Click download to view this file</p>
                  <a
                    href={previewAttachment.url}
                    download={previewAttachment.name}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f]"
                    onClick={(e) => {
                      if (previewAttachment.url.startsWith('data:')) {
                        e.preventDefault();
                        const link = document.createElement('a');
                        link.href = previewAttachment.url;
                        link.download = previewAttachment.name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
