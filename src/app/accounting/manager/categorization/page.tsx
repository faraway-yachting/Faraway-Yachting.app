'use client';

import { useState, useMemo, useEffect } from 'react';
import { FileText, Filter, Search, CheckCircle, AlertCircle, RefreshCw, Calendar, Clock, DollarSign, ExternalLink } from 'lucide-react';
import { DocumentDetailModal } from '@/components/categorization/DocumentDetailModal';
import { AppShell } from '@/components/accounting/AppShell';
import { useAuth } from '@/components/auth';
import AccountCodeSelector from '@/components/accounting/AccountCodeSelector';
import { expensesApi, type ExpenseWithDetails } from '@/lib/supabase/api';
import { receiptsApi, type ReceiptWithDetails } from '@/lib/supabase/api/receipts';
import { revenueRecognitionApi } from '@/lib/supabase/api/revenueRecognition';
import { getAccountByCode } from '@/components/accounting/AccountCodeSelector';
import {
  type RevenueRecognitionStatus,
  recognitionStatusLabels,
  recognitionStatusColors,
} from '@/data/revenueRecognition/types';
import type { Currency } from '@/data/company/types';

// Types for categorization items
interface CategorizationItem {
  id: string;
  lineItemId: string;
  documentType: 'receipt' | 'expense';
  documentNumber: string;
  documentId: string;
  date: string;
  counterparty: string;
  description: string;
  amount: number;
  currency: string;
  currentAccountCode: string;
  accountName?: string;
  charterDateFrom?: string;
  charterDateTo?: string;
  // Revenue recognition fields (for receipts)
  recognitionStatus?: RevenueRecognitionStatus;
  projectId?: string;
  thbAmount?: number;
}

type FilterType = 'all' | 'income' | 'expenses' | 'uncategorized';

// Helper to determine recognition status from charter date
function determineRecognitionStatus(charterDateTo?: string | null): RevenueRecognitionStatus {
  if (!charterDateTo) {
    return 'needs_review';
  }

  const charterEnd = new Date(charterDateTo);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  charterEnd.setHours(0, 0, 0, 0);

  return charterEnd <= today ? 'recognized' : 'pending';
}

export default function CategorizationPage() {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<FilterType>('uncategorized');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [updatedCodes, setUpdatedCodes] = useState<Record<string, string>>({});
  const [updatedCharterDates, setUpdatedCharterDates] = useState<Record<string, { from?: string; to?: string }>>({});

  // Default date range: 1 year from today
  const today = new Date();
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  const [periodFrom, setPeriodFrom] = useState<string>(oneYearAgo.toISOString().split('T')[0]);
  const [periodTo, setPeriodTo] = useState<string>(today.toISOString().split('T')[0]);

  // Data from Supabase
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [receipts, setReceipts] = useState<ReceiptWithDetails[]>([]);
  const [recognitionRecords, setRecognitionRecords] = useState<Map<string, RevenueRecognitionStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data from Supabase
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [expensesData, receiptsData] = await Promise.all([
        expensesApi.getAllWithLineItemsByDateRange(periodFrom, periodTo),
        receiptsApi.getWithLineItemsByDateRange(periodFrom, periodTo),
      ]);
      setExpenses(expensesData);
      setReceipts(receiptsData);

      // Fetch recognition records for all receipts
      const recognitionMap = new Map<string, RevenueRecognitionStatus>();
      for (const receipt of receiptsData) {
        try {
          const records = await revenueRecognitionApi.getByReceiptId(receipt.id);
          for (const record of records) {
            if (record.receiptLineItemId) {
              recognitionMap.set(record.receiptLineItemId, record.recognitionStatus);
            }
          }
        } catch {
          // Ignore errors for individual receipts
        }
      }
      setRecognitionRecords(recognitionMap);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [periodFrom, periodTo]);

  // Get all receipts and expenses and flatten line items
  const allItems = useMemo((): CategorizationItem[] => {
    const items: CategorizationItem[] = [];

    // Get income (receipts) with recognition status
    for (const receipt of receipts) {
      // Type assertion for receipt fields that might not be in base type
      const receiptData = receipt as ReceiptWithDetails & {
        charter_date_from?: string | null;
        charter_date_to?: string | null;
        client_name?: string;
      };

      const charterDateTo = receiptData.charter_date_to;

      if (receiptData.line_items) {
        for (const lineItem of receiptData.line_items) {
          const lineItemData = lineItem as typeof lineItem & {
            account_code?: string | null;
            project_id?: string | null;
          };
          const account = lineItemData.account_code ? getAccountByCode(lineItemData.account_code) : null;

          // Check if this line item has been posted (recognition record exists)
          const storedStatus = recognitionRecords.get(lineItem.id);
          // Use stored status if available, otherwise determine from charter date
          const recognitionStatus = storedStatus || determineRecognitionStatus(charterDateTo);

          items.push({
            id: `rcpt-${receipt.id}-${lineItem.id}`,
            lineItemId: lineItem.id,
            documentType: 'receipt',
            documentNumber: receipt.receipt_number,
            documentId: receipt.id,
            date: receipt.receipt_date,
            counterparty: receiptData.client_name || '',
            description: lineItem.description || '',
            amount: lineItem.amount || 0,
            currency: receipt.currency,
            currentAccountCode: lineItemData.account_code || '',
            accountName: account?.name,
            charterDateFrom: receiptData.charter_date_from || undefined,
            charterDateTo: charterDateTo || undefined,
            recognitionStatus,
            projectId: lineItemData.project_id || undefined,
            thbAmount: lineItem.amount || 0, // Simplified - ideally multiply by fx_rate
          });
        }
      }
    }

    // Get expenses from Supabase
    for (const expense of expenses) {
      if (expense.line_items) {
        for (const lineItem of expense.line_items) {
          const account = lineItem.account_code ? getAccountByCode(lineItem.account_code) : null;
          items.push({
            id: `exp-${expense.id}-${lineItem.id}`,
            lineItemId: lineItem.id,
            documentType: 'expense',
            documentNumber: expense.expense_number,
            documentId: expense.id,
            date: expense.expense_date,
            counterparty: expense.vendor_name || '',
            description: lineItem.description || '',
            amount: lineItem.amount || 0,
            currency: expense.currency,
            currentAccountCode: lineItem.account_code || '',
            accountName: account?.name,
          });
        }
      }
    }

    // Sort by date descending
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, receipts, recognitionRecords]);

  // Filter items based on criteria
  const filteredItems = useMemo(() => {
    let filtered = allItems;

    // Filter by type
    if (filterType === 'income') {
      filtered = filtered.filter(item => item.documentType === 'receipt');
    } else if (filterType === 'expenses') {
      filtered = filtered.filter(item => item.documentType === 'expense');
    } else if (filterType === 'uncategorized') {
      filtered = filtered.filter(item => !item.currentAccountCode && !updatedCodes[item.id]);
    }

    // Filter by period (document date)
    if (periodFrom) {
      filtered = filtered.filter(item => item.date >= periodFrom);
    }
    if (periodTo) {
      filtered = filtered.filter(item => item.date <= periodTo);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.documentNumber.toLowerCase().includes(query) ||
          item.counterparty.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allItems, filterType, searchQuery, updatedCodes, periodFrom, periodTo]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = allItems.length;
    const uncategorized = allItems.filter(item => !item.currentAccountCode && !updatedCodes[item.id]).length;
    const categorized = total - uncategorized;
    const codeChanges = Object.keys(updatedCodes).length;
    const charterChanges = Object.keys(updatedCharterDates).length;
    const pendingChanges = codeChanges + charterChanges;

    // Revenue recognition stats
    const incomeItems = allItems.filter(item => item.documentType === 'receipt');
    const pendingRecognition = incomeItems.filter(item => item.recognitionStatus === 'pending').length;
    const needsReview = incomeItems.filter(item => item.recognitionStatus === 'needs_review').length;

    return { total, uncategorized, categorized, pendingChanges, pendingRecognition, needsReview };
  }, [allItems, updatedCodes, updatedCharterDates]);

  // Handle account code change
  const handleAccountCodeChange = (itemId: string, newCode: string) => {
    setUpdatedCodes(prev => ({
      ...prev,
      [itemId]: newCode,
    }));
  };

  // Handle charter date change
  const handleCharterDateChange = (documentId: string, field: 'from' | 'to', value: string) => {
    setUpdatedCharterDates(prev => ({
      ...prev,
      [documentId]: {
        ...prev[documentId],
        [field]: value,
      },
    }));
  };

  // Get effective charter dates (updated or current)
  const getEffectiveCharterDate = (item: CategorizationItem, field: 'from' | 'to') => {
    const updated = updatedCharterDates[item.documentId];
    if (updated && updated[field] !== undefined) {
      return updated[field] || '';
    }
    return field === 'from' ? (item.charterDateFrom || '') : (item.charterDateTo || '');
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  // Handle bulk assignment
  const handleBulkAssign = (code: string) => {
    const newUpdates = { ...updatedCodes };
    selectedItems.forEach(id => {
      newUpdates[id] = code;
    });
    setUpdatedCodes(newUpdates);
    setSelectedItems(new Set());
  };

  // Track saving/posting state
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // Document detail modal state
  const [selectedDocument, setSelectedDocument] = useState<{
    type: 'receipt' | 'expense';
    id: string;
    number: string;
  } | null>(null);

  // Save changes
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Save charter date changes to receipts
      let charterUpdates = 0;
      for (const [receiptId, dates] of Object.entries(updatedCharterDates)) {
        await receiptsApi.update(receiptId, {
          charter_date_from: dates.from || null,
          charter_date_to: dates.to || null,
        });
        charterUpdates++;
      }

      // Save expense line item account code changes to Supabase
      const expenseUpdates: { lineItemId: string; accountCode: string | null }[] = [];
      for (const [itemId, accountCode] of Object.entries(updatedCodes)) {
        if (itemId.startsWith('exp-')) {
          const parts = itemId.split('-');
          const lineItemId = parts.slice(2).join('-');
          expenseUpdates.push({
            lineItemId,
            accountCode: accountCode || null,
          });
        }
        // TODO: Handle receipt line item account code updates if needed
      }

      // Bulk update expense line items
      if (expenseUpdates.length > 0) {
        await expensesApi.bulkUpdateLineItemAccountCodes(expenseUpdates);
      }

      const messages = [];
      if (expenseUpdates.length > 0) {
        messages.push(`${expenseUpdates.length} expense account code(s) updated`);
      }
      if (charterUpdates > 0) {
        messages.push(`${charterUpdates} charter date(s) updated`);
      }

      if (messages.length > 0) {
        alert(messages.join('\n'));
      }

      // Clear pending changes
      setUpdatedCodes({});
      setUpdatedCharterDates({});

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Post to P&L - recognize revenue
  const handlePostToPL = async (item: CategorizationItem) => {
    if (item.documentType !== 'receipt') return;
    if (item.recognitionStatus === 'recognized') return;

    const confirmMessage = item.recognitionStatus === 'needs_review'
      ? `This receipt has no charter date. Recognize revenue of ${item.currency} ${item.amount.toLocaleString()} immediately?`
      : `Recognize revenue of ${item.currency} ${item.amount.toLocaleString()} for charter completed on ${item.charterDateTo}?`;

    if (!confirm(confirmMessage)) return;

    setIsPosting(true);
    try {
      // Find existing revenue recognition record for this receipt line item
      const existingRecords = await revenueRecognitionApi.getByReceiptId(item.documentId);
      const existingRecord = existingRecords.find(r => r.receiptLineItemId === item.lineItemId);

      if (existingRecord) {
        // Recognize existing record
        await revenueRecognitionApi.recognize(
          existingRecord.id,
          user?.id || 'system',
          item.charterDateTo ? 'manual' : 'immediate'
        );
      } else {
        // Create new record and mark as recognized immediately
        // First, get the receipt to find company_id and other details
        const receipt = receipts.find(r => r.id === item.documentId);
        if (!receipt) {
          throw new Error('Receipt not found');
        }

        // Validate required fields
        if (!item.projectId) {
          throw new Error('Project ID is required. Please ensure this receipt has a project assigned.');
        }

        // Create revenue recognition record with recognized status
        await revenueRecognitionApi.create({
          companyId: receipt.company_id,
          projectId: item.projectId,
          receiptId: item.documentId,
          receiptLineItemId: item.lineItemId,
          charterDateFrom: item.charterDateFrom,
          charterDateTo: item.charterDateTo,
          amount: item.amount,
          currency: item.currency as Currency,
          fxRate: receipt.fx_rate || 1,
          thbAmount: item.thbAmount || item.amount,
          revenueAccount: item.currentAccountCode || '4490',
          description: item.description,
          clientName: item.counterparty,
          // createdBy is optional - will be null
        });

        // If the status was not automatically recognized (i.e., no charter date),
        // we need to manually trigger recognition
        if (item.recognitionStatus === 'needs_review') {
          const newRecords = await revenueRecognitionApi.getByReceiptId(item.documentId);
          const newRecord = newRecords.find(r => r.receiptLineItemId === item.lineItemId);
          if (newRecord && newRecord.recognitionStatus !== 'recognized') {
            await revenueRecognitionApi.recognize(
              newRecord.id,
              user?.id || 'system',
              'immediate'
            );
          }
        }
      }

      alert('Revenue recognized successfully!');
      await fetchData();
    } catch (error: unknown) {
      console.error('Failed to post to P&L:', error);
      // Handle various error types including Supabase PostgrestError
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        const err = error as { message?: string; details?: string; hint?: string; code?: string };
        errorMessage = err.message || err.details || err.hint || err.code || JSON.stringify(error);
      }
      alert(`Failed to recognize revenue: ${errorMessage}`);
    } finally {
      setIsPosting(false);
    }
  };

  // Bulk Post to P&L
  const handleBulkPostToPL = async () => {
    const receiptItems = Array.from(selectedItems)
      .map(id => allItems.find(item => item.id === id))
      .filter(item => item && item.documentType === 'receipt' && item.recognitionStatus !== 'recognized') as CategorizationItem[];

    if (receiptItems.length === 0) {
      alert('No unrecognized receipt items selected');
      return;
    }

    if (!confirm(`Recognize revenue for ${receiptItems.length} receipt item(s)?`)) return;

    setIsPosting(true);
    let recognized = 0;
    let errors = 0;

    for (const item of receiptItems) {
      try {
        // Find existing revenue recognition record
        const existingRecords = await revenueRecognitionApi.getByReceiptId(item.documentId);
        const existingRecord = existingRecords.find(r => r.receiptLineItemId === item.lineItemId);

        if (existingRecord) {
          // Recognize existing record
          await revenueRecognitionApi.recognize(
            existingRecord.id,
            user?.id || 'system',
            item.charterDateTo ? 'manual' : 'immediate'
          );
        } else {
          // Create new record
          const receipt = receipts.find(r => r.id === item.documentId);
          if (!receipt) {
            throw new Error('Receipt not found');
          }

          if (!item.projectId) {
            throw new Error(`Project ID missing for ${item.documentNumber}`);
          }

          await revenueRecognitionApi.create({
            companyId: receipt.company_id,
            projectId: item.projectId,
            receiptId: item.documentId,
            receiptLineItemId: item.lineItemId,
            charterDateFrom: item.charterDateFrom,
            charterDateTo: item.charterDateTo,
            amount: item.amount,
            currency: item.currency as Currency,
            fxRate: receipt.fx_rate || 1,
            thbAmount: item.thbAmount || item.amount,
            revenueAccount: item.currentAccountCode || '4490',
            description: item.description,
            clientName: item.counterparty,
            createdBy: user?.id,
          });

          // If needs manual recognition
          if (item.recognitionStatus === 'needs_review') {
            const newRecords = await revenueRecognitionApi.getByReceiptId(item.documentId);
            const newRecord = newRecords.find(r => r.receiptLineItemId === item.lineItemId);
            if (newRecord && newRecord.recognitionStatus !== 'recognized') {
              await revenueRecognitionApi.recognize(
                newRecord.id,
                user?.id || 'system',
                'immediate'
              );
            }
          }
        }
        recognized++;
      } catch (err) {
        console.error('Failed to recognize item:', item.id, err);
        errors++;
      }
    }

    setIsPosting(false);
    setSelectedItems(new Set());

    if (recognized > 0) {
      alert(`${recognized} item(s) recognized successfully${errors > 0 ? `, ${errors} failed` : ''}`);
      await fetchData();
    } else {
      alert('Failed to recognize revenue. Please try again.');
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get effective account code (updated or current)
  const getEffectiveCode = (item: CategorizationItem) => {
    return updatedCodes[item.id] ?? item.currentAccountCode;
  };

  // Recognition status badge
  const RecognitionBadge = ({ status }: { status?: RevenueRecognitionStatus }) => {
    if (!status) return null;

    const colors = recognitionStatusColors[status];
    const label = recognitionStatusLabels[status];

    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${colors.bg} ${colors.text}`}>
        {status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
        {status === 'recognized' && <CheckCircle className="h-3 w-3 mr-1" />}
        {status === 'needs_review' && <AlertCircle className="h-3 w-3 mr-1" />}
        {label}
      </span>
    );
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GL Categorization</h1>
            <p className="text-sm text-gray-600 mt-1">
              Assign chart of accounts codes to income and expense line items
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats.pendingChanges > 0 && (
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {isSaving ? 'Saving...' : `Save Changes (${stats.pendingChanges})`}
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Line Items</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Categorized</p>
                <p className="text-xl font-bold text-green-600">{stats.categorized}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Uncategorized</p>
                <p className="text-xl font-bold text-yellow-600">{stats.uncategorized}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Recognition</p>
                <p className="text-xl font-bold text-orange-600">{stats.pendingRecognition}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Changes</p>
                <p className="text-xl font-bold text-blue-600">{stats.pendingChanges}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {(['uncategorized', 'all', 'income', 'expenses'] as FilterType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      filterType === type
                        ? 'bg-[#5A7A8F] text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {type === 'uncategorized' ? 'Uncategorized' :
                     type === 'all' ? 'All' :
                     type === 'income' ? 'Income' : 'Expenses'}
                  </button>
                ))}
              </div>
            </div>

            {/* Period Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                placeholder="From"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                placeholder="To"
              />
              {(periodFrom || periodTo) && (
                <button
                  onClick={() => {
                    setPeriodFrom('');
                    setPeriodTo('');
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by document #, vendor, or description..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
              />
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedItems.size > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Assign to:</span>
                <div className="w-64">
                  <AccountCodeSelector
                    value=""
                    onChange={handleBulkAssign}
                    placeholder="Select account for bulk assign..."
                    size="sm"
                  />
                </div>
              </div>
              {/* Bulk Post to P&L button */}
              <button
                onClick={handleBulkPostToPL}
                disabled={isPosting}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <DollarSign className="h-4 w-4" />
                {isPosting ? 'Posting...' : 'Post to P&L'}
              </button>
              <button
                onClick={() => setSelectedItems(new Set())}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Charter Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor/Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                    Account
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500 mt-2">Loading...</p>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-sm text-gray-500">
                      {filterType === 'uncategorized'
                        ? 'All line items have been categorized!'
                        : 'No items found matching your criteria'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const effectiveCode = getEffectiveCode(item);
                    const hasChange = updatedCodes[item.id] !== undefined;
                    const hasCharterChange = updatedCharterDates[item.documentId] !== undefined;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50 ${hasChange || hasCharterChange ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedItems);
                              if (e.target.checked) {
                                newSelected.add(item.id);
                              } else {
                                newSelected.delete(item.id);
                              }
                              setSelectedItems(newSelected);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                              item.documentType === 'receipt'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {item.documentType === 'receipt' ? 'Income' : 'Expense'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedDocument({
                              type: item.documentType,
                              id: item.documentId,
                              number: item.documentNumber,
                            })}
                            className="text-sm font-medium text-[#5A7A8F] hover:text-[#4a6a7f] hover:underline flex items-center gap-1"
                          >
                            {item.documentNumber}
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(item.date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.documentType === 'receipt' ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={getEffectiveCharterDate(item, 'from')}
                                onChange={(e) => handleCharterDateChange(item.documentId, 'from', e.target.value)}
                                className={`w-28 px-1.5 py-1 text-xs border rounded focus:ring-1 focus:ring-[#5A7A8F] focus:border-[#5A7A8F] ${
                                  updatedCharterDates[item.documentId]?.from !== undefined ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                                }`}
                              />
                              <span className="text-gray-400">-</span>
                              <input
                                type="date"
                                value={getEffectiveCharterDate(item, 'to')}
                                onChange={(e) => handleCharterDateChange(item.documentId, 'to', e.target.value)}
                                className={`w-28 px-1.5 py-1 text-xs border rounded focus:ring-1 focus:ring-[#5A7A8F] focus:border-[#5A7A8F] ${
                                  updatedCharterDates[item.documentId]?.to !== undefined ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                                }`}
                              />
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.counterparty}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                          {item.description}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          {item.currency} {item.amount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <AccountCodeSelector
                            value={effectiveCode}
                            onChange={(code) => handleAccountCodeChange(item.id, code)}
                            filterByType={item.documentType === 'receipt' ? 'Revenue' : 'Expense'}
                            placeholder="Select account..."
                            size="sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          {item.documentType === 'receipt' ? (
                            <div className="flex items-center gap-2">
                              <RecognitionBadge status={item.recognitionStatus} />
                              {item.recognitionStatus === 'recognized' || item.recognitionStatus === 'manual_recognized' ? (
                                <span className="text-xs text-green-600 font-medium">
                                  Posted
                                </span>
                              ) : (
                                <button
                                  onClick={() => handlePostToPL(item)}
                                  disabled={isPosting}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                                >
                                  Post
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {filteredItems.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
              Showing {filteredItems.length} of {allItems.length} line items
            </div>
          )}
        </div>
      </div>

      {/* Document Detail Modal */}
      {selectedDocument && (
        <DocumentDetailModal
          documentType={selectedDocument.type}
          documentId={selectedDocument.id}
          documentNumber={selectedDocument.number}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </AppShell>
  );
}
