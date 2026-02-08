'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { X, Upload, FileText, Trash2, Loader2, Camera } from 'lucide-react';
import type { Attachment } from '@/data/petty-cash/types';
import type { Project } from '@/data/project/types';
import { projectsApi } from '@/lib/supabase/api/projects';
import { dbProjectToFrontend } from '@/lib/supabase/transforms';
import {
  formatCurrency,
  getTodayISO,
  validateSimplifiedExpenseForm,
  generateId,
} from '@/lib/petty-cash/utils';
import type { SimplifiedExpenseInput } from '@/data/petty-cash/expenses';

interface ExpenseFormProps {
  walletId: string;
  walletHolderName: string;
  onSave: (expense: SimplifiedExpenseInput) => void | Promise<void>;
  onCancel: () => void;
  initialData?: {
    projectId: string;
    expenseDate: string;
    amount: number;
    description: string;
  };
  isResubmit?: boolean;
}

export default function ExpenseForm({
  walletId,
  walletHolderName,
  onSave,
  onCancel,
  initialData,
  isResubmit = false,
}: ExpenseFormProps) {
  // Async loaded data
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projectsData = await projectsApi.getActive();
        setProjects(projectsData.map(dbProjectToFrontend));
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setIsLoadingProjects(false);
      }
    };
    loadProjects();
  }, []);

  // Form state - initialize with initialData if provided (for resubmit)
  const [projectId, setProjectId] = useState(initialData?.projectId || '');
  const [expenseDate, setExpenseDate] = useState(initialData?.expenseDate || getTodayISO());
  const [amount, setAmount] = useState<number | ''>(initialData?.amount || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Ref for immediate duplicate submission blocking (faster than state)
  const isSubmittingRef = useRef(false);

  // Get selected project
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  // Handle file upload
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      Array.from(files).forEach((file) => {
        // Validate file type (images only for receipt photos)
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
          setErrors((prev) => ({
            ...prev,
            attachments: 'Only JPEG, PNG, GIF, and PDF files are allowed',
          }));
          return;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          setErrors((prev) => ({
            ...prev,
            attachments: 'File size must be less than 10MB',
          }));
          return;
        }

        // Read file as base64
        const reader = new FileReader();
        reader.onload = (e) => {
          const attachment: Attachment = {
            id: `att-${generateId()}`,
            name: file.name,
            size: file.size,
            type: file.type,
            url: e.target?.result as string,
            uploadedAt: new Date().toISOString(),
          };
          setAttachments((prev) => [...prev, attachment]);
          // Clear error when file is added
          setErrors((prev) => {
            const { attachments: _, ...rest } = prev;
            return rest;
          });
        };
        reader.readAsDataURL(file);
      });

      // Reset input
      event.target.value = '';
    },
    []
  );

  // Remove attachment
  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    // Immediate blocking using ref (prevents duplicate submissions)
    if (isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;

    // Validate (company is no longer required - accountant will add it)
    const validationErrors = validateSimplifiedExpenseForm({
      companyId: 'pending', // Placeholder - accountant will assign
      projectId,
      expenseDate,
      amount: typeof amount === 'number' ? amount : 0,
      attachments,
    });

    // Remove company error since it's optional now
    delete validationErrors.companyId;

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      isSubmittingRef.current = false;
      return;
    }

    setIsSaving(true);
    setErrors({});

    try {
      const expenseData: SimplifiedExpenseInput = {
        walletId,
        walletHolderName,
        companyId: '', // Will be assigned by accountant
        companyName: '', // Will be assigned by accountant
        expenseDate,
        description,
        amount: typeof amount === 'number' ? amount : 0,
        projectId,
        projectName: selectedProject?.name || '',
        attachments,
        createdBy: walletHolderName,
      };

      await onSave(expenseData);
    } catch (error) {
      setErrors({ submit: 'Failed to save expense. Please try again.' });
    } finally {
      setIsSaving(false);
      isSubmittingRef.current = false;
    }
  }, [
    projectId,
    expenseDate,
    amount,
    description,
    attachments,
    walletId,
    walletHolderName,
    selectedProject,
    onSave,
  ]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50">
      <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isResubmit ? 'Resubmit Claim' : 'New Expense Claim'}
              </h2>
              {isResubmit && (
                <p className="text-sm text-amber-600 mt-1">
                  Review and edit the data before resubmitting
                </p>
              )}
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Content */}
          <div className="px-6 py-6 space-y-5">
            {/* Error Banner */}
            {errors.submit && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {errors.submit}
              </div>
            )}

            {/* Expense Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expense Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] ${
                  errors.expenseDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.expenseDate && (
                <p className="mt-1 text-sm text-red-600">{errors.expenseDate}</p>
              )}
            </div>

            {/* Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] ${
                  errors.projectId ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </select>
              {errors.projectId && (
                <p className="mt-1 text-sm text-red-600">{errors.projectId}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ฿
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value ? parseFloat(e.target.value) : '')
                  }
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] ${
                    errors.amount ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
              )}
              {typeof amount === 'number' && amount > 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  {formatCurrency(amount)}
                </p>
              )}
            </div>

            {/* Description (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the expense"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              />
            </div>

            {/* Receipt Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Receipt Photo <span className="text-red-500">*</span>
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  errors.attachments
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300 hover:border-[#5A7A8F]'
                }`}
              >
                <input
                  type="file"
                  onChange={handleFileUpload}
                  multiple
                  accept="image/jpeg,image/png,image/gif,application/pdf"
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="h-8 w-8 text-gray-400" />
                    <Upload className="h-6 w-6 text-gray-400" />
                  </div>
                  <span className="text-sm text-gray-600">
                    Take photo or upload receipt
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    JPEG, PNG, GIF, PDF up to 10MB
                  </span>
                </label>
              </div>
              {errors.attachments && (
                <p className="mt-1 text-sm text-red-600">{errors.attachments}</p>
              )}

              {/* Attachment List */}
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {att.type.startsWith('image/') ? (
                          <img
                            src={att.url}
                            alt={att.name}
                            className="h-10 w-10 object-cover rounded"
                          />
                        ) : (
                          <FileText className="h-10 w-10 text-gray-400 p-2" />
                        )}
                        <div>
                          <span className="text-sm text-gray-700 block truncate max-w-[180px]">
                            {att.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            ({(att.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Receipt Info Note */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">
                <strong>Note:</strong> Please send the original receipt to the
                accountant to complete the claim process.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isResubmit ? 'Resubmit Claim' : 'Submit Claim'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
