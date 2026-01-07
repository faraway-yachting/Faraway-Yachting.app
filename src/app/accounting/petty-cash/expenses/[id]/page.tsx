'use client';

import { useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/accounting/AppShell';
import {
  ArrowLeft,
  Calendar,
  Building2,
  FolderOpen,
  FileText,
  Receipt,
  ExternalLink,
  Save,
  Loader2,
  AlertCircle,
  Lock,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

// Data imports
import { getExpenseById, updateExpense } from '@/data/petty-cash/expenses';
import {
  getReimbursementByExpenseId,
  updateReimbursementAmount,
} from '@/data/petty-cash/reimbursements';
import { addToWallet, deductFromWallet } from '@/data/petty-cash/wallets';
import { getActiveCompanies } from '@/data/company/companies';
import { getAllProjects } from '@/data/project/projects';
import { formatCurrency, formatDate } from '@/lib/petty-cash/utils';

// Reimbursement status display config
const statusConfig = {
  pending: {
    label: 'Pending Reimbursement',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
    editable: true,
  },
  approved: {
    label: 'Approved',
    color: 'bg-blue-100 text-blue-800',
    icon: CheckCircle,
    editable: true,
  },
  paid: {
    label: 'Reimbursed',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    editable: false,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    editable: false,
  },
};

export default function PettyCashExpenseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const expenseId = params.id as string;

  // Fetch expense and reimbursement data
  const expense = useMemo(() => getExpenseById(expenseId), [expenseId]);
  const reimbursement = useMemo(
    () => (expense ? getReimbursementByExpenseId(expense.id) : null),
    [expense]
  );

  // Determine if editable
  const isEditable = useMemo(() => {
    if (!reimbursement) return true; // No reimbursement yet, can edit
    return statusConfig[reimbursement.status]?.editable ?? false;
  }, [reimbursement]);

  // Form state for editable fields
  const [expenseDate, setExpenseDate] = useState(expense?.expenseDate || '');
  const [companyId, setCompanyId] = useState(expense?.companyId || '');
  const [projectId, setProjectId] = useState(expense?.projectId || '');
  const [amount, setAmount] = useState(expense?.amount || 0);
  const [description, setDescription] = useState(expense?.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Load dropdown data
  const companies = useMemo(() => getActiveCompanies(), []);
  const allProjects = useMemo(() => getAllProjects(), []);

  // Filter projects based on selected company
  const filteredProjects = useMemo(() => {
    if (!companyId) return allProjects;
    return allProjects.filter((p) => p.companyId === companyId);
  }, [companyId, allProjects]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!expense || !isEditable) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      const selectedCompany = companies.find((c) => c.id === companyId);
      const selectedProject = allProjects.find((p) => p.id === projectId);

      // Calculate wallet balance difference if amount changed
      const amountDiff = amount - expense.amount;

      // Update expense
      updateExpense(expense.id, {
        expenseDate,
        companyId,
        companyName: selectedCompany?.name || '',
        projectId,
        projectName: selectedProject?.name || '',
        amount,
        description,
        // Update totals
        subtotal: amount,
        totalAmount: amount,
        netAmount: amount,
      });

      // If amount changed, update wallet balance and reimbursement
      if (amountDiff !== 0 && expense.walletId) {
        if (amountDiff > 0) {
          // Amount increased, deduct more from wallet
          deductFromWallet(expense.walletId, amountDiff);
        } else {
          // Amount decreased, add back to wallet
          addToWallet(expense.walletId, Math.abs(amountDiff));
        }

        // Update reimbursement amount
        if (reimbursement) {
          updateReimbursementAmount(reimbursement.id, amount);
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [
    expense,
    isEditable,
    expenseDate,
    companyId,
    projectId,
    amount,
    description,
    companies,
    allProjects,
    reimbursement,
  ]);

  // Handle not found
  if (!expense) {
    return (
      <AppShell currentRole="petty-cash">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Expense Not Found
          </h2>
          <p className="text-gray-500 mb-4">
            The expense you're looking for doesn't exist.
          </p>
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

  const status = reimbursement?.status || 'pending';
  const StatusIcon = statusConfig[status]?.icon || Clock;

  return (
    <AppShell currentRole="petty-cash">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Petty Cash
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expense Details</h1>
            <p className="mt-1 text-sm text-gray-500">{expense.expenseNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Editable indicator */}
            {!isEditable && (
              <span className="inline-flex items-center gap-1 px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full">
                <Lock className="h-3.5 w-3.5" />
                Read Only
              </span>
            )}
            {/* Status badge */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${statusConfig[status]?.color}`}
            >
              <StatusIcon className="h-4 w-4" />
              {statusConfig[status]?.label}
            </span>
          </div>
        </div>
      </div>

      {/* Read-only notice */}
      {!isEditable && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                This expense cannot be edited
              </p>
              <p className="text-sm text-gray-500">
                {status === 'paid'
                  ? 'This expense has already been reimbursed.'
                  : 'This expense has been rejected.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Expense Details */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Expense Details
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {/* Expense Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expense Date
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  disabled={!isEditable}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <select
                  value={companyId}
                  onChange={(e) => {
                    setCompanyId(e.target.value);
                    // Reset project if company changes
                    const newCompanyProjects = allProjects.filter(
                      (p) => p.companyId === e.target.value
                    );
                    if (!newCompanyProjects.find((p) => p.id === projectId)) {
                      setProjectId('');
                    }
                  }}
                  disabled={!isEditable}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  disabled={!isEditable}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">Select Project</option>
                  {filteredProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (THB)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  disabled={!isEditable}
                  min={0}
                  step={0.01}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!isEditable}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="Enter expense description..."
                />
              </div>
            </div>
          </div>

          {/* Attachments Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Attachments</h3>
            </div>
            <div className="p-4">
              {expense.attachments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No attachments
                </p>
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
                          <p className="text-sm font-medium text-gray-900">
                            {att.name}
                          </p>
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

        {/* Right Column - Reimbursement Info */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Reimbursement Information
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {reimbursement ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Receipt className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Reimbursement Number</p>
                      <p className="text-sm font-medium text-gray-900">
                        {reimbursement.reimbursementNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Building2 className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Company</p>
                      <p className="text-sm font-medium text-gray-900">
                        {reimbursement.companyName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Calendar className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Submitted</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(reimbursement.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Amount Summary */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Amount Summary
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Expense Amount:</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(reimbursement.amount)}
                        </span>
                      </div>
                      {reimbursement.adjustmentAmount !== undefined &&
                        reimbursement.adjustmentAmount !== 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Adjustment:</span>
                            <span
                              className={`font-medium ${
                                reimbursement.adjustmentAmount > 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {reimbursement.adjustmentAmount > 0 ? '+' : ''}
                              {formatCurrency(reimbursement.adjustmentAmount)}
                            </span>
                          </div>
                        )}
                      <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                        <span className="font-semibold text-gray-700">
                          Final Amount:
                        </span>
                        <span className="font-bold text-gray-900">
                          {formatCurrency(reimbursement.finalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info (if paid) */}
                  {reimbursement.status === 'paid' && reimbursement.paymentDate && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-green-700 mb-2">
                        Payment Details
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p className="text-green-600">
                          Paid on: {formatDate(reimbursement.paymentDate)}
                        </p>
                        {reimbursement.paymentReference && (
                          <p className="text-green-600">
                            Reference: {reimbursement.paymentReference}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason (if rejected) */}
                  {reimbursement.status === 'rejected' &&
                    reimbursement.rejectionReason && (
                      <div className="mt-4 p-4 bg-red-50 rounded-lg">
                        <h4 className="text-sm font-semibold text-red-700 mb-2">
                          Rejection Reason
                        </h4>
                        <p className="text-sm text-red-600">
                          {reimbursement.rejectionReason}
                        </p>
                      </div>
                    )}
                </>
              ) : (
                <div className="text-center py-4">
                  <Clock className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Reimbursement not yet created
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Receipt Status Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Receipt Status</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    expense.receiptStatus === 'original_received'
                      ? 'bg-green-100'
                      : 'bg-yellow-100'
                  }`}
                >
                  {expense.receiptStatus === 'original_received' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {expense.receiptStatus === 'original_received'
                      ? 'Original Received'
                      : 'Pending Receipt'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {expense.receiptStatus === 'original_received'
                      ? 'Original receipt has been received by accountant'
                      : 'Please submit original receipt to accountant'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Save Success/Error Messages */}
          {saveSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              Changes saved successfully!
            </div>
          )}

          {saveError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {saveError}
            </div>
          )}

          {/* Action Buttons */}
          {isEditable && (
            <div className="flex justify-end gap-3 pt-4">
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
          )}
        </div>
      </div>
    </AppShell>
  );
}
