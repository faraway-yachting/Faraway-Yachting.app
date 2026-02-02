'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Check, AlertCircle, CheckCircle2, Pencil, Download, ArrowRightLeft } from 'lucide-react';
import { receiptsApi } from '@/lib/supabase/api/receipts';
import { projectsApi } from '@/lib/supabase/api/projects';
import { companiesApi } from '@/lib/supabase/api/companies';
import { intercompanyCharterFeesApi } from '@/lib/supabase/api/intercompanyCharterFees';
import type { Database } from '@/lib/supabase/database.types';

type Receipt = Database['public']['Tables']['receipts']['Row'];
type Project = Database['public']['Tables']['projects']['Row'];

/** Map charter type to project fee field */
const CHARTER_TYPE_TO_FEE_FIELD: Record<string, keyof Project> = {
  day_charter: 'intercompany_fee_day_charter',
  overnight_charter: 'intercompany_fee_overnight',
  cabin_charter: 'intercompany_fee_cabin',
  other_charter: 'intercompany_fee_other',
  bareboat_charter: 'intercompany_fee_other',
  crewed_charter: 'intercompany_fee_other',
  outsource_commission: 'intercompany_fee_other',
};

interface CharterEvent {
  key: string;
  boatId: string;
  boatName: string;
  boatCompanyId: string;
  boatCompanyName: string;
  charterDateFrom: string | null;
  charterDateTo: string | null;
  charterType: string | null;
  receipts: Receipt[];
  actionRequired: boolean;
  receivingCompanyId: string | null;
  receivingCompanyName: string;
  estimatedFee: number | null;
  currency: string;
  totalReceiptAmount: number;
  totalThb: number | null; // null if fx_rate missing for non-THB
  settlementStatus: 'none' | 'pending' | 'settled';
  settlementFeeId: string | null;
  settledFeeAmount: number | null;
  settlementRef: string | null;
  settlementDate: string | null;
}

interface CompanySummary {
  fromCompanyName: string;
  toCompanyName: string;
  pendingAmount: number;
  settledAmount: number;
  pendingCount: number;
  settledCount: number;
  currency: string;
}

type StatusFilter = 'all' | 'not_settled' | 'settled';
type ActionFilter = 'all' | 'yes' | 'no';

export default function CharterTrackingTab() {
  const [events, setEvents] = useState<CharterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [editingFee, setEditingFee] = useState<Record<string, number>>({});
  const [editingRef, setEditingRef] = useState<Record<string, string>>({});
  const [editingDate, setEditingDate] = useState<Record<string, string>>({});
  const [editingKeys, setEditingKeys] = useState<Set<string>>(new Set());

  // Filters
  const [filterBoat, setFilterBoat] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterAction, setFilterAction] = useState<ActionFilter>('all');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [paidReceipts, allProjects, allCompanies, allFees] = await Promise.all([
        receiptsApi.getPaidWithBoat(),
        projectsApi.getAll(),
        companiesApi.getAll(),
        intercompanyCharterFeesApi.getAll(),
      ]);

      const projectMap = new Map(allProjects.map((p) => [p.id, p]));
      const companyMap = new Map(allCompanies.map((c) => [c.id, c.name]));

      const groups = new Map<string, Receipt[]>();
      for (const receipt of paidReceipts) {
        const key = `${receipt.boat_id}|${receipt.charter_date_from || ''}|${receipt.charter_date_to || ''}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(receipt);
      }

      const charterEvents: CharterEvent[] = [];
      for (const [key, receipts] of groups) {
        const firstReceipt = receipts[0];
        const boatId = firstReceipt.boat_id!;
        const project = projectMap.get(boatId);
        if (!project) continue;

        const actionRequired = receipts.some((r) => r.company_id !== project.company_id);
        const diffReceipt = receipts.find((r) => r.company_id !== project.company_id);
        const receivingCompanyId = diffReceipt?.company_id || null;
        const receivingCompanyName = diffReceipt
          ? companyMap.get(diffReceipt.company_id) || 'Unknown'
          : '';

        let estimatedFee: number | null = null;
        const charterType = firstReceipt.charter_type;
        if (actionRequired && charterType) {
          const feeField = CHARTER_TYPE_TO_FEE_FIELD[charterType];
          if (feeField) {
            estimatedFee = (project[feeField] as number | null) ?? null;
          }
        }

        // Compute THB total
        const totalReceiptAmount = receipts.reduce((sum, r) => sum + r.total_amount, 0);
        let totalThb: number | null = 0;
        let missingFxRate = false;
        for (const r of receipts) {
          const cur = r.currency || 'THB';
          if (cur === 'THB') {
            totalThb = (totalThb ?? 0) + r.total_amount;
          } else if (r.fx_rate) {
            totalThb = (totalThb ?? 0) + r.total_amount * r.fx_rate;
          } else {
            missingFxRate = true;
          }
        }
        if (missingFxRate) totalThb = null;

        const receiptIds = new Set(receipts.map((r) => r.id));
        const matchingFee = allFees.find((f) => f.receipt_id && receiptIds.has(f.receipt_id));

        charterEvents.push({
          key,
          boatId,
          boatName: project.name,
          boatCompanyId: project.company_id,
          boatCompanyName: companyMap.get(project.company_id) || 'Unknown',
          charterDateFrom: firstReceipt.charter_date_from,
          charterDateTo: firstReceipt.charter_date_to,
          charterType,
          receipts,
          actionRequired,
          receivingCompanyId,
          receivingCompanyName,
          estimatedFee,
          currency: firstReceipt.currency || 'THB',
          totalReceiptAmount,
          totalThb,
          settlementStatus: matchingFee ? (matchingFee.status as 'pending' | 'settled') : 'none',
          settlementFeeId: matchingFee?.id || null,
          settledFeeAmount: matchingFee?.charter_fee_amount ?? null,
          settlementRef: matchingFee?.settlement_reference || null,
          settlementDate: matchingFee?.settled_date || null,
        });
      }

      charterEvents.sort((a, b) => (b.charterDateFrom || '').localeCompare(a.charterDateFrom || ''));
      setEvents(charterEvents);
    } catch (error) {
      console.error('Failed to load charter tracking data:', error);
      setLoadError('Failed to load charter tracking data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (filterBoat !== 'all' && e.boatId !== filterBoat) return false;
      if (filterDateFrom && (e.charterDateFrom || '') < filterDateFrom) return false;
      if (filterDateTo && (e.charterDateTo || e.charterDateFrom || '') > filterDateTo) return false;
      if (filterStatus === 'settled' && e.settlementStatus !== 'settled') return false;
      if (filterStatus === 'not_settled' && e.settlementStatus === 'settled') return false;
      if (filterAction === 'yes' && !e.actionRequired) return false;
      if (filterAction === 'no' && e.actionRequired) return false;
      return true;
    });
  }, [events, filterBoat, filterDateFrom, filterDateTo, filterStatus, filterAction]);

  // Summary cards data
  const summaries = useMemo(() => {
    const map = new Map<string, CompanySummary>();
    for (const e of events) {
      if (!e.actionRequired || e.estimatedFee == null) continue;
      const pairKey = `${e.receivingCompanyName}→${e.boatCompanyName}`;
      if (!map.has(pairKey)) {
        map.set(pairKey, {
          fromCompanyName: e.receivingCompanyName,
          toCompanyName: e.boatCompanyName,
          pendingAmount: 0,
          settledAmount: 0,
          pendingCount: 0,
          settledCount: 0,
          currency: e.currency,
        });
      }
      const s = map.get(pairKey)!;
      if (e.settlementStatus === 'settled') {
        s.settledAmount += e.estimatedFee;
        s.settledCount++;
      } else {
        s.pendingAmount += e.estimatedFee;
        s.pendingCount++;
      }
    }
    return Array.from(map.values());
  }, [events]);

  // Unique boats for filter
  const boatOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of events) {
      if (!seen.has(e.boatId)) seen.set(e.boatId, e.boatName);
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [events]);

  const handleSettle = async (event: CharterEvent) => {
    const feeAmount = editingFee[event.key] ?? event.estimatedFee ?? 0;
    const ref = editingRef[event.key]?.trim();
    const date = editingDate[event.key] || new Date().toISOString().split('T')[0];

    if (!ref) { alert('Please enter a settlement reference.'); return; }
    if (feeAmount <= 0) { alert('Please enter a fee amount greater than 0.'); return; }

    try {
      setSettlingId(event.key);
      if (event.settlementFeeId && event.settlementStatus === 'pending') {
        await intercompanyCharterFeesApi.markAsSettled([event.settlementFeeId], ref, date);
      } else {
        const created = await intercompanyCharterFeesApi.create({
          receipt_id: event.receipts[0].id,
          receipt_number: event.receipts[0].receipt_number,
          agency_company_id: event.receipts.find((r) => r.company_id !== event.boatCompanyId)?.company_id || event.receipts[0].company_id,
          owner_company_id: event.boatCompanyId,
          project_id: event.boatId,
          charter_type: event.charterType,
          charter_date: event.charterDateFrom || event.receipts[0].receipt_date,
          charter_fee_amount: feeAmount,
          currency: event.currency,
          status: 'settled',
        });
        await intercompanyCharterFeesApi.markAsSettled([created.id], ref, date);
      }
      await loadData();
      setEditingFee((prev) => { const n = { ...prev }; delete n[event.key]; return n; });
      setEditingRef((prev) => { const n = { ...prev }; delete n[event.key]; return n; });
      setEditingDate((prev) => { const n = { ...prev }; delete n[event.key]; return n; });
    } catch (error) {
      console.error('Failed to settle:', error);
      alert('Failed to settle. Please try again.');
    } finally {
      setSettlingId(null);
    }
  };

  const startEditing = (event: CharterEvent) => {
    setEditingKeys((prev) => new Set(prev).add(event.key));
    if (event.settlementFeeId) {
      setEditingFee((prev) => ({ ...prev, [event.key]: event.settledFeeAmount ?? event.estimatedFee ?? 0 }));
      setEditingRef((prev) => ({ ...prev, [event.key]: event.settlementRef ?? '' }));
      setEditingDate((prev) => ({ ...prev, [event.key]: event.settlementDate ?? new Date().toISOString().split('T')[0] }));
    }
  };

  const handleUpdateSettled = async (event: CharterEvent) => {
    if (!event.settlementFeeId) return;
    const feeAmount = editingFee[event.key] ?? event.estimatedFee ?? 0;
    const ref = editingRef[event.key]?.trim() || event.settlementRef || '';
    const date = editingDate[event.key] || event.settlementDate || new Date().toISOString().split('T')[0];

    try {
      setSettlingId(event.key);
      await intercompanyCharterFeesApi.update(event.settlementFeeId, {
        charter_fee_amount: feeAmount,
        settlement_reference: ref,
        settled_date: date,
      });
      setEditingKeys((prev) => { const n = new Set(prev); n.delete(event.key); return n; });
      await loadData();
    } catch (error) {
      console.error('Failed to update:', error);
      alert('Failed to update. Please try again.');
    } finally {
      setSettlingId(null);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Boat', 'Boat Company', 'Charter Date From', 'Charter Date To', 'Charter Type',
      'Receipt Numbers', 'Total Receipt Amount', 'Currency', 'Total (THB)',
      'Action Required', 'Estimated Fee', 'Status', 'Settlement Reference', 'Settlement Date',
    ];
    const rows = filteredEvents.map((e) => [
      e.boatName,
      e.boatCompanyName,
      e.charterDateFrom || '',
      e.charterDateTo || '',
      formatCharterType(e.charterType),
      e.receipts.map((r) => r.receipt_number).join('; '),
      e.totalReceiptAmount.toFixed(2),
      e.currency,
      e.totalThb !== null ? e.totalThb.toFixed(2) : '',
      e.actionRequired ? 'Yes' : 'No',
      e.estimatedFee?.toFixed(2) || '',
      e.settlementStatus === 'settled' ? 'Settled' : e.settlementStatus === 'pending' ? 'Pending' : 'Not settled',
      e.settlementRef || '',
      e.settlementDate || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `charter-tracking-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number, currency: string = 'THB') =>
    `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatCharterType = (type: string | null) => {
    if (!type) return '-';
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatDate = (date: string | null) => date || '-';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-600 text-sm">{loadError}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">No charter data found.</p>
        <p className="text-gray-400 text-xs mt-1">
          Paid receipts with a boat assigned will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summaries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaries.map((s) => (
            <div key={`${s.fromCompanyName}→${s.toCompanyName}`} className="border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ArrowRightLeft className="h-4 w-4 text-[#5A7A8F]" />
                <div className="text-sm font-semibold text-gray-900">
                  {s.fromCompanyName}
                </div>
                <span className="text-xs text-gray-400">→</span>
                <div className="text-sm font-semibold text-gray-900">
                  {s.toCompanyName}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500 uppercase">Pending</div>
                  <div className="text-lg font-bold text-amber-600">
                    {formatCurrency(s.pendingAmount, s.currency)}
                  </div>
                  <div className="text-xs text-gray-400">{s.pendingCount} charter{s.pendingCount !== 1 ? 's' : ''}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Settled</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(s.settledAmount, s.currency)}
                  </div>
                  <div className="text-xs text-gray-400">{s.settledCount} charter{s.settledCount !== 1 ? 's' : ''}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
        {/* Boat */}
        <select
          value={filterBoat}
          onChange={(e) => setFilterBoat(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
        >
          <option value="all">All Boats</option>
          {boatOptions.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>

        {/* Date Range */}
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
          />
        </div>

        {/* Status Pills */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {([['all', 'All'], ['not_settled', 'Not Settled'], ['settled', 'Settled']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterStatus(val)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filterStatus === val
                  ? 'bg-[#5A7A8F] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Action Pills */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {([['all', 'All'], ['yes', 'Action'], ['no', 'No Action']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterAction(val)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filterAction === val
                  ? 'bg-[#5A7A8F] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Export */}
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Results count */}
      <div className="text-xs text-gray-500">
        Showing {filteredEvents.length} of {events.length} charters
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boat</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Charter Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipts</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total (THB)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action Required</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Estimated Fee</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[320px]">Settlement</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEvents.map((event) => {
                const isSettled = event.settlementStatus === 'settled';
                const isPending = event.settlementStatus === 'pending';
                const isEditing = editingKeys.has(event.key);
                const showInputs = !isSettled || isEditing;

                return (
                  <tr key={event.key} className={`hover:bg-gray-50 ${isSettled && !isEditing ? 'bg-green-50/30' : ''} ${isEditing ? 'bg-yellow-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{event.boatName}</div>
                      <div className="text-xs text-gray-500">{event.boatCompanyName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">{formatDate(event.charterDateFrom)}</div>
                      {event.charterDateTo && event.charterDateTo !== event.charterDateFrom && (
                        <div className="text-xs text-gray-400">to {formatDate(event.charterDateTo)}</div>
                      )}
                      <div className="text-xs text-gray-400">{formatCharterType(event.charterType)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {event.receipts.map((r) => (
                          <div key={r.id} className="text-xs text-gray-600">
                            {r.receipt_number}
                            <span className="text-gray-400 ml-1">
                              ({formatCurrency(r.total_amount, r.currency || 'THB')})
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {event.totalThb !== null ? (
                        <span className="text-sm font-medium text-gray-900">
                          {`THB ${event.totalThb.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No FX rate</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {event.actionRequired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                          <AlertCircle className="h-3 w-3" />
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
                          No
                        </span>
                      )}
                      {event.actionRequired && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          Paid via {event.receivingCompanyName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {event.actionRequired ? (
                        showInputs ? (
                          <input
                            type="number"
                            value={editingFee[event.key] ?? event.estimatedFee ?? ''}
                            onChange={(e) =>
                              setEditingFee((prev) => ({
                                ...prev,
                                [event.key]: parseFloat(e.target.value) || 0,
                              }))
                            }
                            min="0"
                            step="0.01"
                            className="w-28 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(event.settledFeeAmount ?? event.estimatedFee ?? 0, event.currency)}
                          </span>
                        )
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isSettled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          <CheckCircle2 className="h-3 w-3" />
                          Settled
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Pending
                        </span>
                      ) : event.actionRequired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
                          Not settled
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {event.actionRequired && showInputs ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingRef[event.key] ?? ''}
                            onChange={(e) =>
                              setEditingRef((prev) => ({ ...prev, [event.key]: e.target.value }))
                            }
                            placeholder="Reference"
                            className="w-32 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                          />
                          <input
                            type="date"
                            value={editingDate[event.key] ?? new Date().toISOString().split('T')[0]}
                            onChange={(e) =>
                              setEditingDate((prev) => ({ ...prev, [event.key]: e.target.value }))
                            }
                            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                          />
                          {isEditing ? (
                            <button
                              onClick={() => handleUpdateSettled(event)}
                              disabled={settlingId === event.key}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-[#5A7A8F] rounded hover:bg-[#4a6a7f] transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {settlingId === event.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              Save
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSettle(event)}
                              disabled={settlingId === event.key}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-[#5A7A8F] rounded hover:bg-[#4a6a7f] transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {settlingId === event.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              Settle
                            </button>
                          )}
                        </div>
                      ) : isSettled ? (
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-gray-500">
                            <div>{event.settlementRef}</div>
                            <div className="text-gray-400">{event.settlementDate}</div>
                          </div>
                          <button
                            onClick={() => startEditing(event)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
