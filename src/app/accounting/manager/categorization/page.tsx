'use client';

import { useState, useMemo, useEffect } from 'react';
import { FileText, Filter, Search, CheckCircle, AlertCircle, RefreshCw, Calendar } from 'lucide-react';
import { AppShell } from '@/components/accounting/AppShell';
import AccountCodeSelector from '@/components/accounting/AccountCodeSelector';
import { getAllInvoices, updateInvoice } from '@/data/income/invoices';
import { expensesApi, type ExpenseWithDetails } from '@/lib/supabase/api';
import { getAccountByCode } from '@/components/accounting/AccountCodeSelector';

// Types for categorization items
interface CategorizationItem {
  id: string;
  lineItemId: string;
  documentType: 'invoice' | 'expense';
  documentNumber: string;
  documentId: string;
  date: string;
  counterparty: string;
  description: string;
  amount: number;
  currency: string;
  currentAccountCode: string;
  accountName?: string;
  charterPeriodFrom?: string; // For income items (P&L reports)
  charterPeriodTo?: string;
}

type FilterType = 'all' | 'income' | 'expenses' | 'uncategorized';

export default function CategorizationPage() {
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

  // Expenses from Supabase
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch expenses from Supabase
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setIsLoading(true);
        const data = await expensesApi.getAllWithLineItemsByDateRange(periodFrom, periodTo);
        setExpenses(data);
      } catch (error) {
        console.error('Failed to fetch expenses:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExpenses();
  }, [periodFrom, periodTo]);

  // Get all invoices and expenses and flatten line items
  const allItems = useMemo((): CategorizationItem[] => {
    const items: CategorizationItem[] = [];

    // Get income (invoices)
    const invoices = getAllInvoices();
    for (const invoice of invoices) {
      for (const lineItem of invoice.lineItems) {
        const account = lineItem.accountCode ? getAccountByCode(lineItem.accountCode) : null;
        items.push({
          id: `inv-${invoice.id}-${lineItem.id}`,
          lineItemId: lineItem.id,
          documentType: 'invoice',
          documentNumber: invoice.invoiceNumber,
          documentId: invoice.id,
          date: invoice.invoiceDate,
          counterparty: invoice.clientName,
          description: lineItem.description,
          amount: lineItem.amount,
          currency: invoice.currency,
          currentAccountCode: lineItem.accountCode || '',
          accountName: account?.name,
          charterPeriodFrom: invoice.charterPeriodFrom,
          charterPeriodTo: invoice.charterPeriodTo,
        });
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
  }, [expenses]);

  // Filter items based on criteria
  const filteredItems = useMemo(() => {
    let filtered = allItems;

    // Filter by type
    if (filterType === 'income') {
      filtered = filtered.filter(item => item.documentType === 'invoice');
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
    return { total, uncategorized, categorized, pendingChanges };
  }, [allItems, updatedCodes, updatedCharterDates]);

  // Handle account code change
  const handleAccountCodeChange = (itemId: string, newCode: string) => {
    setUpdatedCodes(prev => ({
      ...prev,
      [itemId]: newCode,
    }));
  };

  // Handle charter date change (documentId is the invoice ID)
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
    return field === 'from' ? (item.charterPeriodFrom || '') : (item.charterPeriodTo || '');
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

  // Track saving state
  const [isSaving, setIsSaving] = useState(false);

  // Save changes
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Save charter date changes to invoices
      let charterUpdates = 0;
      for (const [invoiceId, dates] of Object.entries(updatedCharterDates)) {
        updateInvoice(invoiceId, {
          charterPeriodFrom: dates.from,
          charterPeriodTo: dates.to,
        });
        charterUpdates++;
      }

      // Save expense line item account code changes to Supabase
      const expenseUpdates: { lineItemId: string; accountCode: string | null }[] = [];
      for (const [itemId, accountCode] of Object.entries(updatedCodes)) {
        // itemId format: "exp-{expenseId}-{lineItemId}" for expenses
        if (itemId.startsWith('exp-')) {
          const parts = itemId.split('-');
          // Extract lineItemId (last part after the expense id which is a UUID)
          const lineItemId = parts.slice(2).join('-'); // Handle UUIDs that might have dashes
          expenseUpdates.push({
            lineItemId,
            accountCode: accountCode || null,
          });
        }
        // TODO: Handle invoice line item updates if needed
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

      // Refresh expenses to show updated data
      const data = await expensesApi.getAllWithLineItemsByDateRange(periodFrom, periodTo);
      setExpenses(data);
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
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

  return (
    <AppShell currentRole="manager">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GL Categorization</h1>
            <p className="text-sm text-gray-600 mt-1">
              Assign chart of accounts codes to income and expense line items
            </p>
          </div>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-500">
                      {filterType === 'uncategorized'
                        ? 'All line items have been categorized!'
                        : 'No items found matching your criteria'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const effectiveCode = getEffectiveCode(item);
                    const hasChange = updatedCodes[item.id] !== undefined;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50 ${hasChange ? 'bg-blue-50' : ''}`}
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
                              item.documentType === 'invoice'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {item.documentType === 'invoice' ? 'Income' : 'Expense'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.documentNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(item.date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.documentType === 'invoice' ? (
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
                            filterByType={item.documentType === 'invoice' ? 'Revenue' : 'Expense'}
                            placeholder="Select account..."
                            size="sm"
                          />
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
    </AppShell>
  );
}
