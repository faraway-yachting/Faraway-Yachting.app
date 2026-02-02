'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
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
  Send,
  Upload,
  X,
  Pencil,
  Trash2,
} from 'lucide-react';

// Supabase API imports
import { pettyCashApi } from '@/lib/supabase/api/pettyCash';
import { companiesApi } from '@/lib/supabase/api/companies';
import { projectsApi } from '@/lib/supabase/api/projects';
import { formatCurrency, formatDate } from '@/lib/petty-cash/utils';
import type { Database } from '@/lib/supabase/database.types';

// Types from Supabase
type DbCompany = Database['public']['Tables']['companies']['Row'];
type DbProject = Database['public']['Tables']['projects']['Row'];
type DbExpense = Database['public']['Tables']['petty_cash_expenses']['Row'];

// Frontend-friendly types
interface Company {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  companyId: string;
}

// Transform DB expense to frontend format
interface FrontendExpense {
  id: string;
  expenseNumber: string;
  walletId: string;
  companyId: string;
  companyName: string;
  projectId: string;
  projectName: string;
  expenseDate: string;
  description: string;
  amount: number;
  status: string;
  createdAt: string;
  attachments: Array<{ id: string; name: string; url: string; size: number; type: string }>;
}

// Claim status display config
const statusConfig = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-800',
    icon: FileText,
    editable: true,
  },
  submitted: {
    label: 'Submitted',
    color: 'bg-blue-100 text-blue-800',
    icon: Clock,
    editable: true,
  },
  pending: {
    label: 'Pending Review',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
    editable: true,
  },
  approved: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    editable: false,
  },
  paid: {
    label: 'Paid',
    color: 'bg-purple-100 text-purple-800',
    icon: CheckCircle,
    editable: true, // Petty cash holder can edit details but not amount
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

  // Expense state - loaded from Supabase
  const [expense, setExpense] = useState<FrontendExpense | null>(null);
  const [isLoadingExpense, setIsLoadingExpense] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Edit mode state - starts as false for submitted expenses
  const [isEditMode, setIsEditMode] = useState(false);

  // Determine if the expense can be edited (draft = always editable, submitted/paid = need to click edit)
  const isEditable = expense?.status === 'draft' || isEditMode;

  // Amount can only be edited for draft/submitted expenses, not paid
  const canEditAmount = isEditable && expense?.status !== 'paid';

  // Form state for editable fields
  const [expenseDate, setExpenseDate] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [amount, setAmount] = useState(expense?.amount || 0);
  const [description, setDescription] = useState(expense?.description || '');
  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; url: string; size: number; type: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Load dropdown data from Supabase
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

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
          // Parse attachments from JSONB column (added in migration 032)
          const extendedExpense = dbExpense as typeof dbExpense & { attachments?: unknown };
          let parsedAttachments: Array<{ id: string; name: string; url: string; size: number; type: string }> = [];
          if (extendedExpense.attachments) {
            try {
              const parsed = typeof extendedExpense.attachments === 'string'
                ? JSON.parse(extendedExpense.attachments)
                : extendedExpense.attachments;
              if (Array.isArray(parsed)) {
                parsedAttachments = parsed.map((a: { id?: string; name?: string; url?: string; size?: number; type?: string }) => ({
                  id: a.id || '',
                  name: a.name || '',
                  url: a.url || '',
                  size: a.size || 0,
                  type: a.type || '',
                }));
              }
            } catch (err) {
              console.error('Error parsing attachments:', err);
            }
          }

          // Transform to frontend format
          const frontendExpense: FrontendExpense = {
            id: dbExpense.id,
            expenseNumber: dbExpense.expense_number,
            walletId: dbExpense.wallet_id,
            companyId: dbExpense.company_id,
            companyName: '', // Will be filled from companies list
            projectId: dbExpense.project_id,
            projectName: '', // Will be filled from projects list
            expenseDate: dbExpense.expense_date,
            description: dbExpense.description || '',
            amount: dbExpense.amount || 0,
            status: dbExpense.status,
            createdAt: dbExpense.created_at,
            attachments: parsedAttachments,
          };
          setExpense(frontendExpense);
          // Initialize form fields
          setExpenseDate(frontendExpense.expenseDate);
          setCompanyId(frontendExpense.companyId);
          setProjectId(frontendExpense.projectId);
          setAmount(frontendExpense.amount);
          setDescription(frontendExpense.description);
          setAttachments(parsedAttachments);
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
        const [companiesData, projectsData] = await Promise.all([
          companiesApi.getActive(),
          projectsApi.getActive(),
        ]);

        // Transform to frontend format
        setCompanies(
          companiesData.map((c: DbCompany) => ({
            id: c.id,
            name: c.name,
          }))
        );

        setAllProjects(
          projectsData.map((p: DbProject) => ({
            id: p.id,
            name: p.name,
            companyId: p.company_id,
          }))
        );
      } catch (error) {
        console.error('Failed to load dropdown data:', error);
      } finally {
        setIsLoadingData(false);
      }
    }

    loadDropdownData();
  }, []);

  // Filter projects based on selected company
  const filteredProjects = useMemo(() => {
    if (!companyId) return allProjects;
    return allProjects.filter((p) => p.companyId === companyId);
  }, [companyId, allProjects]);

  // Handle file upload
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      Array.from(files).forEach((file) => {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
          setSaveError('Only JPEG, PNG, GIF, and PDF files are allowed');
          return;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          setSaveError('File size must be less than 10MB');
          return;
        }

        // Read file as base64
        const reader = new FileReader();
        reader.onload = (e) => {
          const newAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            url: e.target?.result as string,
            size: file.size,
            type: file.type,
          };
          setAttachments((prev) => [...prev, newAttachment]);
          setSaveError('');
        };
        reader.readAsDataURL(file);
      });

      // Reset input
      event.target.value = '';
    },
    []
  );

  // Handle remove attachment
  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!expense || !isEditable) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      // Update expense in Supabase (including attachments)
      await pettyCashApi.updateExpense(expense.id, {
        expense_date: expenseDate,
        company_id: companyId,
        project_id: projectId,
        amount,
        description,
        attachments: JSON.stringify(attachments),
      } as Parameters<typeof pettyCashApi.updateExpense>[1] & { attachments?: string });

      // Update local state
      setExpense((prev) => prev ? {
        ...prev,
        expenseDate,
        companyId,
        projectId,
        amount,
        description,
        attachments,
      } : null);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save expense:', error);
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
    attachments,
  ]);

  // Handle submit (change status from draft to submitted)
  const handleSubmit = useCallback(async () => {
    if (!expense) return;

    setIsSubmitting(true);
    setSaveError('');

    try {
      // Require at least one attachment for submission (Thai accounting law)
      if (!attachments || attachments.length === 0) {
        setSaveError('Please attach at least one receipt/document before submitting the claim.');
        setIsSubmitting(false);
        return;
      }

      // Update expense status to submitted
      await pettyCashApi.updateExpense(expense.id, {
        status: 'submitted',
      });

      // Create a reimbursement record for this expense
      // company_id and final_amount are required fields
      const effectiveCompanyId = companyId || expense.companyId;
      if (!effectiveCompanyId) {
        setSaveError('Please select a company before submitting the claim.');
        setIsSubmitting(false);
        return;
      }

      const reimbursementPayload = {
        wallet_id: expense.walletId,
        expense_id: expense.id,
        amount: expense.amount,
        final_amount: expense.amount, // Initial final_amount equals amount
        company_id: effectiveCompanyId,
        status: 'pending' as const,
        // Optional fields - set to null for new reimbursements
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
      };
      await pettyCashApi.createReimbursementWithNumber(reimbursementPayload);

      // Update local state
      setExpense((prev) => prev ? {
        ...prev,
        status: 'submitted',
      } : null);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string; details?: string };
      console.error('Failed to submit expense:', err);
      const errorMessage = err.message || err.details || 'Unknown error';
      setSaveError(`Failed to submit claim: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [expense, companyId]);

  // Handle delete (only for draft expenses)
  const handleDelete = useCallback(async () => {
    if (!expense || expense.status !== 'draft') return;

    const confirmed = window.confirm('Are you sure you want to delete this draft expense? This action cannot be undone.');
    if (!confirmed) return;

    setIsDeleting(true);
    setSaveError('');

    try {
      await pettyCashApi.deleteExpense(expense.id);
      router.back();
    } catch (err) {
      console.error('Failed to delete expense:', err);
      setSaveError('Failed to delete expense. Please try again.');
      setIsDeleting(false);
    }
  }, [expense, router]);

  // Handle loading state
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

  // Handle not found or error
  if (!expense || loadError) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Expense Not Found
          </h2>
          <p className="text-gray-500 mb-4">
            {loadError || "The expense you're looking for doesn't exist."}
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

  // Use expense status for display (pending = submitted, can edit)
  const displayStatus = expense.status as keyof typeof statusConfig;
  const StatusIcon = statusConfig[displayStatus]?.icon || Clock;

  return (
    <AppShell>
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
            <h1 className="text-2xl font-bold text-gray-900">Expense Claim Details</h1>
            <p className="mt-1 text-sm text-gray-500">{expense.expenseNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Edit button - show for submitted expenses when not in edit mode */}
            {expense.status !== 'draft' && statusConfig[displayStatus]?.editable && !isEditMode && (
              <button
                onClick={() => setIsEditMode(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
            {/* Status badge */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${statusConfig[displayStatus]?.color || 'bg-gray-100 text-gray-800'}`}
            >
              <StatusIcon className="h-4 w-4" />
              {statusConfig[displayStatus]?.label || expense.status}
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Expense Details */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Claim Details
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
                  disabled={!canEditAmount}
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
            <div className="p-4 space-y-4">
              {/* Upload Area */}
              {isEditable && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#5A7A8F] transition-colors">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    multiple
                    accept="image/jpeg,image/png,image/gif,application/pdf"
                    className="hidden"
                    id="attachment-upload"
                  />
                  <label
                    htmlFor="attachment-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Click to upload receipt
                    </span>
                    <span className="text-xs text-gray-400">
                      JPEG, PNG, GIF, PDF up to 10MB
                    </span>
                  </label>
                </div>
              )}

              {/* Attachment List */}
              {attachments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">
                  No attachments yet
                </p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 flex-1 hover:text-[#5A7A8F]"
                      >
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {att.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(att.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </a>
                      <div className="flex items-center gap-2">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-gray-400 hover:text-[#5A7A8F]"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        {isEditable && (
                          <button
                            onClick={() => handleRemoveAttachment(att.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Expense Summary */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Claim Summary
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Receipt className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Claim Number</p>
                  <p className="text-sm font-medium text-gray-900">
                    {expense.expenseNumber}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(expense.createdAt)}
                  </p>
                </div>
              </div>

              {/* Amount Summary */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Amount Summary
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-700">
                      Claim Amount:
                    </span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expense Status Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Claim Status</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const config = statusConfig[expense.status as keyof typeof statusConfig];
                  const IconComponent = config?.icon || Clock;
                  const bgColor = expense.status === 'submitted' ? 'bg-blue-100'
                    : expense.status === 'approved' ? 'bg-green-100'
                    : expense.status === 'paid' ? 'bg-purple-100'
                    : expense.status === 'rejected' ? 'bg-red-100'
                    : expense.status === 'draft' ? 'bg-gray-100'
                    : 'bg-yellow-100';
                  const iconColor = expense.status === 'submitted' ? 'text-blue-600'
                    : expense.status === 'approved' ? 'text-green-600'
                    : expense.status === 'paid' ? 'text-purple-600'
                    : expense.status === 'rejected' ? 'text-red-600'
                    : expense.status === 'draft' ? 'text-gray-600'
                    : 'text-yellow-600';
                  return (
                    <div className={`p-2 rounded-lg ${bgColor}`}>
                      <IconComponent className={`h-5 w-5 ${iconColor}`} />
                    </div>
                  );
                })()}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {statusConfig[expense.status as keyof typeof statusConfig]?.label || expense.status}
                  </p>
                  <p className="text-xs text-gray-500">
                    {expense.status === 'draft'
                      ? 'Claim is in draft. Click "Submit Claim" to send for review.'
                      : expense.status === 'submitted'
                      ? 'Claim has been submitted for review'
                      : expense.status === 'approved'
                      ? 'Claim approved, awaiting payment'
                      : expense.status === 'paid'
                      ? 'Claim processed, wallet replenished'
                      : expense.status === 'rejected'
                      ? 'Claim was rejected'
                      : 'Claim is pending'}
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
              {expense?.status === 'draft' && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting || isSaving || isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 mr-auto"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </button>
              )}
              <button
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </button>
              {/* Show Submit button only for draft expenses */}
              {expense?.status === 'draft' && (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit Claim
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
