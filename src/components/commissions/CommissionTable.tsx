'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Plus, Pencil, Trash2, Download, X, Check, AlertCircle, Link2, PenLine, CheckCircle, DollarSign, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { commissionRecordsApi } from '@/lib/supabase/api/commissionRecords';
import { projectsApi } from '@/lib/supabase/api/projects';
import { authApi } from '@/lib/supabase/api/auth';
import { employeesApi } from '@/lib/supabase/api/employees';
import { useAuth } from '@/components/auth/AuthProvider';
import type { Database } from '@/lib/supabase/database.types';

type CommissionRecord = Database['public']['Tables']['commission_records']['Row'];
type Project = Database['public']['Tables']['projects']['Row'];
type Employee = Database['public']['Tables']['employees']['Row'];

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
}

const CHARTER_TYPES = [
  { value: 'day_charter', label: 'Day Charter' },
  { value: 'overnight_charter', label: 'Overnight Charter' },
  { value: 'cabin_charter', label: 'Cabin Charter' },
  { value: 'other_charter', label: 'Other Charter' },
  { value: 'bareboat_charter', label: 'Bareboat Charter' },
  { value: 'crewed_charter', label: 'Crewed Charter' },
  { value: 'outsource_commission', label: 'Outsource Commission' },
];

const BOOKING_TYPES = ['direct', 'agency', 'other'];

interface EditingRecord {
  boat_id: string;
  charter_date_from: string;
  charter_date_to: string;
  charter_type: string;
  booking_type: string;
  charter_fee: number;
  management_fee: number;
  net_income: number;
  commission_rate: number;
  total_commission: number;
  booking_owner_id: string;
  currency: string;
  notes: string;
}

const emptyRecord: EditingRecord = {
  boat_id: '',
  charter_date_from: '',
  charter_date_to: '',
  charter_type: 'day_charter',
  booking_type: 'direct',
  charter_fee: 0,
  management_fee: 0,
  net_income: 0,
  commission_rate: 0,
  total_commission: 0,
  booking_owner_id: '',
  currency: 'THB',
  notes: '',
};

export default function CommissionTable() {
  const { user, isSuperAdmin, getModuleRole } = useAuth();
  const accountingRole = getModuleRole('accounting');
  const isSalesOnly = !isSuperAdmin && accountingRole === 'sales';

  const [records, setRecords] = useState<CommissionRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [salesEmployees, setSalesEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Add/Edit state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditingRecord>(emptyRecord);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Payment tracking
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [payModalId, setPayModalId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ paidDate: '', paidBy: '', reference: '', method: '' });
  const [payingSaving, setPayingSaving] = useState(false);

  // Month selector
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  // Filters
  const [filterBoat, setFilterBoat] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [filterBookingType, setFilterBookingType] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  // Helper: is a commission record "earned" (charter completed)?
  const isEarned = useCallback((record: CommissionRecord) => {
    const today = new Date().toISOString().split('T')[0];
    return (record.charter_date_to && record.charter_date_to <= today) || !record.charter_date_to;
  }, []);

  // Month navigation helpers
  const navigateMonth = useCallback((direction: -1 | 1) => {
    const [y, m] = filterMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + direction, 1);
    setFilterMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }, [filterMonth]);

  const monthLabel = useMemo(() => {
    if (filterMonth === 'all') return 'All Time';
    const [y, m] = filterMonth.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [filterMonth]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [allProjects, allUsers, allSalesEmployees] = await Promise.all([
        projectsApi.getAll(),
        authApi.getAllProfiles(),
        employeesApi.getByDepartment('Sales'),
      ]);
      setProjects(allProjects);
      setUsers(allUsers as UserProfile[]);
      setSalesEmployees(allSalesEmployees);

      // Sync from bookings first
      setSyncing(true);
      try {
        const projectsForSync = allProjects.map(p => ({
          id: p.id,
          management_fee_percentage: p.management_fee_percentage,
        }));
        await commissionRecordsApi.syncFromBookings(projectsForSync);
      } catch (syncErr) {
        console.error('Failed to sync from bookings:', syncErr);
      } finally {
        setSyncing(false);
      }

      // Load records after sync
      let allRecords = await commissionRecordsApi.getAll();

      // Sales role: filter to only show own commissions
      if (isSalesOnly && user) {
        const myEmployee = allSalesEmployees.find(e => e.user_profile_id === user.id);
        if (myEmployee) {
          allRecords = allRecords.filter(r => r.booking_owner_id === myEmployee.id);
        } else {
          // No employee record linked — show nothing
          allRecords = [];
        }
      }

      setRecords(allRecords);
    } catch (error) {
      console.error('Failed to load commission data:', error);
      setLoadError('Failed to load commission data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  }, [isSalesOnly, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lookup maps
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const employeeMap = useMemo(() => new Map(salesEmployees.map((e) => [e.id, e.full_name_en])), [salesEmployees]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Month filter
      if (filterMonth !== 'all') {
        const dateStr = r.charter_date_from || '';
        if (!dateStr.startsWith(filterMonth)) return false;
      }
      if (filterBoat !== 'all' && r.boat_id !== filterBoat) return false;
      if (filterOwner !== 'all' && r.booking_owner_id !== filterOwner) return false;
      if (filterBookingType !== 'all' && r.booking_type !== filterBookingType) return false;
      if (filterSource !== 'all' && r.source !== filterSource) return false;
      if (filterDateFrom && (r.charter_date_from || '') < filterDateFrom) return false;
      if (filterDateTo && (r.charter_date_to || r.charter_date_from || '') > filterDateTo) return false;
      return true;
    });
  }, [records, filterMonth, filterBoat, filterOwner, filterBookingType, filterSource, filterDateFrom, filterDateTo]);

  // Summary
  const summary = useMemo(() => {
    const byOwner = new Map<string, { name: string; totalCommission: number; totalNetIncome: number; count: number }>();
    let totalNetIncome = 0;
    let totalCommission = 0;
    let earnedCommission = 0;
    let paidCommission = 0;

    for (const r of filteredRecords) {
      totalNetIncome += r.net_income;
      totalCommission += r.total_commission;
      if (isEarned(r)) earnedCommission += r.total_commission;
      if ((r as any).payment_status === 'paid') paidCommission += r.total_commission;

      if (r.booking_owner_id) {
        const name = getUserName(r.booking_owner_id);
        if (!byOwner.has(r.booking_owner_id)) {
          byOwner.set(r.booking_owner_id, { name, totalCommission: 0, totalNetIncome: 0, count: 0 });
        }
        const entry = byOwner.get(r.booking_owner_id)!;
        entry.totalCommission += r.total_commission;
        entry.totalNetIncome += r.net_income;
        entry.count++;
      }
    }

    return { totalNetIncome, totalCommission, earnedCommission, paidCommission, byOwner: Array.from(byOwner.values()) };
  }, [filteredRecords, userMap, employeeMap, isEarned]);

  // Unique boat options from records
  const boatOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of records) {
      if (r.boat_id && !seen.has(r.boat_id)) {
        const p = projectMap.get(r.boat_id);
        seen.set(r.boat_id, p?.name || 'Unknown');
      }
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [records, projectMap]);

  // Unique owner options from records
  const ownerOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of records) {
      if (r.booking_owner_id && !seen.has(r.booking_owner_id)) {
        seen.set(r.booking_owner_id, getUserName(r.booking_owner_id));
      }
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [records, userMap, employeeMap]);

  // Unique booking types from records
  const bookingTypeOptions = useMemo(() => {
    const types = new Set<string>();
    for (const r of records) types.add(r.booking_type);
    return Array.from(types).sort();
  }, [records]);

  // Form handlers
  const updateForm = (field: keyof EditingRecord, value: string | number) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-calc net_income when charter_fee or management_fee changes
      if (field === 'charter_fee' || field === 'management_fee') {
        const cf = field === 'charter_fee' ? (value as number) : prev.charter_fee;
        const mf = field === 'management_fee' ? (value as number) : prev.management_fee;
        next.net_income = cf - mf;
      }
      // Auto-calc total_commission when net_income or commission_rate changes
      if (field === 'net_income' || field === 'commission_rate' || field === 'charter_fee' || field === 'management_fee') {
        next.total_commission = Math.round(next.net_income * next.commission_rate) / 100;
      }
      return next;
    });
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyRecord);
    setShowForm(true);
  };

  const openEditForm = (record: CommissionRecord) => {
    setEditingId(record.id);
    setForm({
      boat_id: record.boat_id || '',
      charter_date_from: record.charter_date_from || '',
      charter_date_to: record.charter_date_to || '',
      charter_type: record.charter_type || 'day_charter',
      booking_type: record.booking_type,
      charter_fee: record.charter_fee,
      management_fee: record.management_fee,
      net_income: record.net_income,
      commission_rate: record.commission_rate,
      total_commission: record.total_commission,
      booking_owner_id: record.booking_owner_id || '',
      currency: record.currency,
      notes: record.notes || '',
    });
    setShowForm(true);
  };

  // Check if a record is from a booking (restricted editing)
  const isBookingSourced = (record: CommissionRecord) => record.source === 'booking';

  const handleSave = async () => {
    if (!form.boat_id) { alert('Please select a boat.'); return; }
    if (!form.booking_owner_id) { alert('Please select a booking owner.'); return; }

    try {
      setSaving(true);

      // Check if editing a booking-sourced record
      const editingRecord = editingId ? records.find(r => r.id === editingId) : null;
      const isFromBooking = editingRecord && isBookingSourced(editingRecord);

      if (isFromBooking) {
        // Only allow updating management_fee, commission_rate, notes for booking-sourced records
        await commissionRecordsApi.update(editingId!, {
          management_fee: form.management_fee,
          net_income: form.charter_fee - form.management_fee,
          commission_rate: form.commission_rate,
          total_commission: Math.round((form.charter_fee - form.management_fee) * form.commission_rate) / 100,
          notes: form.notes || null,
          management_fee_overridden: editingRecord.management_fee !== form.management_fee ? true : editingRecord.management_fee_overridden,
        });
      } else {
        const payload = {
          boat_id: form.boat_id || null,
          charter_date_from: form.charter_date_from || null,
          charter_date_to: form.charter_date_to || null,
          charter_type: form.charter_type || null,
          booking_type: form.booking_type,
          charter_fee: form.charter_fee,
          management_fee: form.management_fee,
          net_income: form.net_income,
          commission_rate: form.commission_rate,
          total_commission: form.total_commission,
          booking_owner_id: form.booking_owner_id || null,
          currency: form.currency,
          notes: form.notes || null,
        };

        if (editingId) {
          await commissionRecordsApi.update(editingId, payload);
        } else {
          await commissionRecordsApi.create(payload);
        }
      }

      setShowForm(false);
      setEditingId(null);
      await loadData();
    } catch (error) {
      console.error('Failed to save commission record:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const record = records.find(r => r.id === id);
    if (record && isBookingSourced(record)) {
      alert('This record is synced from a booking. Delete the booking to remove this record.');
      return;
    }

    try {
      setDeletingId(id);
      await commissionRecordsApi.delete(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setApprovingId(id);
      await commissionRecordsApi.markAsApproved(id);
      await loadData();
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('Failed to approve. Please try again.');
    } finally {
      setApprovingId(null);
    }
  };

  const openPayModal = (record: CommissionRecord) => {
    setPayModalId(record.id);
    setPayForm({
      paidDate: new Date().toISOString().split('T')[0],
      paidBy: '',
      reference: '',
      method: 'bank_transfer',
    });
  };

  const handleMarkPaid = async () => {
    if (!payModalId) return;
    if (!payForm.paidDate) { alert('Please enter a payment date.'); return; }
    try {
      setPayingSaving(true);
      await commissionRecordsApi.markAsPaid(
        payModalId,
        payForm.paidDate,
        payForm.paidBy || null as any,
        payForm.reference || null,
        payForm.method || null
      );
      setPayModalId(null);
      await loadData();
    } catch (error) {
      console.error('Failed to mark as paid:', error);
      alert('Failed to mark as paid. Please try again.');
    } finally {
      setPayingSaving(false);
    }
  };

  const getPaymentStatusBadge = (record: CommissionRecord) => {
    const status = (record as any).payment_status || 'unpaid';
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Approved</span>;
      case 'paid':
        return <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">Paid</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Unpaid</span>;
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Boat', 'Charter Date From', 'Charter Date To', 'Charter Type', 'Booking Type',
      'Charter Fee', 'Management Fee', 'Net Income to FA', 'Commission Rate (%)',
      'Total Commission', 'Booking Owner', 'Status', 'Payment Status', 'Currency', 'Source', 'Notes',
    ];
    const rows = filteredRecords.map((r) => [
      projectMap.get(r.boat_id || '')?.name || '',
      r.charter_date_from || '',
      r.charter_date_to || '',
      formatCharterType(r.charter_type),
      r.booking_type,
      r.charter_fee.toFixed(2),
      r.management_fee.toFixed(2),
      r.net_income.toFixed(2),
      r.commission_rate.toFixed(2),
      r.total_commission.toFixed(2),
      getUserName(r.booking_owner_id),
      isEarned(r) ? 'Earned' : 'Pending',
      (r as any).payment_status || 'unpaid',
      r.currency,
      r.source || 'manual',
      r.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number, currency: string = 'THB') =>
    `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatCharterType = (type: string | null) => {
    if (!type) return '-';
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getUserName = (id: string | null) => {
    if (!id) return '-';
    // Check employees first (sales_owner_id), then auth profiles (legacy booking_owner)
    const empName = employeeMap.get(id);
    if (empName) return empName;
    const u = userMap.get(id);
    return u?.full_name || u?.email || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        {syncing && <span className="ml-2 text-sm text-gray-500">Syncing from bookings...</span>}
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

  // When editing a booking-sourced record, determine which fields are read-only
  const editingRecord = editingId ? records.find(r => r.id === editingId) : null;
  const editingIsFromBooking = editingRecord ? isBookingSourced(editingRecord) : false;

  return (
    <div className="space-y-4">
      {/* Month Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 min-w-[160px] justify-center">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-900">{monthLabel}</span>
          </div>
          <button
            onClick={() => navigateMonth(1)}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => setFilterMonth('all')}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
            filterMonth === 'all'
              ? 'bg-[#5A7A8F] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Time
        </button>
        {filterMonth === 'all' && (
          <button
            onClick={() => setFilterMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)}
            className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Current Month
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs text-gray-500 uppercase">Total Commission</div>
          <div className="text-xl font-bold text-[#5A7A8F] mt-1">{formatCurrency(summary.totalCommission)}</div>
          <div className="text-xs text-gray-400">{filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs text-gray-500 uppercase">Earned</div>
          <div className="text-xl font-bold text-green-700 mt-1">{formatCurrency(summary.earnedCommission)}</div>
          <div className="text-xs text-gray-400">Charter completed</div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs text-gray-500 uppercase">Paid</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(summary.paidCommission)}</div>
          <div className="text-xs text-gray-400">
            {summary.totalCommission > 0
              ? `${Math.round((summary.paidCommission / summary.totalCommission) * 100)}% of total`
              : 'No commission'}
          </div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs text-gray-500 uppercase">By Sales Person</div>
          <div className="mt-1 space-y-1">
            {summary.byOwner.length === 0 && <div className="text-xs text-gray-400">No data</div>}
            {summary.byOwner.map((o) => (
              <div key={o.name} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 font-medium truncate mr-2">{o.name}</span>
                <span className="text-[#5A7A8F] font-semibold whitespace-nowrap">{formatCurrency(o.totalCommission)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
        <select value={filterBoat} onChange={(e) => setFilterBoat(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]">
          <option value="all">All Boats</option>
          {boatOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>

        {!isSalesOnly && (
          <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]">
            <option value="all">All Sales Persons</option>
            {ownerOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}

        <select value={filterBookingType} onChange={(e) => setFilterBookingType(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]">
          <option value="all">All Booking Types</option>
          {bookingTypeOptions.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>

        <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]">
          <option value="all">All Sources</option>
          <option value="booking">Booking</option>
          <option value="manual">Manual</option>
        </select>

        <div className="flex items-center gap-1">
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]" />
        </div>

        <div className="flex-1" />

        <button onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <Download className="h-4 w-4" />
          Export CSV
        </button>

        <button onClick={openAddForm}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors">
          <Plus className="h-4 w-4" />
          Add Record
        </button>
      </div>

      {/* Results count */}
      <div className="text-xs text-gray-500">
        Showing {filteredRecords.length} of {records.length} records
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="border border-gray-200 rounded-lg bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {editingId ? 'Edit Commission Record' : 'Add Commission Record'}
              </h3>
              {editingIsFromBooking && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                  <Link2 className="h-3 w-3" />
                  From Booking
                </span>
              )}
            </div>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {editingIsFromBooking && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              This record is synced from a booking. Only management fee, commission rate, and notes can be edited.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Boat */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Boat / Product</label>
              <select value={form.boat_id} onChange={(e) => updateForm('boat_id', e.target.value)}
                disabled={editingIsFromBooking}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:text-gray-500">
                <option value="">Select boat...</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </div>

            {/* Charter Date From */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Charter Date From</label>
              <input type="date" value={form.charter_date_from} onChange={(e) => updateForm('charter_date_from', e.target.value)}
                disabled={editingIsFromBooking}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:text-gray-500" />
            </div>

            {/* Charter Date To */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Charter Date To</label>
              <input type="date" value={form.charter_date_to} onChange={(e) => updateForm('charter_date_to', e.target.value)}
                disabled={editingIsFromBooking}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:text-gray-500" />
            </div>

            {/* Charter Type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Charter Type</label>
              <select value={form.charter_type} onChange={(e) => updateForm('charter_type', e.target.value)}
                disabled={editingIsFromBooking}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:text-gray-500">
                {CHARTER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Booking Type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Booking Type</label>
              <select value={form.booking_type} onChange={(e) => updateForm('booking_type', e.target.value)}
                disabled={editingIsFromBooking}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:text-gray-500">
                {BOOKING_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>

            {/* Charter Fee */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Charter Fee</label>
              <input type="number" value={form.charter_fee || ''} onChange={(e) => updateForm('charter_fee', parseFloat(e.target.value) || 0)}
                disabled={editingIsFromBooking}
                min="0" step="0.01" placeholder="0.00"
                className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:text-gray-500" />
            </div>

            {/* Management Fee */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Management Fee</label>
              <input type="number" value={form.management_fee || ''} onChange={(e) => updateForm('management_fee', parseFloat(e.target.value) || 0)}
                min="0" step="0.01" placeholder="0.00"
                className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]" />
            </div>

            {/* Net Income */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Net Income to FA</label>
              <input type="number" value={form.net_income || ''} onChange={(e) => updateForm('net_income', parseFloat(e.target.value) || 0)}
                step="0.01" placeholder="Auto-calculated"
                className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] bg-gray-50" />
              <div className="text-xs text-gray-400 mt-0.5">Charter Fee - Management Fee</div>
            </div>

            {/* Commission Rate */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Commission Rate (%)</label>
              <input type="number" value={form.commission_rate || ''} onChange={(e) => updateForm('commission_rate', parseFloat(e.target.value) || 0)}
                min="0" max="100" step="0.01" placeholder="0.00"
                className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]" />
            </div>

            {/* Total Commission (read-only) */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total Commission</label>
              <div className="w-full px-2 py-1.5 text-sm text-right border border-gray-200 rounded bg-gray-100 text-gray-700 font-medium">
                {formatCurrency(form.total_commission, form.currency)}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Net Income x Rate / 100</div>
            </div>

            {/* Booking Owner */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Booking Owner (Sales Person)</label>
              <select value={form.booking_owner_id} onChange={(e) => updateForm('booking_owner_id', e.target.value)}
                disabled={editingIsFromBooking}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:text-gray-500">
                <option value="">Select person...</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
              </select>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input type="text" value={form.notes} onChange={(e) => updateForm('notes', e.target.value)}
                placeholder="Optional notes..."
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {editingId ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {records.length === 0 && !showForm ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No commission records yet.</p>
          <p className="text-gray-400 text-xs mt-1">Click &quot;Add Record&quot; to create your first entry, or records will auto-sync from bookings.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boat</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Charter Date</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Charter Fee</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Mgmt Fee</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Income</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commission</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((r) => {
                  const fromBooking = isBookingSourced(r);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5">
                        {fromBooking ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                            <Link2 className="h-3 w-3" />
                            Booking
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            <PenLine className="h-3 w-3" />
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-sm font-medium text-gray-900">{projectMap.get(r.boat_id || '')?.name || '-'}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-sm text-gray-600">{r.charter_date_from || '-'}</div>
                        {r.charter_date_to && r.charter_date_to !== r.charter_date_from && (
                          <div className="text-xs text-gray-400">to {r.charter_date_to}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-600">{formatCharterType(r.charter_type)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          r.booking_type === 'direct' ? 'bg-green-100 text-green-800' :
                          r.booking_type === 'agency' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {r.booking_type.charAt(0).toUpperCase() + r.booking_type.slice(1)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-right text-gray-700">{formatCurrency(r.charter_fee, r.currency)}</td>
                      <td className="px-3 py-2.5 text-sm text-right text-gray-700">
                        <div className="flex items-center justify-end gap-1">
                          {formatCurrency(r.management_fee, r.currency)}
                          {r.management_fee_overridden && (
                            <span title="Management fee manually overridden" className="text-amber-500">
                              <PenLine className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-right font-medium text-gray-900">{formatCurrency(r.net_income, r.currency)}</td>
                      <td className="px-3 py-2.5 text-sm text-right text-gray-600">{r.commission_rate}%</td>
                      <td className="px-3 py-2.5 text-sm text-right font-semibold text-[#5A7A8F]">{formatCurrency(r.total_commission, r.currency)}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-700">{getUserName(r.booking_owner_id)}</td>
                      <td className="px-3 py-2.5 text-center">
                        {isEarned(r) ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">Earned</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">Pending</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {getPaymentStatusBadge(r)}
                          {((r as any).payment_status || 'unpaid') === 'unpaid' && isEarned(r) && (
                            <button
                              onClick={() => handleApprove(r.id)}
                              disabled={approvingId === r.id}
                              title="Approve for payment"
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-[#5A7A8F] bg-[#5A7A8F]/10 rounded hover:bg-[#5A7A8F]/20 transition-colors disabled:opacity-50"
                            >
                              {approvingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                              Approve
                            </button>
                          )}
                          {((r as any).payment_status) === 'approved' && (
                            <button
                              onClick={() => openPayModal(r)}
                              title="Mark as paid"
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors"
                            >
                              <DollarSign className="h-3 w-3" />
                              Mark Paid
                            </button>
                          )}
                          {((r as any).payment_status) === 'paid' && (r as any).paid_date && (
                            <span className="text-xs text-gray-400" title={`Ref: ${(r as any).payment_reference || '-'} | Method: ${(r as any).payment_method || '-'}`}>
                              {(r as any).paid_date}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditForm(r)}
                            className="p-1 text-gray-400 hover:text-[#5A7A8F] transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {fromBooking ? (
                            <button disabled title="Synced from booking — cannot delete"
                              className="p-1 text-gray-300 cursor-not-allowed">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button onClick={() => handleDelete(r.id)} disabled={deletingId === r.id}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50">
                              {deletingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {payModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Mark as Paid</h3>
              <button onClick={() => setPayModalId(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date *</label>
                <input type="date" value={payForm.paidDate} onChange={(e) => setPayForm(prev => ({ ...prev, paidDate: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Paid By</label>
                <select value={payForm.paidBy} onChange={(e) => setPayForm(prev => ({ ...prev, paidBy: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]">
                  <option value="">Select person...</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Reference</label>
                <input type="text" value={payForm.reference} onChange={(e) => setPayForm(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="e.g. transfer ref, check number..."
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                <select value={payForm.method} onChange={(e) => setPayForm(prev => ({ ...prev, method: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]">
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => setPayModalId(null)}
                className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleMarkPaid} disabled={payingSaving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                {payingSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DollarSign className="h-3.5 w-3.5" />}
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
