'use client';

import { useState, useMemo, useCallback } from 'react';
import { X, Check, XCircle, Loader2, FileText, ExternalLink, Edit3 } from 'lucide-react';
import type { PettyCashReimbursement, PettyCashExpense, VatType } from '@/data/petty-cash/types';
import { getAllBankAccounts } from '@/data/banking/bankAccounts';
import { getActiveCompanies } from '@/data/company/companies';
import { getAccountsByType } from '@/data/accounting/chartOfAccounts';
import { updateExpense } from '@/data/petty-cash/expenses';
import { VAT_TYPE_OPTIONS } from '@/lib/petty-cash/utils';
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
    adjustmentAmount?: number,
    adjustmentReason?: string
  ) => void;
  onReject: (reimbursementId: string, reason: string) => void;
  onClose: () => void;
  onExpenseUpdated?: (expense: PettyCashExpense) => void;
}

export default function ReimbursementApprovalModal({
  reimbursement,
  expense,
  onApprove,
  onReject,
  onClose,
  onExpenseUpdated,
}: ReimbursementApprovalModalProps) {
  const [mode, setMode] = useState<'view' | 'approve' | 'reject' | 'edit'>('view');
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

  // Get ALL active bank accounts (not filtered by company since simplified expenses may not have company)
  const bankAccounts = useMemo(
    () => getAllBankAccounts().filter(acc => acc.isActive),
    []
  );

  // Get companies and expense accounts from CoA for editing
  const companies = useMemo(() => getActiveCompanies(), []);
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

  // Handle approve
  const handleApprove = async () => {
    const newErrors: Record<string, string> = {};

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
        selectedAccount?.accountName || '',
        paymentDate,
        adjustmentAmount ? parseFloat(adjustmentAmount) : undefined,
        adjustmentReason || undefined
      );
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
                Reimbursement Request
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
                {reimbursement.status === 'pending' && mode !== 'edit' && (
                  <button
                    onClick={() => setMode('edit')}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#5A7A8F] bg-[#5A7A8F]/10 rounded hover:bg-[#5A7A8F]/20"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit Details
                  </button>
                )}
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
                            Account
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
                            {expense.expenseAccountName || <span className="text-yellow-600 italic">Not assigned</span>}
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
                    <p className="text-xs text-gray-500 mb-2">Attachments:</p>
                    <div className="flex flex-wrap gap-2">
                      {expense.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[#5A7A8F] bg-white border border-gray-200 rounded hover:bg-gray-50"
                        >
                          <FileText className="h-3 w-3" />
                          {att.name}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Edit Expense Details Form */}
            {reimbursement.status === 'pending' && mode === 'edit' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4 mb-6">
                <h4 className="text-sm font-semibold text-blue-800">
                  Edit Expense Details
                </h4>

                {errors.save && (
                  <div className="p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                    {errors.save}
                  </div>
                )}

                {/* Company */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <select
                    value={editCompanyId}
                    onChange={(e) => setEditCompanyId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Select Company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Expense Account (from CoA) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expense Account
                  </label>
                  <select
                    value={editExpenseAccountCode}
                    onChange={(e) => setEditExpenseAccountCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      VAT Type
                    </label>
                    <select
                      value={editVatType}
                      onChange={(e) => setEditVatType(e.target.value as VatType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-white border border-blue-200 rounded-lg p-4">
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
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-700">Total Amount:</span>
                      <span className="font-bold text-gray-900">
                        {formatCurrency(vatBreakdown.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Save/Cancel buttons for edit mode */}
                <div className="flex justify-end gap-3 pt-4 border-t border-blue-200">
                  <button
                    onClick={() => setMode('view')}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveExpenseDetails}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Approval Form */}
            {reimbursement.status === 'pending' && mode === 'approve' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-4">
                <h4 className="text-sm font-semibold text-green-800">
                  Approve Reimbursement
                </h4>

                {/* Bank Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pay from Bank Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 ${
                      errors.bankAccountId ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Bank Account</option>
                    {bankAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.bankInformation.bankName} - {account.accountName} ({account.accountNumber}) [{account.currency}]
                      </option>
                    ))}
                  </select>
                  {errors.bankAccountId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.bankAccountId}
                    </p>
                  )}
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
                      {adjustmentAmount && (
                        <span className="text-red-500"> *</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="Reason for adjustment"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 ${
                        errors.adjustmentReason
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                    />
                    {errors.adjustmentReason && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.adjustmentReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Final Amount */}
                <div className="pt-4 border-t border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      Final Payment Amount:
                    </span>
                    <span className="text-xl font-bold text-green-700">
                      {formatCurrency(finalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Rejection Form */}
            {reimbursement.status === 'pending' && mode === 'reject' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-4">
                <h4 className="text-sm font-semibold text-red-800">
                  Reject Reimbursement
                </h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Rejection <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="Please provide a reason for rejecting this reimbursement"
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
                      Reject
                    </button>
                    <button
                      onClick={() => setMode('approve')}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </button>
                  </>
                )}

                {mode === 'approve' && (
                  <>
                    <button
                      onClick={() => setMode('view')}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                      Confirm Approval
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
    </div>
  );
}
