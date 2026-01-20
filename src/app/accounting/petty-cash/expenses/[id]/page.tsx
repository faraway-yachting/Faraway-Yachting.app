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

  // Expense state - loaded from Supabase
  const [expense, setExpense] = useState<FrontendExpense | null>(null);
  const [isLoadingExpense, setIsLoadingExpense] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // For now, reimbursement tracking is not in Supabase yet
  // Set isEditable to true for all expenses
  const isEditable = true;

  // Form state for editable fields
  const [expenseDate, setExpenseDate] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [amount, setAmount] = useState(expense?.amount || 0);
  const [description, setDescription] = useState(expense?.description || '');
  const [isSaving, setIsSaving] = useState(false);
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
            attachments: [], // Attachments not stored in current schema
          };
          setExpense(frontendExpense);
          // Initialize form fields
          setExpenseDate(frontendExpense.expenseDate);
          setCompanyId(frontendExpense.companyId);
          setProjectId(frontendExpense.projectId);
          setAmount(frontendExpense.amount);
          setDescription(frontendExpense.description);
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

  // Handle save
  const handleSave = useCallback(async () => {
    if (!expense || !isEditable) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      // Update expense in Supabase
      await pettyCashApi.updateExpense(expense.id, {
        expense_date: expenseDate,
        company_id: companyId,
        project_id: projectId,
        amount,
        description,
      });

      // Update local state
      setExpense((prev) => prev ? {
        ...prev,
        expenseDate,
        companyId,
        projectId,
        amount,
        description,
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
  ]);

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
            <h1 className="text-2xl font-bold text-gray-900">Expense Details</h1>
            <p className="mt-1 text-sm text-gray-500">{expense.expenseNumber}</p>
          </div>
          <div className="flex items-center gap-3">
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

        {/* Right Column - Expense Summary */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Expense Summary
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Receipt className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Expense Number</p>
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
                      Expense Amount:
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
              <h3 className="text-sm font-semibold text-gray-900">Expense Status</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    expense.status === 'submitted'
                      ? 'bg-green-100'
                      : 'bg-yellow-100'
                  }`}
                >
                  {expense.status === 'submitted' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {expense.status === 'submitted'
                      ? 'Submitted'
                      : 'Draft'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {expense.status === 'submitted'
                      ? 'Expense has been submitted for processing'
                      : 'Expense is in draft status'}
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
