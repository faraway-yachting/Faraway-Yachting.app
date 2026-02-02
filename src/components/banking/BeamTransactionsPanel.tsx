'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import {
  Loader2,
  Upload,
  Search,
  ChevronDown,
  ChevronRight,
  Link2,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  QrCode,
} from 'lucide-react';
import { beamMerchantAccountsApi } from '@/lib/supabase/api/beamMerchantAccounts';
import { beamTransactionsApi, DbBeamTransaction } from '@/lib/supabase/api/beamTransactions';
import { parseBeamCsv, csvRowToDbInsert } from '@/lib/beam/csvParser';
import { autoMatchTransactions } from '@/lib/beam/autoMatcher';
import { bookingsApi } from '@/lib/supabase/api/bookings';
import type { Booking } from '@/data/booking/types';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface BeamTransactionsPanelProps {
  dateFrom: string;
  dateTo: string;
}

type StatusFilter = 'all' | 'unmatched' | 'matched' | 'reconciled';
type ViewMode = 'transactions' | 'settlements';

interface MatchSuggestion {
  bookingId: string;
  confidence: number;
  matchReason: string;
}

interface SettlementRow {
  settlementDate: string;
  totalGross: number;
  totalFee: number;
  totalVat: number;
  totalNet: number;
  count: number;
  invoiceNo: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return '฿' + amount.toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function truncate(str: string | null, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

function getMethodDisplay(method: string | null, brand: string | null): string {
  if (!method) return '-';
  const lower = method.toLowerCase();
  if (lower.includes('qr') || lower.includes('promptpay')) {
    return 'QR PromptPay';
  }
  const brandStr = brand ? ` (${brand.toUpperCase()})` : '';
  return `${method}${brandStr}`;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function BeamTransactionsPanel({ dateFrom, dateTo }: BeamTransactionsPanelProps) {
  // ── State: Data ─────────────────────────────────────────────────────────────
  const [merchantAccounts, setMerchantAccounts] = useState<
    Awaited<ReturnType<typeof beamMerchantAccountsApi.getActive>>
  >([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('');
  const [transactions, setTransactions] = useState<DbBeamTransaction[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);

  // ── State: UI ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('transactions');
  const [settlementExpanded, setSettlementExpanded] = useState(false);

  // ── State: Import modal ─────────────────────────────────────────────────────
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    totalRows: number;
    newRows: number;
    existingRows: number;
    rows: ReturnType<typeof csvRowToDbInsert>[];
    rawRows: ReturnType<typeof parseBeamCsv>;
  } | null>(null);

  // ── State: Match panel ──────────────────────────────────────────────────────
  const [matchingTxnId, setMatchingTxnId] = useState<string | null>(null);
  const [matchSuggestions, setMatchSuggestions] = useState<Map<string, MatchSuggestion>>(new Map());
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [matchingInProgress, setMatchingInProgress] = useState(false);

  // ── State: Toast ────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Toast helper ────────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Load merchant accounts on mount ─────────────────────────────────────────
  useEffect(() => {
    async function loadMerchants() {
      try {
        const accounts = await beamMerchantAccountsApi.getActive();
        setMerchantAccounts(accounts);
        if (accounts.length > 0 && !selectedMerchantId) {
          setSelectedMerchantId(accounts[0].id);
        }
      } catch (err) {
        console.error('Failed to load merchant accounts:', err);
        showToast('Failed to load merchant accounts', 'error');
      }
    }
    loadMerchants();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load transactions when filters change ───────────────────────────────────
  useEffect(() => {
    if (!selectedMerchantId) return;
    loadTransactions();
  }, [selectedMerchantId, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load bookings for matching ──────────────────────────────────────────────
  useEffect(() => {
    async function loadBookings() {
      try {
        const result = await bookingsApi.getAll();
        setBookings(result);
      } catch (err) {
        console.error('Failed to load bookings:', err);
      }
    }
    loadBookings();
  }, []);

  const loadTransactions = useCallback(async () => {
    if (!selectedMerchantId) return;
    setLoading(true);
    try {
      const [txns, settlementData] = await Promise.all([
        beamTransactionsApi.getAll({
          merchantAccountId: selectedMerchantId,
          dateFrom,
          dateTo,
        }),
        beamTransactionsApi.getSettlementSummary(selectedMerchantId, dateFrom, dateTo),
      ]);
      setTransactions(txns);
      setSettlements(settlementData);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      showToast('Failed to load transactions', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedMerchantId, dateFrom, dateTo, showToast]);

  // ── Filtered transactions ───────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    if (statusFilter === 'all') return transactions;
    return transactions.filter((t) => t.match_status === statusFilter);
  }, [transactions, statusFilter]);

  // ── Status counts ───────────────────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts = { all: transactions.length, unmatched: 0, matched: 0, reconciled: 0 };
    for (const t of transactions) {
      if (t.match_status === 'unmatched') counts.unmatched++;
      else if (t.match_status === 'matched') counts.matched++;
      else if (t.match_status === 'reconciled') counts.reconciled++;
    }
    return counts;
  }, [transactions]);

  // ── Import flow ─────────────────────────────────────────────────────────────
  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedMerchantId) return;

      try {
        const text = await file.text();
        const csvRows = parseBeamCsv(text);
        if (csvRows.length === 0) {
          showToast('No transactions found in CSV file', 'error');
          return;
        }

        const dbRows = csvRows.map((row) => csvRowToDbInsert(row, selectedMerchantId));
        const chargeIds = dbRows.map((r) => r.charge_id);
        const existingIds = await beamTransactionsApi.getExistingChargeIds(chargeIds);
        const existingSet = new Set(existingIds);
        const newCount = dbRows.filter((r) => !existingSet.has(r.charge_id)).length;

        setImportPreview({
          totalRows: csvRows.length,
          newRows: newCount,
          existingRows: csvRows.length - newCount,
          rows: dbRows,
          rawRows: csvRows,
        });
        setShowImportModal(true);
      } catch (err) {
        console.error('CSV parse error:', err);
        showToast('Failed to parse CSV file', 'error');
      }

      // Reset the file input so re-selecting the same file triggers change
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [selectedMerchantId, showToast]
  );

  const handleImportConfirm = useCallback(async () => {
    if (!importPreview || !selectedMerchantId) return;
    setImporting(true);

    try {
      const chargeIds = importPreview.rows.map((r) => r.charge_id);
      const existingIds = await beamTransactionsApi.getExistingChargeIds(chargeIds);
      const imported = await beamTransactionsApi.importFromCsv(importPreview.rows, existingIds);

      setShowImportModal(false);
      setImportPreview(null);

      // Run auto-matcher on newly imported unmatched transactions
      if (imported.length > 0 && bookings.length > 0) {
        const unmatchedForMatch = imported
          .filter((t) => t.match_status === 'unmatched')
          .map((t) => ({
            id: t.id,
            paymentLinkDescription: t.payment_link_description ?? undefined,
            grossAmount: t.gross_amount,
            transactionDate: t.transaction_date,
          }));

        const bookingsForMatch = bookings.map((b) => ({
          id: b.id,
          projectName: b.title ?? undefined,
          externalBoatName: b.externalBoatName ?? undefined,
          dateFrom: b.dateFrom,
          dateTo: b.dateTo,
          totalPrice: b.totalPrice ?? undefined,
        }));

        const matches = autoMatchTransactions(unmatchedForMatch, bookingsForMatch);

        if (matches.length > 0) {
          const newSuggestions = new Map(matchSuggestions);
          for (const m of matches) {
            newSuggestions.set(m.transactionId, {
              bookingId: m.bookingId,
              confidence: m.confidence,
              matchReason: m.matchReason,
            });
          }
          setMatchSuggestions(newSuggestions);
        }

        showToast(
          `Imported ${imported.length} transaction${imported.length !== 1 ? 's' : ''}. ${matches.length} auto-match suggestion${matches.length !== 1 ? 's' : ''} found.`
        );
      } else {
        showToast(`Imported ${imported.length} transaction${imported.length !== 1 ? 's' : ''}.`);
      }

      await loadTransactions();
    } catch (err) {
      console.error('Import failed:', err);
      showToast('Import failed. Please try again.', 'error');
    } finally {
      setImporting(false);
    }
  }, [importPreview, selectedMerchantId, bookings, matchSuggestions, showToast, loadTransactions]);

  // ── Match actions ───────────────────────────────────────────────────────────
  const handleAcceptMatch = useCallback(
    async (txnId: string, bookingId: string, confidence?: number) => {
      setMatchingInProgress(true);
      try {
        await beamTransactionsApi.matchToBooking(txnId, bookingId, confidence);
        setMatchingTxnId(null);
        setMatchSuggestions((prev) => {
          const next = new Map(prev);
          next.delete(txnId);
          return next;
        });
        showToast('Transaction matched to booking');
        await loadTransactions();
      } catch (err) {
        console.error('Match failed:', err);
        showToast('Failed to match transaction', 'error');
      } finally {
        setMatchingInProgress(false);
      }
    },
    [showToast, loadTransactions]
  );

  // ── Booking search for manual matching ──────────────────────────────────────
  const bookingSearchResults = useMemo(() => {
    if (!bookingSearchQuery.trim()) return [];
    const q = bookingSearchQuery.toLowerCase();
    return bookings
      .filter(
        (b) =>
          b.customerName?.toLowerCase().includes(q) ||
          b.title?.toLowerCase().includes(q) ||
          b.bookingNumber?.toLowerCase().includes(q) ||
          b.externalBoatName?.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [bookings, bookingSearchQuery]);

  // ── Render helpers ──────────────────────────────────────────────────────────
  const renderStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      unmatched: 'bg-gray-100 text-gray-700',
      matched: 'bg-blue-100 text-blue-700',
      reconciled: 'bg-green-100 text-green-700',
    };
    const labels: Record<string, string> = {
      unmatched: 'Unmatched',
      matched: 'Matched',
      reconciled: 'Reconciled',
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}
      >
        {labels[status] ?? status}
      </span>
    );
  };

  // ── Get booking for a matched transaction ───────────────────────────────────
  const getBookingForTxn = (txn: DbBeamTransaction): Booking | undefined => {
    if (!txn.booking_id) return undefined;
    return bookings.find((b) => b.id === txn.booking_id);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-full">
      {/* ── Toast notification ─────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {toast.message}
        </div>
      )}

      {/* ── Header area ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Merchant account selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Merchant:</label>
            <select
              value={selectedMerchantId}
              onChange={(e) => setSelectedMerchantId(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
            >
              {merchantAccounts.length === 0 && (
                <option value="">No accounts</option>
              )}
              {merchantAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.merchant_name}
                </option>
              ))}
            </select>
          </div>

          {/* Import CSV button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="ml-auto flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-[#5A7A8F] hover:bg-[#4a6a7f] rounded-md transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelected}
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 mt-3 border-t border-gray-100 pt-3">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'unmatched', label: 'Unmatched' },
              { key: 'matched', label: 'Matched' },
              { key: 'reconciled', label: 'Reconciled' },
            ] as { key: StatusFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                statusFilter === tab.key
                  ? 'bg-[#5A7A8F] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs ${
                  statusFilter === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {statusCounts[tab.key]}
              </span>
            </button>
          ))}

          {/* View mode toggle */}
          <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
            <button
              onClick={() => setViewMode('transactions')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'transactions'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setViewMode('settlements')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'settlements'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Settlements
            </button>
          </div>
        </div>
      </div>

      {/* ── Loading state ──────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-[#5A7A8F] animate-spin" />
        </div>
      )}

      {/* ── Transactions view ──────────────────────────────────────────────── */}
      {!loading && viewMode === 'transactions' && (
        <div className="bg-white border border-gray-200 rounded-lg flex-1 flex flex-col min-h-0">
          {filteredTransactions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-4">
              <CreditCard className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-sm font-medium text-gray-900">No transactions found</h3>
              <p className="text-xs text-gray-500 mt-1 text-center max-w-sm">
                {transactions.length === 0
                  ? 'Import a Beam CSV file to get started, or adjust your date range.'
                  : 'No transactions match the selected status filter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Cardholder
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Gross
                    </th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Fee+VAT
                    </th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Net
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Settlement
                    </th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.map((txn) => {
                    const suggestion = matchSuggestions.get(txn.id);
                    const isMatchOpen = matchingTxnId === txn.id;
                    const matchedBooking = getBookingForTxn(txn);
                    const feeVat = txn.fee_amount + txn.vat_amount;

                    return (
                      <Fragment key={txn.id}>
                        <tr
                          className={`hover:bg-gray-50 transition-colors ${
                            isMatchOpen ? 'bg-blue-50' : ''
                          }`}
                        >
                          {/* Date */}
                          <td className="px-3 py-2.5 text-gray-900 whitespace-nowrap">
                            {formatDate(txn.transaction_date)}
                          </td>

                          {/* Description */}
                          <td
                            className="px-3 py-2.5 text-gray-900 max-w-[200px]"
                            title={txn.payment_link_description ?? ''}
                          >
                            {truncate(txn.payment_link_description, 50)}
                          </td>

                          {/* Cardholder */}
                          <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                            {txn.card_holder_name ?? '-'}
                          </td>

                          {/* Method */}
                          <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              {txn.payment_method?.toLowerCase().includes('qr') ||
                              txn.payment_method?.toLowerCase().includes('promptpay') ? (
                                <QrCode className="h-3.5 w-3.5 text-gray-400" />
                              ) : (
                                <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                              )}
                              {getMethodDisplay(txn.payment_method, txn.card_brand)}
                            </span>
                          </td>

                          {/* Gross */}
                          <td className="px-3 py-2.5 text-right font-medium text-gray-900 whitespace-nowrap">
                            {formatCurrency(txn.gross_amount)}
                          </td>

                          {/* Fee+VAT */}
                          <td className="px-3 py-2.5 text-right font-medium text-red-600 whitespace-nowrap">
                            {formatCurrency(feeVat)}
                          </td>

                          {/* Net */}
                          <td className="px-3 py-2.5 text-right font-medium text-gray-900 whitespace-nowrap">
                            {formatCurrency(txn.net_amount)}
                          </td>

                          {/* Settlement */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {txn.settlement_date ? (
                              <span className="text-gray-700">{formatDate(txn.settlement_date)}</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                                Pending
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-3 py-2.5 text-center">
                            {renderStatusBadge(txn.match_status)}
                          </td>

                          {/* Action */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            {txn.match_status === 'unmatched' && (
                              <button
                                onClick={() =>
                                  setMatchingTxnId(isMatchOpen ? null : txn.id)
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#5A7A8F] bg-[#5A7A8F]/10 hover:bg-[#5A7A8F]/20 rounded transition-colors"
                              >
                                <Link2 className="h-3 w-3" />
                                Match
                                {suggestion && (
                                  <span className="ml-1 text-xs text-green-600">
                                    {Math.round(suggestion.confidence * 100)}%
                                  </span>
                                )}
                              </button>
                            )}
                            {txn.match_status === 'matched' && matchedBooking && (
                              <div className="flex items-center gap-1.5 justify-center">
                                <span className="text-xs text-blue-600 font-medium">
                                  {matchedBooking.bookingNumber}
                                </span>
                                <button
                                  onClick={() => {
                                    // Placeholder: create receipt action
                                    showToast('Create receipt flow not yet implemented');
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded transition-colors"
                                >
                                  <FileText className="h-3 w-3" />
                                  Create Receipt
                                </button>
                              </div>
                            )}
                            {txn.match_status === 'reconciled' && txn.receipt_id && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                                <FileText className="h-3 w-3" />
                                Receipt
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* ── Match panel (inline below row) ──────────────── */}
                        {isMatchOpen && (
                          <tr>
                            <td colSpan={10} className="p-0">
                              <div className="bg-blue-50 border-t border-b border-blue-200 p-4">
                                <div className="flex items-start gap-6">
                                  {/* Auto-suggestion */}
                                  {suggestion && (
                                    <div className="flex-1 bg-white rounded-lg border border-blue-200 p-3">
                                      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                        Suggested Match
                                      </h4>
                                      {(() => {
                                        const suggestedBooking = bookings.find(
                                          (b) => b.id === suggestion.bookingId
                                        );
                                        if (!suggestedBooking) return null;
                                        return (
                                          <div className="space-y-1.5">
                                            <p className="text-sm font-medium text-gray-900">
                                              {suggestedBooking.customerName}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                              {suggestedBooking.bookingNumber} &middot;{' '}
                                              {formatDate(suggestedBooking.dateFrom)} -{' '}
                                              {formatDate(suggestedBooking.dateTo)}
                                            </p>
                                            {suggestedBooking.totalPrice != null && (
                                              <p className="text-xs text-gray-600">
                                                Total: {formatCurrency(suggestedBooking.totalPrice)}
                                              </p>
                                            )}
                                            <p className="text-xs text-gray-500 italic">
                                              {suggestion.matchReason}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                              <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                                  suggestion.confidence >= 0.8
                                                    ? 'bg-green-100 text-green-800'
                                                    : suggestion.confidence >= 0.5
                                                      ? 'bg-yellow-100 text-yellow-800'
                                                      : 'bg-red-100 text-red-800'
                                                }`}
                                              >
                                                {Math.round(suggestion.confidence * 100)}% confidence
                                              </span>
                                              <button
                                                onClick={() =>
                                                  handleAcceptMatch(
                                                    txn.id,
                                                    suggestion.bookingId,
                                                    suggestion.confidence
                                                  )
                                                }
                                                disabled={matchingInProgress}
                                                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-[#5A7A8F] hover:bg-[#4a6a7f] disabled:opacity-50 rounded transition-colors"
                                              >
                                                {matchingInProgress ? (
                                                  <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                  <CheckCircle className="h-3 w-3" />
                                                )}
                                                Accept Match
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}

                                  {/* Manual search */}
                                  <div className="flex-1 bg-white rounded-lg border border-gray-200 p-3">
                                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                      Search Bookings
                                    </h4>
                                    <div className="relative mb-2">
                                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                      <input
                                        type="text"
                                        placeholder="Search by name, booking #, boat..."
                                        value={bookingSearchQuery}
                                        onChange={(e) => setBookingSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
                                      />
                                    </div>
                                    {bookingSearchResults.length > 0 && (
                                      <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-md">
                                        {bookingSearchResults.map((b) => (
                                          <div
                                            key={b.id}
                                            className="flex items-center justify-between px-3 py-2 hover:bg-gray-50"
                                          >
                                            <div>
                                              <p className="text-sm font-medium text-gray-900">
                                                {b.customerName}
                                              </p>
                                              <p className="text-xs text-gray-500">
                                                {b.bookingNumber} &middot; {formatDate(b.dateFrom)} -{' '}
                                                {formatDate(b.dateTo)}
                                                {b.totalPrice != null && (
                                                  <> &middot; {formatCurrency(b.totalPrice)}</>
                                                )}
                                              </p>
                                            </div>
                                            <button
                                              onClick={() => handleAcceptMatch(txn.id, b.id)}
                                              disabled={matchingInProgress}
                                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-[#5A7A8F] hover:bg-[#4a6a7f] disabled:opacity-50 rounded transition-colors"
                                            >
                                              {matchingInProgress ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                              ) : (
                                                <Link2 className="h-3 w-3" />
                                              )}
                                              Link
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {bookingSearchQuery.trim() &&
                                      bookingSearchResults.length === 0 && (
                                        <p className="text-xs text-gray-500 py-2 text-center">
                                          No bookings found matching your search.
                                        </p>
                                      )}
                                  </div>

                                  {/* Cancel */}
                                  <button
                                    onClick={() => {
                                      setMatchingTxnId(null);
                                      setBookingSearchQuery('');
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors self-start"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Settlements view ───────────────────────────────────────────────── */}
      {!loading && viewMode === 'settlements' && (
        <div className="bg-white border border-gray-200 rounded-lg flex-1 flex flex-col min-h-0">
          {settlements.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-4">
              <AlertCircle className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-sm font-medium text-gray-900">No settlement data</h3>
              <p className="text-xs text-gray-500 mt-1">
                Import transactions to see settlement summaries.
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Settlement Date
                    </th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      # Txns
                    </th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Total Gross
                    </th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Total Fee
                    </th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Total VAT
                    </th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Total Net
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Beam Invoice #
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {settlements.map((s) => (
                    <tr key={s.settlementDate} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5 text-gray-900">
                        {s.settlementDate === 'unsettled' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                            Unsettled
                          </span>
                        ) : (
                          formatDate(s.settlementDate)
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-700">{s.count}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-gray-900">
                        {formatCurrency(s.totalGross)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-red-600">
                        {formatCurrency(s.totalFee)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-red-600">
                        {formatCurrency(s.totalVat)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-gray-900">
                        {formatCurrency(s.totalNet)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">{s.invoiceNo ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Collapsible settlement summary (below transactions view) ───────── */}
      {!loading && viewMode === 'transactions' && settlements.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg mt-4">
          <button
            onClick={() => setSettlementExpanded(!settlementExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span>Settlement Summary ({settlements.length} groups)</span>
            {settlementExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </button>
          {settlementExpanded && (
            <div className="border-t border-gray-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">
                      Settlement Date
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">
                      # Txns
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">
                      Total Gross
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">
                      Total Fee
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">
                      Total VAT
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">
                      Total Net
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">
                      Invoice #
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {settlements.map((s) => (
                    <tr key={s.settlementDate} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-900">
                        {s.settlementDate === 'unsettled' ? (
                          <span className="text-yellow-600 font-medium">Unsettled</span>
                        ) : (
                          formatDate(s.settlementDate)
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">{s.count}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">
                        {formatCurrency(s.totalGross)}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600">{formatCurrency(s.totalFee)}</td>
                      <td className="px-3 py-2 text-right text-red-600">{formatCurrency(s.totalVat)}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">
                        {formatCurrency(s.totalNet)}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{s.invoiceNo ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Import preview modal ───────────────────────────────────────────── */}
      {showImportModal && importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Import Preview</h2>
            </div>

            {/* Modal body */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {/* Summary */}
              <div className="flex items-center gap-6 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{importPreview.totalRows}</p>
                  <p className="text-xs text-gray-500">Total rows</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{importPreview.newRows}</p>
                  <p className="text-xs text-gray-500">New</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-400">{importPreview.existingRows}</p>
                  <p className="text-xs text-gray-500">Already imported</p>
                </div>
              </div>

              {importPreview.newRows === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    All transactions in this file have already been imported.
                  </p>
                </div>
              )}

              {/* Preview table */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-2 py-2 font-semibold text-gray-600">Date</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-600">Description</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-600">Cardholder</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600">Gross</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importPreview.rows.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap">
                          {formatDate(row.transaction_date)}
                        </td>
                        <td className="px-2 py-1.5 text-gray-700 max-w-[200px] truncate">
                          {row.payment_link_description ?? '-'}
                        </td>
                        <td className="px-2 py-1.5 text-gray-700">{row.card_holder_name ?? '-'}</td>
                        <td className="px-2 py-1.5 text-right text-gray-900">
                          {formatCurrency(row.gross_amount)}
                        </td>
                        <td className="px-2 py-1.5 text-right text-gray-900">
                          {formatCurrency(row.net_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importPreview.rows.length > 10 && (
                  <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 text-center border-t border-gray-200">
                    Showing 10 of {importPreview.rows.length} rows
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportConfirm}
                disabled={importing || importPreview.newRows === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] hover:bg-[#4a6a7f] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                Import {importPreview.newRows} Transaction{importPreview.newRows !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
