'use client';

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Download, Check } from 'lucide-react';
import { Booking, BookingType, bookingTypeLabels } from '@/data/booking/types';
import { bookingsApi } from '@/lib/supabase/api/bookings';
import { cabinAllocationsApi } from '@/lib/supabase/api/cabinAllocations';
import { useAgencyPayments, useAgencyCabinPayments } from '@/hooks/queries/useBookings';
import { useYachtProjects } from '@/hooks/queries/useProjects';
import { BookingForm } from '@/components/bookings/BookingForm';
import { useAuth } from '@/components/auth';
import { useDataScope } from '@/hooks/useDataScope';

// Unified row type for both booking-level and cabin-level agency payments
interface AgencyPaymentRow {
  id: string;
  source: 'booking' | 'cabin';
  bookingId: string;
  bookingNumber: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  projectId?: string;
  externalBoatName?: string;
  agentName?: string;
  agentPlatform?: string;
  cabinLabel?: string;
  charterFee: number;
  currency: string;
  agencyCommissionRate?: number;
  agencyCommissionAmount: number;
  agencyCommissionThb: number;
  agencyPaymentStatus: string;
  agencyPaidDate?: string;
  // For opening the booking form
  booking?: Booking;
}

export default function AgencyPaymentsPage() {
  const { isSuperAdmin, hasPermission } = useAuth();
  const canEdit = isSuperAdmin || hasPermission('bookings.booking.edit');
  const queryClient = useQueryClient();
  const { projectIds } = useDataScope();

  const { data: bookings = [], isLoading: bookingsLoading } = useAgencyPayments();
  const { data: cabinPayments = [], isLoading: cabinsLoading } = useAgencyCabinPayments();
  const { data: projects = [] } = useYachtProjects(projectIds);

  const isLoading = bookingsLoading || cabinsLoading;

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [boatFilter, setBoatFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modal
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach(p => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const getBoatName = (row: AgencyPaymentRow): string => {
    if (row.externalBoatName) return row.externalBoatName;
    if (row.projectId) return projectMap.get(row.projectId) || 'Unknown';
    return 'External';
  };

  // Merge booking-level and cabin-level agency payments into unified rows
  const allRows = useMemo((): AgencyPaymentRow[] => {
    const rows: AgencyPaymentRow[] = [];

    // Booking-level payments
    for (const b of bookings) {
      rows.push({
        id: b.id,
        source: 'booking',
        bookingId: b.id,
        bookingNumber: b.bookingNumber || '',
        type: b.type,
        dateFrom: b.dateFrom,
        dateTo: b.dateTo,
        projectId: b.projectId,
        externalBoatName: b.externalBoatName,
        agentName: b.agentName,
        agentPlatform: b.agentPlatform,
        charterFee: b.charterFee || 0,
        currency: b.currency || 'THB',
        agencyCommissionRate: b.agencyCommissionRate,
        agencyCommissionAmount: b.agencyCommissionAmount || 0,
        agencyCommissionThb: b.agencyCommissionThb || 0,
        agencyPaymentStatus: b.agencyPaymentStatus || 'unpaid',
        agencyPaidDate: b.agencyPaidDate,
        booking: b,
      });
    }

    // Cabin-level payments (from cabin charters)
    for (const cabin of cabinPayments) {
      const bk = (cabin as any).booking;
      rows.push({
        id: cabin.id,
        source: 'cabin',
        bookingId: cabin.bookingId,
        bookingNumber: bk?.booking_number || '',
        type: bk?.type || 'cabin_charter',
        dateFrom: bk?.date_from || '',
        dateTo: bk?.date_to || '',
        projectId: bk?.project_id || undefined,
        externalBoatName: bk?.external_boat_name || undefined,
        agentName: cabin.agentName,
        agentPlatform: cabin.contactPlatform,
        cabinLabel: cabin.cabinLabel,
        charterFee: cabin.charterFee || 0,
        currency: cabin.currency || 'THB',
        agencyCommissionRate: cabin.agencyCommissionRate,
        agencyCommissionAmount: cabin.agencyCommissionAmount || 0,
        agencyCommissionThb: cabin.agencyCommissionThb || 0,
        agencyPaymentStatus: cabin.agencyPaymentStatus || 'unpaid',
        agencyPaidDate: cabin.agencyPaidDate,
      });
    }

    // Sort by date descending
    rows.sort((a, b) => (b.dateFrom || '').localeCompare(a.dateFrom || ''));
    return rows;
  }, [bookings, cabinPayments]);

  // Filter rows
  const filtered = useMemo(() => {
    let result = [...allRows];
    if (statusFilter === 'unpaid') result = result.filter(r => r.agencyPaymentStatus !== 'paid');
    else if (statusFilter === 'paid') result = result.filter(r => r.agencyPaymentStatus === 'paid');
    if (boatFilter !== 'all') result = result.filter(r => r.projectId === boatFilter);
    if (dateFrom) result = result.filter(r => r.dateFrom >= dateFrom);
    if (dateTo) result = result.filter(r => r.dateTo <= dateTo);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.bookingNumber?.toLowerCase().includes(q) ||
        r.agentName?.toLowerCase().includes(q) ||
        r.agentPlatform?.toLowerCase().includes(q) ||
        r.cabinLabel?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allRows, statusFilter, boatFilter, dateFrom, dateTo, search]);

  // Summary stats
  const totalUnpaid = filtered.filter(r => r.agencyPaymentStatus !== 'paid')
    .reduce((sum, r) => sum + (r.agencyCommissionThb || 0), 0);
  const totalPaid = filtered.filter(r => r.agencyPaymentStatus === 'paid')
    .reduce((sum, r) => sum + (r.agencyCommissionThb || 0), 0);
  const pendingCount = filtered.filter(r => r.agencyPaymentStatus !== 'paid').length;

  const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleMarkPaid = async (row: AgencyPaymentRow) => {
    try {
      if (row.source === 'booking') {
        await bookingsApi.updateAgencyPaymentStatus(row.id, 'paid');
      } else {
        await cabinAllocationsApi.updateAgencyPaymentStatus(row.id, 'paid');
      }
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['cabinAllocations'] });
    } catch (err) {
      console.error('Failed to mark as paid:', err);
    }
  };

  const handleMarkUnpaid = async (row: AgencyPaymentRow) => {
    try {
      if (row.source === 'booking') {
        await bookingsApi.updateAgencyPaymentStatus(row.id, 'unpaid');
      } else {
        await cabinAllocationsApi.updateAgencyPaymentStatus(row.id, 'unpaid');
      }
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['cabinAllocations'] });
    } catch (err) {
      console.error('Failed to mark as unpaid:', err);
    }
  };

  const handleRowClick = (row: AgencyPaymentRow) => {
    if (row.source === 'booking' && row.booking) {
      setSelectedBooking(row.booking);
      setShowBookingForm(true);
    } else if (row.source === 'cabin') {
      // For cabin rows, find the parent booking from the bookings list or load it
      const parentBooking = bookings.find(b => b.id === row.bookingId);
      if (parentBooking) {
        setSelectedBooking(parentBooking);
        setShowBookingForm(true);
      }
    }
  };

  const handleSaveBooking = async (bookingData: Partial<Booking>) => {
    if (selectedBooking) {
      await bookingsApi.update(selectedBooking.id, bookingData);
    }
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['cabinAllocations'] });
    setShowBookingForm(false);
    setSelectedBooking(null);
  };

  const exportCsv = () => {
    const headers = ['Booking #', 'Source', 'Type', 'Cabin', 'Dates', 'Boat', 'Agency', 'Charter Fee', 'Currency', 'Agency Commission', 'THB Amount', 'Status', 'Paid Date'];
    const rows = filtered.map(r => [
      r.bookingNumber,
      r.source === 'cabin' ? 'Cabin' : 'Booking',
      bookingTypeLabels[r.type as BookingType] || r.type,
      r.cabinLabel || '',
      `${r.dateFrom} - ${r.dateTo}`,
      getBoatName(r),
      r.agentName || r.agentPlatform || '',
      r.charterFee || 0,
      r.currency || 'THB',
      r.agencyCommissionAmount || 0,
      r.agencyCommissionThb || 0,
      r.agencyPaymentStatus || 'unpaid',
      r.agencyPaidDate || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agency-payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Agency Payments</h1>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Unpaid</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{fmtAmt(totalUnpaid)} <span className="text-sm font-normal text-gray-400">THB</span></p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Paid</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{fmtAmt(totalPaid)} <span className="text-sm font-normal text-gray-400">THB</span></p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Pending Payments</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Booking #, agency name, cabin..."
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">All</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Boat</label>
            <select
              value={boatFilter}
              onChange={(e) => setBoatFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">All Boats</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500" />
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {filtered.length} payment{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boat</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agency</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Charter Fee</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Agency Comm.</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">THB</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Date</th>
                {canEdit && <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 11 : 10} className="px-4 py-12 text-center text-gray-500">
                    No agency payments found
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const isPaid = row.agencyPaymentStatus === 'paid';
                  return (
                    <tr
                      key={`${row.source}-${row.id}`}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(row)}
                    >
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">
                        {row.bookingNumber}
                        {row.source === 'cabin' && row.cabinLabel && (
                          <span className="ml-1 text-xs text-amber-600 font-sans">({row.cabinLabel})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {bookingTypeLabels[row.type as BookingType] || row.type}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(row.dateFrom)} - {formatDate(row.dateTo)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{getBoatName(row)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {row.agentName || row.agentPlatform || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                        {fmtAmt(row.charterFee)} {row.currency}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                        {fmtAmt(row.agencyCommissionAmount)} {row.currency}
                        {row.agencyCommissionRate ? (
                          <span className="text-xs text-gray-400 ml-1">({row.agencyCommissionRate}%)</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">
                        {row.currency !== 'THB' ? fmtAmt(row.agencyCommissionThb) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          isPaid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {row.agencyPaidDate ? formatDate(row.agencyPaidDate) : '—'}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                          {isPaid ? (
                            <button
                              onClick={() => handleMarkUnpaid(row)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 border border-gray-300 rounded hover:bg-gray-100"
                            >
                              Undo
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarkPaid(row)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100"
                            >
                              <Check className="h-3 w-3" />
                              Pay
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && selectedBooking && (
        <BookingForm
          booking={selectedBooking}
          projects={projects}
          onSave={handleSaveBooking}
          onClose={() => {
            setShowBookingForm(false);
            setSelectedBooking(null);
          }}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
