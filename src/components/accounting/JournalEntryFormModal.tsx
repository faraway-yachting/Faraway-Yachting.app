'use client';

import { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, Paperclip, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import {
  JournalEntry,
  JournalEntryLine,
  JournalEntryStatus,
  Attachment,
} from '@/data/accounting/journalEntryTypes';
import {
  addJournalEntry,
  updateJournalEntry,
  postJournalEntry,
  calculateTotals,
  isBalanced,
} from '@/data/accounting/journalEntries';
import { getAllCompanies } from '@/data/company/companies';
import { getActiveAccounts } from '@/data/accounting/chartOfAccounts';
import { Currency } from '@/data/company/types';
import JournalEntryLineItem from './JournalEntryLineItem';

interface JournalEntryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingEntry?: JournalEntry | null;
}

export function JournalEntryFormModal({
  isOpen,
  onClose,
  onSave,
  editingEntry,
}: JournalEntryFormModalProps) {
  // Form state
  const [date, setDate] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JournalEntryLine[]>([]);
  const [status, setStatus] = useState<JournalEntryStatus>('draft');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Derived state
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('THB');
  const companies = getAllCompanies();
  const availableAccounts = getActiveAccounts();

  // Initialize form with editing entry data
  useEffect(() => {
    if (editingEntry) {
      setDate(editingEntry.date);
      setCompanyId(editingEntry.companyId);
      setDescription(editingEntry.description);
      setLines(editingEntry.lines);
      setStatus(editingEntry.status);
      setAttachments(editingEntry.attachments || []);

      // Set currency from company
      const company = companies.find(c => c.id === editingEntry.companyId);
      if (company?.currency) {
        setSelectedCurrency(company.currency);
      }
    } else {
      // Reset form for new entry
      setDate(new Date().toISOString().split('T')[0]);
      setCompanyId('');
      setDescription('');
      setLines([]);
      setStatus('draft');
      setAttachments([]);
    }
    setErrors({});
  }, [editingEntry, isOpen]);

  // Update currency when company changes
  useEffect(() => {
    const company = companies.find(c => c.id === companyId);
    if (company?.currency) {
      setSelectedCurrency(company.currency);
      // Update all line currencies
      setLines(prevLines =>
        prevLines.map(line => ({
          ...line,
          currency: company.currency || 'THB',
        }))
      );
    }
  }, [companyId]);

  // Calculate totals
  const { totalDebit, totalCredit } = calculateTotals(lines);
  const isEntryBalanced = isBalanced(lines);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!date) {
      newErrors.date = 'Date is required';
    }

    if (!companyId) {
      newErrors.companyId = 'Company is required';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (lines.length < 2) {
      newErrors.lines = 'At least 2 lines are required (minimum 1 debit and 1 credit)';
    }

    // Validate each line
    lines.forEach((line, index) => {
      if (!line.accountCode) {
        newErrors[`line-${index}-account`] = 'Account is required';
      }
      if (!line.description.trim()) {
        newErrors[`line-${index}-description`] = 'Description is required';
      }
      if (!line.amount || line.amount <= 0) {
        newErrors[`line-${index}-amount`] = 'Amount must be greater than 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Line management functions
  const handleAddLine = () => {
    const newLine: JournalEntryLine = {
      id: `jel-${Date.now()}`,
      accountCode: '',
      accountName: '',
      description: '',
      type: 'debit',
      amount: 0,
      currency: selectedCurrency,
    };
    setLines([...lines, newLine]);
  };

  const handleUpdateLine = (index: number, updates: Partial<JournalEntryLine>) => {
    const updatedLines = lines.map((line, i) =>
      i === index ? { ...line, ...updates } : line
    );
    setLines(updatedLines);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  // Attachment management functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    Array.from(files).forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        alert(`File type not supported: ${file.name}. Only JPEG, PNG, GIF, and PDF are allowed.`);
        return;
      }

      if (file.size > maxSize) {
        alert(`File too large: ${file.name}. Maximum size is 10MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const attachment: Attachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: e.target?.result as string,
          uploadedAt: new Date().toISOString(),
        };
        newAttachments.push(attachment);

        if (newAttachments.length === Array.from(files).length) {
          setAttachments([...attachments, ...newAttachments]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    event.target.value = '';
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments(attachments.filter(att => att.id !== attachmentId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon;
    if (type === 'application/pdf') return FileText;
    return Paperclip;
  };

  // Submit handlers
  const handleSaveAsDraft = () => {
    if (!validateForm()) {
      return;
    }

    try {
      const { totalDebit, totalCredit } = calculateTotals(lines);

      if (editingEntry) {
        updateJournalEntry(editingEntry.id, {
          date,
          companyId,
          description,
          lines,
          status: 'draft',
          totalDebit,
          totalCredit,
          attachments,
        });
      } else {
        addJournalEntry({
          date,
          companyId,
          description,
          lines,
          status: 'draft',
          totalDebit,
          totalCredit,
          createdBy: 'current-user', // TODO: Replace with actual user when auth is implemented
          attachments,
        });
      }

      onSave();
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save journal entry');
    }
  };

  const handlePost = () => {
    if (!validateForm()) {
      return;
    }

    if (!isEntryBalanced) {
      alert('Cannot post unbalanced journal entry. Debits must equal credits.');
      return;
    }

    const confirmMessage = editingEntry
      ? 'Are you sure you want to post this journal entry? Posted entries cannot be edited.'
      : 'Are you sure you want to post this journal entry? Posted entries cannot be edited.';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      if (editingEntry) {
        // If editing a draft, first update it, then post it
        const { totalDebit, totalCredit } = calculateTotals(lines);
        updateJournalEntry(editingEntry.id, {
          date,
          companyId,
          description,
          lines,
          totalDebit,
          totalCredit,
          attachments,
        });
        postJournalEntry(editingEntry.id, 'current-user'); // TODO: Replace with actual user
      } else {
        // Create new entry as posted
        const newEntry = addJournalEntry({
          date,
          companyId,
          description,
          lines,
          status: 'draft',
          totalDebit,
          totalCredit,
          createdBy: 'current-user', // TODO: Replace with actual user
          attachments,
        });
        postJournalEntry(newEntry.id, 'current-user'); // TODO: Replace with actual user
      }

      onSave();
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to post journal entry');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Default action is save as draft
    handleSaveAsDraft();
  };

  if (!isOpen) return null;

  const isPosted = status === 'posted';
  const canPost = isEntryBalanced && lines.length >= 2;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={isPosted ? onClose : undefined}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-6xl bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {editingEntry
                  ? isPosted
                    ? 'View Journal Entry'
                    : 'Edit Journal Entry'
                  : 'New Journal Entry'}
              </h2>
              {editingEntry && (
                <p className="text-sm text-gray-500 mt-1">
                  {editingEntry.referenceNumber}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="px-6 py-6 space-y-6">
              {/* Header Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date */}
                <div>
                  <label
                    htmlFor="date"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={isPosted}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                      errors.date ? 'border-red-500' : 'border-gray-300'
                    } ${isPosted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  {errors.date && (
                    <p className="text-xs text-red-500 mt-1">{errors.date}</p>
                  )}
                </div>

                {/* Company */}
                <div>
                  <label
                    htmlFor="companyId"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Company <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="companyId"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    disabled={isPosted}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                      errors.companyId ? 'border-red-500' : 'border-gray-300'
                    } ${isPosted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Select company...</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                  {errors.companyId && (
                    <p className="text-xs text-red-500 mt-1">{errors.companyId}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isPosted}
                  rows={3}
                  placeholder="Enter a description for this journal entry..."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent resize-none ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  } ${isPosted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                {errors.description && (
                  <p className="text-xs text-red-500 mt-1">{errors.description}</p>
                )}
              </div>

              {/* Line Items Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
                  {!isPosted && (
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#2c3e50] transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Line
                    </button>
                  )}
                </div>

                {errors.lines && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-600">{errors.lines}</p>
                  </div>
                )}

                {lines.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">
                      No line items yet. Click "Add Line" to get started.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Account
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Currency
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {lines.map((line, index) => (
                          <JournalEntryLineItem
                            key={line.id}
                            line={line}
                            index={index}
                            onUpdate={handleUpdateLine}
                            onRemove={handleRemoveLine}
                            availableAccounts={availableAccounts}
                            errors={errors}
                            isPosted={isPosted}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Totals Display */}
              {lines.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Debits</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {totalDebit.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        {selectedCurrency}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Credits</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {totalCredit.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        {selectedCurrency}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Balance</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p
                          className={`text-lg font-semibold ${
                            isEntryBalanced ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {Math.abs(totalDebit - totalCredit).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          {selectedCurrency}
                        </p>
                        {isEntryBalanced ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Balanced
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Unbalanced
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Attachments Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Attachments</h3>
                  {!isPosted && (
                    <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#2c3e50] transition-colors cursor-pointer">
                      <Paperclip className="h-4 w-4" />
                      Add Files
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/gif,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <p className="text-sm text-gray-500 mb-3">
                  Upload supporting documents (receipts, invoices, etc.). Accepted formats: JPEG, PNG, GIF, PDF. Maximum size: 10MB per file.
                </p>

                {attachments.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">No attachments yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {attachments.map((attachment) => {
                      const FileIcon = getFileIcon(attachment.type);
                      const isImage = attachment.type.startsWith('image/');

                      return (
                        <div
                          key={attachment.id}
                          className="relative border border-gray-200 rounded-lg p-3 hover:border-[#5A7A8F] transition-colors"
                        >
                          {isImage ? (
                            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-2">
                              <img
                                src={attachment.url}
                                alt={attachment.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-2 flex items-center justify-center">
                              <FileIcon className="h-12 w-12 text-gray-400" />
                            </div>
                          )}

                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate" title={attachment.name}>
                                {attachment.name}
                              </p>
                              <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                            </div>

                            {!isPosted && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(attachment.id)}
                                className="flex-shrink-0 text-red-600 hover:text-red-800 transition-colors p-1"
                                title="Remove attachment"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          {isImage && (
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute inset-0 rounded-lg"
                              title="View full size"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-white rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {isPosted ? 'Close' : 'Cancel'}
            </button>
            {!isPosted && (
              <>
                <button
                  type="button"
                  onClick={handleSaveAsDraft}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={handlePost}
                  disabled={!canPost}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                    canPost
                      ? 'bg-[#5A7A8F] hover:bg-[#2c3e50]'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                  title={
                    !canPost
                      ? 'Entry must be balanced and have at least 2 lines to post'
                      : ''
                  }
                >
                  Post Entry
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
