'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, ExternalLink, RefreshCw } from 'lucide-react';
import { journalEntriesApi } from '@/lib/supabase/api/journalEntries';
import type { Database } from '@/lib/supabase/database.types';

type JournalEntry = Database['public']['Tables']['journal_entries']['Row'];

interface RelatedJournalEntriesProps {
  documentType: 'expense' | 'expense_payment' | 'receipt' | 'inventory_purchase';
  documentId: string;
}

/**
 * Displays journal entries linked to a source document (expense, payment, or receipt)
 */
export function RelatedJournalEntries({ documentType, documentId }: RelatedJournalEntriesProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch entries for this document
        const data = await journalEntriesApi.getBySourceDocument(documentType, documentId);
        setEntries(data);

        // If this is an expense, also fetch payment-related entries
        if (documentType === 'expense') {
          const paymentEntries = await journalEntriesApi.getBySourceDocument('expense_payment', documentId);
          // Note: This won't work as is because payment entries use payment ID, not expense ID
          // We'd need to fetch expense payments first, then get their journal entries
          // For now, we'll just show the expense approval entry
        }
      } catch (err) {
        console.error('Failed to fetch related journal entries:', err);
        setError('Failed to load journal entries');
      } finally {
        setIsLoading(false);
      }
    };

    if (documentId) {
      fetchEntries();
    }
  }, [documentType, documentId]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get entry type label based on source document type
  const getEntryTypeLabel = (entry: JournalEntry) => {
    switch (entry.source_document_type) {
      case 'expense':
        return 'Expense Recognition';
      case 'expense_payment':
        return 'Payment';
      case 'receipt':
        return 'Revenue Recognition';
      default:
        return 'Journal Entry';
    }
  };

  // Format currency amount
  const formatAmount = (amount: number | null) => {
    if (amount === null) return '-';
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Don't render if no entries and not loading
  if (!isLoading && entries.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-5 w-5 text-[#5A7A8F]" />
        <h3 className="text-lg font-semibold text-gray-900">Related Journal Entries</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />
          <span className="ml-2 text-sm text-gray-500">Loading journal entries...</span>
        </div>
      ) : error ? (
        <div className="text-sm text-red-600 py-2">{error}</div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/accounting/manager/journal-entries/${entry.id}`}
                    className="text-sm font-medium text-[#5A7A8F] hover:underline flex items-center gap-1"
                  >
                    {entry.reference_number}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  {entry.is_auto_generated && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      Auto
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {getEntryTypeLabel(entry)} &bull; {formatDate(entry.entry_date)}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatAmount(entry.total_debit)}
                  </p>
                  <p className="text-xs text-gray-500">Debit</p>
                </div>

                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    entry.status === 'posted'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {entry.status === 'posted' ? 'Posted' : 'Draft'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && entries.some(e => e.status === 'draft') && (
        <p className="text-xs text-gray-500 mt-4 italic">
          Draft entries require review and posting by an accountant.
        </p>
      )}
    </div>
  );
}

export default RelatedJournalEntries;
