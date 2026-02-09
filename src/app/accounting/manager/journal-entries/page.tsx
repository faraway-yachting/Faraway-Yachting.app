'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { FileDown, RefreshCw, Pencil, Plus, Trash2, Check, CheckSquare, Square, X, HelpCircle, RotateCcw, Play, Pause, Calendar } from 'lucide-react';
import { AppShell } from '@/components/accounting/AppShell';
import { DataTable } from '@/components/accounting/DataTable';
import { KPICard } from '@/components/accounting/KPICard';
import { journalEntriesApi, chartOfAccountsApi, JournalEntryWithLines } from '@/lib/supabase/api/journalEntries';
import { companiesApi } from '@/lib/supabase/api/companies';
import { recurringEntriesApi, RecurringJournalTemplate } from '@/lib/supabase/api/recurringEntries';
import { useAuth } from '@/components/auth';
import { generateJournalReferenceNumber } from '@/lib/accounting/journalPostingService';
import type { Database } from '@/lib/supabase/database.types';

type ChartOfAccount = Database['public']['Tables']['chart_of_accounts']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];
type JournalEntryStatus = 'draft' | 'posted';

interface EditableLine {
  id?: string;
  account_code: string;
  description: string;
  entry_type: 'debit' | 'credit';
  amount: number;
}

// Modal for creating a NEW journal entry
function NewJournalEntryModal({
  companies,
  accounts,
  onClose,
  onCreate,
}: {
  companies: Company[];
  accounts: ChartOfAccount[];
  onClose: () => void;
  onCreate: (data: { companyId: string; entryDate: string; description: string; lines: EditableLine[] }) => Promise<void>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<EditableLine[]>([
    { account_code: '', description: '', entry_type: 'debit', amount: 0 },
    { account_code: '', description: '', entry_type: 'credit', amount: 0 },
  ]);

  const totalDebit = lines
    .filter((l) => l.entry_type === 'debit')
    .reduce((sum, l) => sum + (l.amount || 0), 0);
  const totalCredit = lines
    .filter((l) => l.entry_type === 'credit')
    .reduce((sum, l) => sum + (l.amount || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleAddLine = () => {
    setLines([
      ...lines,
      { account_code: '', description: '', entry_type: 'debit', amount: 0 },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) {
      alert('Journal entry must have at least 2 lines');
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof EditableLine, value: string | number) => {
    const newLines = [...lines];
    if (field === 'amount') {
      newLines[index][field] = typeof value === 'string' ? parseFloat(value) || 0 : value;
    } else if (field === 'entry_type') {
      newLines[index][field] = value as 'debit' | 'credit';
    } else {
      newLines[index][field as 'account_code' | 'description'] = value as string;
    }
    setLines(newLines);
  };

  const validateForm = (): boolean => {
    if (!companyId) {
      alert('Please select a company');
      return false;
    }
    if (!entryDate) {
      alert('Please select a date');
      return false;
    }
    if (!description.trim()) {
      alert('Please enter a description');
      return false;
    }
    if (lines.some((line) => !line.account_code)) {
      alert('All lines must have an account selected');
      return false;
    }
    if (lines.some((line) => line.amount <= 0)) {
      alert('All lines must have an amount greater than 0');
      return false;
    }
    if (!isBalanced) {
      alert('Journal entry must be balanced (total debits = total credits)');
      return false;
    }
    return true;
  };

  const handleSave = async (shouldPost: boolean = false) => {
    if (!validateForm()) return;

    if (shouldPost) {
      setIsPosting(true);
    } else {
      setIsSaving(true);
    }

    try {
      await onCreate({ companyId, entryDate, description, lines });
      onClose();
    } catch (error) {
      console.error('Failed to create journal entry:', error);
      alert('Failed to create journal entry');
    } finally {
      setIsSaving(false);
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                New Journal Entry
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Create a manual journal entry
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
            >
              &times;
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Entry info */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Date</label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Company</label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                >
                  <option value="">Select company...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                placeholder="Enter description..."
              />
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
                <button
                  onClick={handleAddLine}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#5A7A8F] hover:text-[#2c3e50] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Line
                </button>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Account
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Debit
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Credit
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-16">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">
                          <select
                            value={line.account_code}
                            onChange={(e) => handleLineChange(idx, 'account_code', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                          >
                            <option value="">Select account...</option>
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.code}>
                                {acc.code} - {acc.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                            placeholder="Line description..."
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={line.entry_type === 'debit' ? line.amount || '' : ''}
                            onChange={(e) => {
                              handleLineChange(idx, 'entry_type', 'debit');
                              handleLineChange(idx, 'amount', e.target.value);
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={line.entry_type === 'credit' ? line.amount || '' : ''}
                            onChange={(e) => {
                              handleLineChange(idx, 'entry_type', 'credit');
                              handleLineChange(idx, 'amount', e.target.value);
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => handleRemoveLine(idx)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Remove line"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-sm font-medium text-gray-900">
                        Totals
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td />
                    </tr>
                    {!isBalanced && (
                      <tr>
                        <td colSpan={5} className="px-4 py-2 text-sm text-red-600">
                          Warning: Entry is not balanced. Difference:{' '}
                          {Math.abs(totalDebit - totalCredit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving || isPosting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving || isPosting || !isBalanced}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isPosting ? 'Posting...' : 'Save & Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal for viewing and editing journal entry details
function JournalEntryModal({
  entry,
  companies,
  accounts,
  onClose,
  onSave,
  onPost,
  onDelete,
}: {
  entry: JournalEntryWithLines | null;
  companies: Company[];
  accounts: ChartOfAccount[];
  onClose: () => void;
  onSave: (entryId: string, description: string, lines: EditableLine[]) => Promise<void>;
  onPost: (entryId: string) => Promise<void>;
  onDelete: (entryId: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<EditableLine[]>([]);

  useEffect(() => {
    if (entry) {
      setDescription(entry.description || '');
      setLines(
        entry.lines?.map((line) => ({
          id: line.id,
          account_code: line.account_code,
          description: line.description || '',
          entry_type: line.entry_type as 'debit' | 'credit',
          amount: line.amount,
        })) || []
      );
      setIsEditing(false);
    }
  }, [entry]);

  if (!entry) return null;

  const company = companies.find((c) => c.id === entry.company_id);
  const canEdit = entry.status === 'draft';

  const totalDebit = lines
    .filter((l) => l.entry_type === 'debit')
    .reduce((sum, l) => sum + (l.amount || 0), 0);
  const totalCredit = lines
    .filter((l) => l.entry_type === 'credit')
    .reduce((sum, l) => sum + (l.amount || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleAddLine = () => {
    setLines([
      ...lines,
      { account_code: '', description: '', entry_type: 'debit', amount: 0 },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof EditableLine, value: string | number) => {
    const newLines = [...lines];
    if (field === 'amount') {
      newLines[index][field] = typeof value === 'string' ? parseFloat(value) || 0 : value;
    } else if (field === 'entry_type') {
      newLines[index][field] = value as 'debit' | 'credit';
    } else {
      newLines[index][field as 'account_code' | 'description'] = value as string;
    }
    setLines(newLines);
  };

  const handleSave = async () => {
    if (!isBalanced) {
      alert('Journal entry must be balanced (total debits = total credits)');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(entry.id, description, lines);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save journal entry');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePost = async () => {
    if (!confirm('Are you sure you want to post this journal entry? This action cannot be undone.')) {
      return;
    }
    setIsPosting(true);
    try {
      await onPost(entry.id);
      onClose();
    } catch (error) {
      console.error('Failed to post:', error);
      alert('Failed to post journal entry');
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this journal entry? It will be moved to the Deleted tab.')) {
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete(entry.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete journal entry');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setDescription(entry.description || '');
    setLines(
      entry.lines?.map((line) => ({
        id: line.id,
        account_code: line.account_code,
        description: line.description || '',
        entry_type: line.entry_type as 'debit' | 'credit',
        amount: line.amount,
      })) || []
    );
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? 'Edit Journal Entry' : 'Journal Entry Details'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {entry.reference_number || 'No reference'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
            >
              &times;
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Entry info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Date</p>
                <p className="text-gray-900">
                  {new Date(entry.entry_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Company</p>
                <p className="text-gray-900">{company?.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    entry.status === 'posted'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {entry.status === 'posted' ? 'Posted' : 'Draft'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Auto-Generated</p>
                <p className="text-gray-900">{entry.is_auto_generated ? 'Yes' : 'No'}</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Description</p>
              {isEditing ? (
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                  placeholder="Enter description..."
                />
              ) : (
                <p className="text-gray-900">{entry.description || '-'}</p>
              )}
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
                {isEditing && (
                  <button
                    onClick={handleAddLine}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#5A7A8F] hover:text-[#2c3e50] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Line
                  </button>
                )}
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Account
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Debit
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Credit
                      </th>
                      {isEditing && (
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-16">
                          Action
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isEditing
                      ? lines.map((line, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2">
                              <select
                                value={line.account_code}
                                onChange={(e) => handleLineChange(idx, 'account_code', e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                              >
                                <option value="">Select account...</option>
                                {accounts.map((acc) => (
                                  <option key={acc.id} value={acc.code}>
                                    {acc.code} - {acc.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={line.description}
                                onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                                placeholder="Line description..."
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                value={line.entry_type === 'debit' ? line.amount || '' : ''}
                                onChange={(e) => {
                                  handleLineChange(idx, 'entry_type', 'debit');
                                  handleLineChange(idx, 'amount', e.target.value);
                                }}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                value={line.entry_type === 'credit' ? line.amount || '' : ''}
                                onChange={(e) => {
                                  handleLineChange(idx, 'entry_type', 'credit');
                                  handleLineChange(idx, 'amount', e.target.value);
                                }}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button
                                onClick={() => handleRemoveLine(idx)}
                                className="text-red-500 hover:text-red-700 transition-colors"
                                title="Remove line"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      : entry.lines?.map((line, idx) => {
                          const account = accounts.find((a) => a.code === line.account_code);
                          return (
                            <tr key={line.id || idx}>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                <span className="font-medium">{line.account_code}</span>
                                {account && (
                                  <span className="text-gray-500 ml-2">- {account.name}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {line.description || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                {line.entry_type === 'debit'
                                  ? line.amount.toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                    })
                                  : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                {line.entry_type === 'credit'
                                  ? line.amount.toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                    })
                                  : '-'}
                              </td>
                            </tr>
                          );
                        })}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-sm font-medium text-gray-900">
                        Totals
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        {(isEditing ? totalDebit : entry.total_debit || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        {(isEditing ? totalCredit : entry.total_credit || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      {isEditing && <td />}
                    </tr>
                    {isEditing && !isBalanced && (
                      <tr>
                        <td colSpan={isEditing ? 5 : 4} className="px-4 py-2 text-sm text-red-600">
                          Warning: Entry is not balanced. Difference:{' '}
                          {Math.abs(totalDebit - totalCredit).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              {canEdit && !isEditing && (
                <>
                  <button
                    onClick={handlePost}
                    disabled={isPosting || isDeleting}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    {isPosting ? 'Posting...' : 'Post Entry'}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting || isPosting}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !isBalanced}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <>
                  {canEdit && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#5A7A8F] bg-white border border-[#5A7A8F] rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Help modal for explaining auto-generated journal entries
function AutoJournalHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#5A7A8F] to-[#4a6a7f]">
            <div>
              <h2 className="text-xl font-semibold text-white">
                How Auto-Generated Journal Entries Work
              </h2>
              <p className="text-sm text-white/80 mt-1">
                Understanding the automatic accounting system
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors text-2xl"
            >
              &times;
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Overview */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Overview</h3>
              <p className="text-gray-600">
                The system automatically creates journal entries when specific business events occur.
                These entries are created in <span className="font-medium text-yellow-700">Draft</span> status
                for accountant review before posting to the general ledger.
              </p>
            </div>

            {/* Triggers */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">What Triggers Auto-Generation?</h3>
              <div className="space-y-4">
                {/* Expense Approved */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      EXPENSE APPROVED
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">
                    When an expense is approved, the system records the liability and expense.
                  </p>
                  <div className="bg-white rounded border border-blue-200 p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Journal Entry Created:</p>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr>
                          <td className="py-1 text-gray-700">Dr. Expense Account (from line items)</td>
                          <td className="py-1 text-right text-gray-900 font-medium">XXX</td>
                          <td className="py-1 w-20"></td>
                        </tr>
                        <tr>
                          <td className="py-1 text-gray-700">Dr. VAT Receivable (1170) <span className="text-gray-400 text-xs">if applicable</span></td>
                          <td className="py-1 text-right text-gray-900 font-medium">XXX</td>
                          <td className="py-1 w-20"></td>
                        </tr>
                        <tr>
                          <td className="py-1 text-gray-700 pl-8">Cr. Accounts Payable (2050)</td>
                          <td className="py-1 w-20"></td>
                          <td className="py-1 text-right text-gray-900 font-medium">XXX</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Expense Paid */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                      EXPENSE PAID
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">
                    When an expense payment is made, the system clears the liability.
                  </p>
                  <div className="bg-white rounded border border-green-200 p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Journal Entry Created:</p>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr>
                          <td className="py-1 text-gray-700">Dr. Accounts Payable (2050)</td>
                          <td className="py-1 text-right text-gray-900 font-medium">XXX</td>
                          <td className="py-1 w-20"></td>
                        </tr>
                        <tr>
                          <td className="py-1 text-gray-700 pl-8">Cr. Bank/Cash Account (from payment)</td>
                          <td className="py-1 w-20"></td>
                          <td className="py-1 text-right text-gray-900 font-medium">XXX</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Receipt Received */}
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                      RECEIPT / PAYMENT RECEIVED
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">
                    When a receipt with payment is created, the system records revenue with smart recognition.
                  </p>
                  <div className="bg-white rounded border border-purple-200 p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Journal Entry Created:</p>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr>
                          <td className="py-1 text-gray-700">Dr. Bank/Cash Account (per payment)</td>
                          <td className="py-1 text-right text-gray-900 font-medium">XXX</td>
                          <td className="py-1 w-20"></td>
                        </tr>
                        <tr>
                          <td className="py-1 text-gray-700 pl-8">Cr. Revenue (from line items)</td>
                          <td className="py-1 w-20"></td>
                          <td className="py-1 text-right text-gray-900 font-medium">XXX</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-gray-700 pl-8">Cr. VAT Payable (2200) <span className="text-gray-400 text-xs">if applicable</span></td>
                          <td className="py-1 w-20"></td>
                          <td className="py-1 text-right text-gray-900 font-medium">XXX</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="mt-3 pt-3 border-t border-purple-100">
                      <p className="text-xs text-purple-700">
                        <strong>Smart Revenue Recognition:</strong> If the charter service is not yet completed,
                        revenue is credited to "Deferred Revenue" (2300) instead of direct revenue accounts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Default Account Codes */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Default Account Codes</h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Accounts Payable</p>
                    <p className="font-medium text-gray-900">2050</p>
                  </div>
                  <div>
                    <p className="text-gray-500">VAT Receivable (Input)</p>
                    <p className="font-medium text-gray-900">1170</p>
                  </div>
                  <div>
                    <p className="text-gray-500">VAT Payable (Output)</p>
                    <p className="font-medium text-gray-900">2200</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Deferred Revenue</p>
                    <p className="font-medium text-gray-900">2300</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Default Expense</p>
                    <p className="font-medium text-gray-900">6790</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Default Revenue</p>
                    <p className="font-medium text-gray-900">4490</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Account codes are resolved in order: Source document → Company settings → System defaults
                </p>
              </div>
            </div>

            {/* Features */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Features</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-gray-700">
                    <strong>Draft for Review:</strong> All auto-generated entries are created as drafts,
                    allowing accountants to review and modify before posting.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-gray-700">
                    <strong>Duplicate Prevention:</strong> The system checks for existing entries
                    to prevent duplicate journal entries for the same transaction.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-gray-700">
                    <strong>Balance Validation:</strong> Entries are validated to ensure
                    total debits equal total credits before creation.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-gray-700">
                    <strong>Audit Trail:</strong> Each entry links back to its source document
                    (expense, receipt, etc.) for complete traceability.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntryWithLines[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingEntry, setViewingEntry] = useState<JournalEntryWithLines | null>(null);

  // Bulk selection states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkPosting, setIsBulkPosting] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'entries' | 'deleted' | 'recurring'>('entries');

  // Deleted tab state
  const [deletedEntries, setDeletedEntries] = useState<JournalEntryWithLines[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);

  // Help modal state
  const [showHelpModal, setShowHelpModal] = useState(false);

  // New journal entry modal state
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);

  // Auth
  const { user } = useAuth();

  // Recurring tab state
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringJournalTemplate[]>([]);
  const [loadingRecurring, setLoadingRecurring] = useState(false);
  const [executingTemplateId, setExecutingTemplateId] = useState<string | null>(null);
  const [executingAllDue, setExecutingAllDue] = useState(false);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<'all' | JournalEntryStatus>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Load data from Supabase
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [entriesData, companiesData, accountsData] = await Promise.all([
        journalEntriesApi.getAllWithLines(),
        companiesApi.getAll(),
        chartOfAccountsApi.getActive(),
      ]);
      setEntries(entriesData);
      setCompanies(companiesData);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load deleted entries when tab is active
  useEffect(() => {
    if (activeTab !== 'deleted') return;
    const loadDeleted = async () => {
      setLoadingDeleted(true);
      try {
        const data = await journalEntriesApi.getDeleted();
        setDeletedEntries(data);
      } catch (error) {
        console.error('Failed to load deleted entries:', error);
      } finally {
        setLoadingDeleted(false);
      }
    };
    loadDeleted();
  }, [activeTab]);

  // Load recurring templates when tab is active
  useEffect(() => {
    if (activeTab !== 'recurring') return;
    const loadRecurring = async () => {
      setLoadingRecurring(true);
      try {
        const data = await recurringEntriesApi.getAll();
        setRecurringTemplates(data);
      } catch (error) {
        console.error('Failed to load recurring templates:', error);
      } finally {
        setLoadingRecurring(false);
      }
    };
    loadRecurring();
  }, [activeTab]);

  // Recurring handlers
  const handleRunTemplate = async (template: RecurringJournalTemplate) => {
    if (!confirm(`Run recurring entry "${template.description}" now?`)) return;
    setExecutingTemplateId(template.id);
    try {
      await recurringEntriesApi.executeEntry(template);
      // Refresh recurring list
      const data = await recurringEntriesApi.getAll();
      setRecurringTemplates(data);
      await loadData();
    } catch (error) {
      console.error('Failed to execute recurring entry:', error);
      alert('Failed to execute recurring entry');
    } finally {
      setExecutingTemplateId(null);
    }
  };

  const handleRunAllDue = async () => {
    if (!confirm('Execute all due recurring entries now?')) return;
    setExecutingAllDue(true);
    try {
      const result = await recurringEntriesApi.executeDueEntries();
      alert(`Executed ${result.executed} entries. ${result.errors > 0 ? `${result.errors} errors.` : ''}`);
      const data = await recurringEntriesApi.getAll();
      setRecurringTemplates(data);
      await loadData();
    } catch (error) {
      console.error('Failed to execute due entries:', error);
      alert('Failed to execute due entries');
    } finally {
      setExecutingAllDue(false);
    }
  };

  const handleDeactivateTemplate = async (template: RecurringJournalTemplate) => {
    const newState = !template.is_active;
    if (!confirm(`${newState ? 'Activate' : 'Deactivate'} "${template.description}"?`)) return;
    try {
      await recurringEntriesApi.update(template.id, { is_active: newState } as any);
      setRecurringTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, is_active: newState } : t))
      );
    } catch (error) {
      console.error('Failed to update template:', error);
      alert('Failed to update template');
    }
  };

  // Restore handler
  const handleRestoreEntry = async (entryId: string) => {
    try {
      await journalEntriesApi.restore(entryId);
      setDeletedEntries((prev) => prev.filter((e) => e.id !== entryId));
      await loadData();
    } catch (error) {
      console.error('Failed to restore entry:', error);
      alert('Failed to restore journal entry');
    }
  };

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Safety net: never show deleted entries in normal view
      if (entry.status === 'deleted') return false;
      if (filterStatus !== 'all' && entry.status !== filterStatus) {
        return false;
      }
      if (filterCompany !== 'all' && entry.company_id !== filterCompany) {
        return false;
      }
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesReference = entry.reference_number?.toLowerCase().includes(search);
        const matchesDescription = entry.description?.toLowerCase().includes(search);
        if (!matchesReference && !matchesDescription) {
          return false;
        }
      }
      if (startDate && entry.entry_date < startDate) {
        return false;
      }
      if (endDate && entry.entry_date > endDate) {
        return false;
      }
      return true;
    });
  }, [entries, filterStatus, filterCompany, searchTerm, startDate, endDate]);

  // Sort by date (newest first)
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      return new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime();
    });
  }, [filteredEntries]);

  // KPI calculations
  const totalCount = entries.length;
  const draftCount = entries.filter((e) => e.status === 'draft').length;
  const postedCount = entries.filter((e) => e.status === 'posted').length;
  const totalAmount = entries.reduce((sum, e) => sum + (e.total_debit || 0), 0);

  // Get draft entries from current filtered/sorted list for bulk selection
  const draftEntries = useMemo(() => {
    return sortedEntries.filter((e) => e.status === 'draft');
  }, [sortedEntries]);

  // Check if all draft entries are selected
  const allDraftsSelected = draftEntries.length > 0 && draftEntries.every((e) => selectedIds.has(e.id));

  // Handlers
  const handleViewEntry = (entry: JournalEntryWithLines) => {
    if (isSelectionMode) return; // Don't open modal in selection mode
    setViewingEntry(entry);
  };

  // Toggle selection of a single entry
  const handleToggleSelect = (entryId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  // Toggle select all drafts
  const handleToggleSelectAll = () => {
    if (allDraftsSelected) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all drafts
      setSelectedIds(new Set(draftEntries.map((e) => e.id)));
    }
  };

  // Exit selection mode
  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  // Bulk post selected entries
  const handleBulkPost = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to post ${count} journal ${count === 1 ? 'entry' : 'entries'}? This action cannot be undone.`)) {
      return;
    }

    setIsBulkPosting(true);
    try {
      // Post all selected entries
      const postPromises = Array.from(selectedIds).map((id) =>
        journalEntriesApi.postEntry(id)
      );
      await Promise.all(postPromises);

      // Reset selection and refresh
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      await loadData();
    } catch (error) {
      console.error('Failed to post entries:', error);
      alert('Failed to post some entries. Please try again.');
    } finally {
      setIsBulkPosting(false);
    }
  };

  const handleSaveEntry = async (entryId: string, description: string, lines: EditableLine[]) => {
    // Calculate totals
    const totalDebit = lines
      .filter((l) => l.entry_type === 'debit')
      .reduce((sum, l) => sum + (l.amount || 0), 0);
    const totalCredit = lines
      .filter((l) => l.entry_type === 'credit')
      .reduce((sum, l) => sum + (l.amount || 0), 0);

    // Update the journal entry
    await journalEntriesApi.update(entryId, {
      description,
      total_debit: totalDebit,
      total_credit: totalCredit,
    });

    // Update the lines
    await journalEntriesApi.updateLines(
      entryId,
      lines.map((line) => ({
        journal_entry_id: entryId,
        account_code: line.account_code,
        description: line.description,
        entry_type: line.entry_type,
        amount: line.amount,
      }))
    );

    // Refresh the viewing entry and list
    const updatedEntry = await journalEntriesApi.getByIdWithLines(entryId);
    setViewingEntry(updatedEntry);
    await loadData();
  };

  const handlePostEntry = async (entryId: string) => {
    await journalEntriesApi.postEntry(entryId);
    await loadData();
  };

  const handleDeleteEntry = async (entryId: string) => {
    await journalEntriesApi.delete(entryId);
    await loadData();
  };

  const handleCreateEntry = async (data: { companyId: string; entryDate: string; description: string; lines: EditableLine[] }) => {
    // Generate reference number
    const referenceNumber = await generateJournalReferenceNumber(data.companyId);

    // Calculate totals
    const totalDebit = data.lines
      .filter((l) => l.entry_type === 'debit')
      .reduce((sum, l) => sum + (l.amount || 0), 0);
    const totalCredit = data.lines
      .filter((l) => l.entry_type === 'credit')
      .reduce((sum, l) => sum + (l.amount || 0), 0);

    // Create the journal entry
    const newEntry = await journalEntriesApi.create({
      reference_number: referenceNumber,
      company_id: data.companyId,
      entry_date: data.entryDate,
      description: data.description,
      status: 'draft',
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_auto_generated: false, // Manual entry
    });

    // Create the lines
    await journalEntriesApi.updateLines(
      newEntry.id,
      data.lines.map((line) => ({
        journal_entry_id: newEntry.id,
        account_code: line.account_code,
        description: line.description,
        entry_type: line.entry_type,
        amount: line.amount,
      }))
    );

    // Refresh the list
    await loadData();
  };

  const handleExportCSV = () => {
    const headers = [
      'Reference Number',
      'Date',
      'Company',
      'Description',
      'Status',
      'Total Debit',
      'Total Credit',
      'Created At',
    ];

    const rows = sortedEntries.map((entry) => {
      const company = companies.find((c) => c.id === entry.company_id);
      return [
        entry.reference_number || '',
        entry.entry_date,
        company?.name || '',
        entry.description || '',
        entry.status,
        (entry.total_debit || 0).toString(),
        (entry.total_credit || 0).toString(),
        new Date(entry.created_at).toLocaleString(),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `journal-entries-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Table columns for journal entries
  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: 'reference_number',
        header: 'Reference',
        primary: true,
        render: (entry: JournalEntryWithLines) => (
          <span className="font-medium text-gray-900">{entry.reference_number || '-'}</span>
        ),
      },
      {
        key: 'entry_date',
        header: 'Date',
        render: (entry: JournalEntryWithLines) => (
          <span className="text-gray-900">
            {new Date(entry.entry_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        ),
      },
      {
        key: 'company_id',
        header: 'Company',
        hideOnMobile: true,
        render: (entry: JournalEntryWithLines) => {
          const company = companies.find((c) => c.id === entry.company_id);
          return <span className="text-gray-900">{company?.name || 'Unknown'}</span>;
        },
      },
      {
        key: 'description',
        header: 'Description',
        hideOnMobile: true,
        render: (entry: JournalEntryWithLines) => (
          <span className="text-gray-900 line-clamp-2">{entry.description || '-'}</span>
        ),
      },
      {
        key: 'total_debit',
        header: 'Amount',
        render: (entry: JournalEntryWithLines) => (
          <span className="text-gray-900 font-medium">
            {(entry.total_debit || 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (entry: JournalEntryWithLines) => (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              entry.status === 'posted'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {entry.status === 'posted' ? 'Posted' : 'Draft'}
          </span>
        ),
      },
    ];

    // Add checkbox column when in selection mode
    if (isSelectionMode) {
      return [
        {
          key: 'select',
          header: (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleSelectAll();
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title={allDraftsSelected ? 'Deselect all' : 'Select all drafts'}
            >
              {allDraftsSelected ? (
                <CheckSquare className="h-4 w-4 text-green-600" />
              ) : (
                <Square className="h-4 w-4 text-gray-400" />
              )}
            </button>
          ),
          render: (entry: JournalEntryWithLines) => {
            const isSelected = selectedIds.has(entry.id);
            const isDraft = entry.status === 'draft';
            return (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isDraft) handleToggleSelect(entry.id);
                }}
                disabled={!isDraft}
                className={`p-1 rounded transition-colors ${
                  isDraft ? 'hover:bg-gray-100' : 'cursor-not-allowed opacity-50'
                }`}
                title={isDraft ? (isSelected ? 'Deselect' : 'Select') : 'Already posted'}
              >
                {isSelected ? (
                  <CheckSquare className="h-4 w-4 text-green-600" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400" />
                )}
              </button>
            );
          },
          width: '50px',
        },
        ...baseColumns,
      ];
    }

    return baseColumns;
  }, [isSelectionMode, selectedIds, allDraftsSelected, companies, handleToggleSelect, handleToggleSelectAll]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900">Journal Entries</h1>
              <button
                onClick={() => setShowHelpModal(true)}
                className="p-1.5 text-gray-400 hover:text-[#5A7A8F] hover:bg-gray-100 rounded-full transition-colors"
                title="How auto-generated journal entries work"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              View auto-generated journal entries from expense approvals and payments
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Total Entries" value={totalCount.toString()} />
          <KPICard title="Draft Entries" value={draftCount.toString()} />
          <KPICard title="Posted Entries" value={postedCount.toString()} />
          <KPICard
            title="Total Amount"
            value={totalAmount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('entries')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'entries'
                ? 'border-[#5A7A8F] text-[#5A7A8F]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Journal Entries
          </button>
          <button
            onClick={() => setActiveTab('deleted')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'deleted'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Deleted
            {deletedEntries.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                {deletedEntries.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'recurring'
                ? 'border-[#5A7A8F] text-[#5A7A8F]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Recurring
          </button>
        </div>

        {activeTab === 'recurring' ? (
          /* Recurring Tab Content */
          <div className="space-y-4">
            {/* Action bar */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recurring Journal Templates</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRunAllDue}
                  disabled={executingAllDue}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  {executingAllDue ? 'Running...' : 'Run All Due'}
                </button>
                <button
                  onClick={() => alert('New Template form coming soon')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  New Template
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow">
              {loadingRecurring ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading recurring templates...</span>
                </div>
              ) : recurringTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">No recurring journal templates</p>
                  <p className="text-xs text-gray-400 mt-1">Create a template to automate recurring journal entries</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Run</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Run</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recurringTemplates.map((template) => {
                        const isDue = template.is_active && template.next_run_date <= new Date().toISOString().split('T')[0];
                        return (
                          <tr key={template.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div>
                                <span className="font-medium">{template.description}</span>
                                {template.auto_post && (
                                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Auto-post</span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {template.template_lines.length} lines | Run count: {template.run_count}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 capitalize">{template.frequency}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={isDue ? 'text-orange-600 font-medium' : 'text-gray-900'}>
                                {new Date(template.next_run_date).toLocaleDateString('en-US', {
                                  year: 'numeric', month: 'short', day: 'numeric',
                                })}
                              </span>
                              {isDue && <span className="ml-1 text-xs text-orange-500">(due)</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {template.last_run_date
                                ? new Date(template.last_run_date).toLocaleDateString('en-US', {
                                    year: 'numeric', month: 'short', day: 'numeric',
                                  })
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  template.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {template.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleRunTemplate(template)}
                                  disabled={!template.is_active || executingTemplateId === template.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Run Now"
                                >
                                  <Play className="h-3 w-3" />
                                  {executingTemplateId === template.id ? 'Running...' : 'Run Now'}
                                </button>
                                <button
                                  onClick={() => alert('Edit template form coming soon')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#5A7A8F] bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeactivateTemplate(template)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
                                    template.is_active
                                      ? 'text-orange-700 bg-orange-50 hover:bg-orange-100'
                                      : 'text-green-700 bg-green-50 hover:bg-green-100'
                                  }`}
                                  title={template.is_active ? 'Deactivate' : 'Activate'}
                                >
                                  <Pause className="h-3 w-3" />
                                  {template.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'deleted' ? (
          /* Deleted Tab Content */
          <div className="bg-white rounded-lg shadow">
            {loadingDeleted ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading deleted entries...</span>
              </div>
            ) : deletedEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Trash2 className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No deleted journal entries</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deletedEntries.map((entry) => {
                      const company = companies.find((c) => c.id === entry.company_id);
                      return (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {entry.reference_number || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(entry.entry_date).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {company?.name || 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                            {entry.description || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                            {(entry.total_debit || 0).toLocaleString('en-US', {
                              minimumFractionDigits: 2, maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleRestoreEntry(entry.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Restore
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
        /* Normal Entries Tab */
        <>
        {/* Filters & Actions */}
        <div className="space-y-4">
          {/* Top row: Search and Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by reference or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-3">
              {isSelectionMode ? (
                <>
                  <span className="text-sm text-gray-600">
                    {selectedIds.size} selected
                  </span>
                  <button
                    onClick={handleBulkPost}
                    disabled={selectedIds.size === 0 || isBulkPosting}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="h-4 w-4" />
                    {isBulkPosting ? 'Posting...' : `Post Selected (${selectedIds.size})`}
                  </button>
                  <button
                    onClick={handleExitSelectionMode}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowNewEntryModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    New Entry
                  </button>
                  <button
                    onClick={() => setIsSelectionMode(true)}
                    disabled={draftCount === 0}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={draftCount === 0 ? 'No draft entries to post' : 'Select entries to post'}
                  >
                    <CheckSquare className="h-4 w-4" />
                    Bulk Post
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <FileDown className="h-4 w-4" />
                    Export CSV
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Bottom row: Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm"
              >
                <option value="all">All Companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as 'all' | JournalEntryStatus)
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="posted">Posted</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm"
              />
            </div>

            {(filterStatus !== 'all' ||
              filterCompany !== 'all' ||
              searchTerm ||
              startDate ||
              endDate) && (
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterCompany('all');
                  setSearchTerm('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-sm text-[#5A7A8F] hover:text-[#2c3e50] font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading journal entries...</span>
            </div>
          ) : (
            <DataTable<JournalEntryWithLines>
              columns={columns}
              data={sortedEntries}
              onRowClick={(entry) => handleViewEntry(entry)}
              emptyMessage="No journal entries found. Journal entries are automatically created when expenses are approved."
            />
          )}
        </div>

        {/* View/Edit Modal */}
        {viewingEntry && (
          <JournalEntryModal
            entry={viewingEntry}
            companies={companies}
            accounts={accounts}
            onClose={() => setViewingEntry(null)}
            onSave={handleSaveEntry}
            onPost={handlePostEntry}
            onDelete={handleDeleteEntry}
          />
        )}

        {/* New Journal Entry Modal */}
        {showNewEntryModal && (
          <NewJournalEntryModal
            companies={companies}
            accounts={accounts}
            onClose={() => setShowNewEntryModal(false)}
            onCreate={handleCreateEntry}
          />
        )}
        </>
        )}

        {/* Help Modal */}
        {showHelpModal && (
          <AutoJournalHelpModal onClose={() => setShowHelpModal(false)} />
        )}
      </div>
    </AppShell>
  );
}
