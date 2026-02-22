'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Car, MapPin, Clock, Users, Phone, ExternalLink, Check, Search, List, CalendarDays, TrendingUp, AlertCircle, DollarSign, CheckCircle2, CreditCard, Download, Copy, CheckCheck } from 'lucide-react';
import { TaxiCalendarView } from '@/components/bookings/taxi/TaxiCalendarView';

interface PublicTransfer {
  id: string;
  transferNumber: string;
  tripType: string;
  status: string;
  boatName?: string;
  guestName: string;
  contactNumber?: string;
  numberOfGuests?: number;
  pickupDate?: string;
  pickupTime?: string;
  pickupLocation?: string;
  pickupLocationUrl?: string;
  pickupDropoff?: string;
  pickupDropoffUrl?: string;
  returnDate?: string;
  returnTime?: string;
  returnLocation?: string;
  returnLocationUrl?: string;
  returnDropoff?: string;
  returnDropoffUrl?: string;
  driverName?: string;
  driverPhone?: string;
  vanNumberPlate?: string;
  taxiDriverId?: string;
  taxiVehicleId?: string;
  driverNote?: string;
  amount?: number;
  currency?: string;
  paidBy?: string;
  farawayPaid?: boolean;
  farawayPaidDate?: string;
}

interface CompanyDriver { id: string; name: string; phone?: string; defaultVehicleId?: string; }
interface CompanyVehicle { id: string; plateNumber: string; description?: string; photoUrl?: string; }

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  assigned: 'Driver Assigned',
  completed: 'Completed',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  assigned: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-600',
};

const tripTypeLabels: Record<string, string> = {
  pickup_only: 'Pick-up Only',
  return_only: 'Return Only',
  round_trip: 'Round Trip',
};

const paidByLabels: Record<string, string> = {
  guest: 'Guest',
  agency: 'Agency',
  faraway: 'Faraway',
};

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(monday), end: fmt(sunday) };
}

function getMonthBounds() {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const end = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
  return { start, end };
}

export default function PublicTaxiSchedulePage() {
  const params = useParams();
  const token = params.token as string;

  const [transfers, setTransfers] = useState<PublicTransfer[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [drivers, setDrivers] = useState<CompanyDriver[]>([]);
  const [vehicles, setVehicles] = useState<CompanyVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View & filter state
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [highlightedTransferId, setHighlightedTransferId] = useState<string | null>(null);

  // Driver assignment form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vanNumberPlate, setVanNumberPlate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/taxi/${token}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to load schedule');
        return;
      }
      const data = await res.json();
      setTransfers(data.transfers || []);
      setCompanyName(data.companyName || '');
      setDrivers(data.drivers || []);
      setVehicles(data.vehicles || []);
    } catch {
      setError('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Summary stats ──
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const week = useMemo(() => getWeekBounds(), []);
  const month = useMemo(() => getMonthBounds(), []);

  const stats = useMemo(() => {
    const upcoming = transfers.filter(t =>
      t.status !== 'completed' && t.status !== 'cancelled' &&
      ((t.pickupDate && t.pickupDate >= today) || (t.returnDate && t.returnDate >= today))
    ).length;

    const needsDriver = transfers.filter(t =>
      (t.status === 'pending' || t.status === 'confirmed') &&
      ((t.pickupDate && t.pickupDate >= today) || (t.returnDate && t.returnDate >= today))
    ).length;

    const thisWeek = transfers.filter(t => {
      const d = t.pickupDate || t.returnDate;
      return d && d >= week.start && d <= week.end && t.status !== 'cancelled';
    }).length;

    const outstanding = transfers
      .filter(t => t.paidBy === 'faraway' && !t.farawayPaid && t.amount)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const completedMonth = transfers.filter(t =>
      t.status === 'completed' &&
      ((t.pickupDate && t.pickupDate >= month.start && t.pickupDate <= month.end) ||
       (t.returnDate && t.returnDate >= month.start && t.returnDate <= month.end))
    ).length;

    const paidMonth = transfers
      .filter(t => t.paidBy === 'faraway' && t.farawayPaid && t.farawayPaidDate &&
        t.farawayPaidDate >= month.start && t.farawayPaidDate <= month.end)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return { upcoming, needsDriver, thisWeek, outstanding, completedMonth, paidMonth };
  }, [transfers, today, week, month]);

  // ── Filtered transfers ──
  const filteredTransfers = useMemo(() => {
    let result = [...transfers];
    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.guestName?.toLowerCase().includes(q) ||
        t.boatName?.toLowerCase().includes(q) ||
        t.transferNumber?.toLowerCase().includes(q) ||
        t.driverName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [transfers, statusFilter, search]);

  // ── Handlers ──
  const startDriverAssignment = (transfer: PublicTransfer) => {
    setEditingId(transfer.id);
    setSelectedDriverId(transfer.taxiDriverId || '');
    setSelectedVehicleId(transfer.taxiVehicleId || '');
    setDriverName(transfer.driverName || '');
    setDriverPhone(transfer.driverPhone || '');
    setVanNumberPlate(transfer.vanNumberPlate || '');
  };

  const handleDriverSubmit = async (transferId: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/taxi/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transferId, driverName, driverPhone, vanNumberPlate, taxiDriverId: selectedDriverId || undefined, taxiVehicleId: selectedVehicleId || undefined }),
      });
      if (res.ok) {
        setSubmitSuccess(transferId);
        setEditingId(null);
        setTimeout(() => setSubmitSuccess(null), 3000);
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCalendarTransferClick = (transfer: PublicTransfer) => {
    setViewMode('list');
    setHighlightedTransferId(transfer.id);
    setTimeout(() => {
      const el = cardRefs.current.get(transfer.id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setHighlightedTransferId(null), 2500);
    }, 150);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fmtMoney = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const handleDownloadPdf = async (transfer: PublicTransfer) => {
    try {
      setDownloadingPdfId(transfer.id);
      const { generateTaxiTransferPdf } = await import('@/lib/pdf/generateTaxiTransferPdf');
      await generateTaxiTransferPdf({
        transferNumber: transfer.transferNumber,
        tripType: transfer.tripType,
        status: transfer.status,
        guestName: transfer.guestName,
        boatName: transfer.boatName || undefined,
        contactNumber: transfer.contactNumber || undefined,
        numberOfGuests: transfer.numberOfGuests || undefined,
        pickupDate: transfer.pickupDate || undefined,
        pickupTime: transfer.pickupTime || undefined,
        pickupLocation: transfer.pickupLocation || undefined,
        pickupLocationUrl: transfer.pickupLocationUrl || undefined,
        pickupDropoff: transfer.pickupDropoff || undefined,
        pickupDropoffUrl: transfer.pickupDropoffUrl || undefined,
        returnDate: transfer.returnDate || undefined,
        returnTime: transfer.returnTime || undefined,
        returnLocation: transfer.returnLocation || undefined,
        returnLocationUrl: transfer.returnLocationUrl || undefined,
        returnDropoff: transfer.returnDropoff || undefined,
        returnDropoffUrl: transfer.returnDropoffUrl || undefined,
        taxiCompanyName: companyName || undefined,
        driverName: transfer.driverName || undefined,
        driverPhone: transfer.driverPhone || undefined,
        vanNumberPlate: transfer.vanNumberPlate || undefined,
        paidBy: transfer.paidBy || 'guest',
        amount: transfer.amount || undefined,
        currency: transfer.currency || 'THB',
        driverNote: transfer.driverNote || undefined,
      });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleCopyDetails = async (transfer: PublicTransfer) => {
    const lines: string[] = [];
    lines.push(`🚖 TAXI TRANSFER — ${transfer.transferNumber}`);
    lines.push(`Status: ${statusLabels[transfer.status] || transfer.status}`);
    lines.push(`Trip: ${tripTypeLabels[transfer.tripType] || transfer.tripType}`);
    lines.push('');
    lines.push(`👤 Guest: ${transfer.guestName}`);
    if (transfer.boatName) lines.push(`🚢 Boat: ${transfer.boatName}`);
    if (transfer.contactNumber) lines.push(`📱 Contact: ${transfer.contactNumber}`);
    if (transfer.numberOfGuests) lines.push(`👥 Guests: ${transfer.numberOfGuests}`);

    if (transfer.tripType !== 'return_only' && transfer.pickupDate) {
      lines.push('');
      lines.push('📍 PICK-UP');
      lines.push(`Date: ${formatDate(transfer.pickupDate)}${transfer.pickupTime ? ` at ${transfer.pickupTime}` : ''}`);
      if (transfer.pickupLocation) lines.push(`From: ${transfer.pickupLocation}`);
      if (transfer.pickupLocationUrl) lines.push(`Map: ${transfer.pickupLocationUrl}`);
      if (transfer.pickupDropoff) lines.push(`Drop-off: ${transfer.pickupDropoff}`);
      if (transfer.pickupDropoffUrl) lines.push(`Map: ${transfer.pickupDropoffUrl}`);
    }

    if (transfer.tripType !== 'pickup_only' && transfer.returnDate) {
      lines.push('');
      lines.push('📍 RETURN');
      lines.push(`Date: ${formatDate(transfer.returnDate)}${transfer.returnTime ? ` at ${transfer.returnTime}` : ''}`);
      if (transfer.returnLocation) lines.push(`From: ${transfer.returnLocation}`);
      if (transfer.returnLocationUrl) lines.push(`Map: ${transfer.returnLocationUrl}`);
      if (transfer.returnDropoff) lines.push(`Drop-off: ${transfer.returnDropoff}`);
      if (transfer.returnDropoffUrl) lines.push(`Map: ${transfer.returnDropoffUrl}`);
    }

    if (transfer.driverNote) {
      lines.push('');
      lines.push(`📝 Note: ${transfer.driverNote}`);
    }

    if (transfer.paidBy || transfer.amount) {
      lines.push('');
      if (transfer.paidBy) lines.push(`💰 Paid by: ${paidByLabels[transfer.paidBy] || transfer.paidBy}`);
      if (transfer.amount && transfer.currency) lines.push(`Amount: ${transfer.currency} ${transfer.amount.toLocaleString()}`);
    }

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopiedId(transfer.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Car className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-900">Schedule Unavailable</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#0f2744] text-white py-6 px-4">
        <div className={`mx-auto ${viewMode === 'calendar' ? 'max-w-6xl' : 'max-w-3xl'} transition-all`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Faraway Yachting</h1>
              <p className="text-blue-200 text-sm">Taxi Schedule - {companyName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`mx-auto py-6 px-4 ${viewMode === 'calendar' ? 'max-w-6xl' : 'max-w-3xl'} transition-all`}>

        {/* Summary Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[11px] font-medium text-gray-500 uppercase">Upcoming</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.upcoming}</p>
          </div>

          <div className={`rounded-xl border p-3 ${stats.needsDriver > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className={`h-3.5 w-3.5 ${stats.needsDriver > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
              <span className="text-[11px] font-medium text-gray-500 uppercase">Needs Driver</span>
            </div>
            <p className={`text-2xl font-bold ${stats.needsDriver > 0 ? 'text-orange-700' : 'text-gray-900'}`}>{stats.needsDriver}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-[11px] font-medium text-gray-500 uppercase">This Week</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
          </div>

          <div className={`rounded-xl border p-3 ${stats.outstanding > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className={`h-3.5 w-3.5 ${stats.outstanding > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
              <span className="text-[11px] font-medium text-gray-500 uppercase">Outstanding</span>
            </div>
            <p className={`text-xl font-bold ${stats.outstanding > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
              {stats.outstanding > 0 ? `฿${fmtMoney(stats.outstanding)}` : '฿0'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span className="text-[11px] font-medium text-gray-500 uppercase">Done (mo.)</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.completedMonth}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-green-500" />
              <span className="text-[11px] font-medium text-gray-500 uppercase">Paid (mo.)</span>
            </div>
            <p className="text-xl font-bold text-green-700">
              {stats.paidMonth > 0 ? `฿${fmtMoney(stats.paidMonth)}` : '฿0'}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              title="Calendar view"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </div>

          <div className="relative flex-1 min-w-0 w-full sm:w-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guest, boat, transfer #..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="assigned">Driver Assigned</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="text-xs text-gray-500 mb-3">
          {filteredTransfers.length} transfer{filteredTransfers.length !== 1 ? 's' : ''}
        </div>

        {/* Calendar View */}
        {viewMode === 'calendar' ? (
          <TaxiCalendarView
            transfers={filteredTransfers}
            onTransferClick={handleCalendarTransferClick}
          />
        ) : (
          /* List View */
          filteredTransfers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Car className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {transfers.length === 0 ? 'No transfers scheduled' : 'No transfers match your filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransfers.map(transfer => (
                <div
                  key={transfer.id}
                  ref={(el) => { if (el) cardRefs.current.set(transfer.id, el); }}
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-500 ${
                    highlightedTransferId === transfer.id
                      ? 'border-blue-400 ring-2 ring-blue-200'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Card header */}
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-mono text-gray-500">{transfer.transferNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[transfer.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusLabels[transfer.status] || transfer.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {tripTypeLabels[transfer.tripType] || transfer.tripType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {transfer.boatName && (
                        <span className="text-sm font-medium text-gray-700 mr-2">{transfer.boatName}</span>
                      )}
                      <button
                        onClick={() => handleCopyDetails(transfer)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                        title="Copy details"
                      >
                        {copiedId === transfer.id ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(transfer)}
                        disabled={downloadingPdfId === transfer.id}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                        title="Download PDF"
                      >
                        <Download className={`h-4 w-4 ${downloadingPdfId === transfer.id ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-5 space-y-4">
                    {/* Guest info */}
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {transfer.guestName}
                          {transfer.numberOfGuests && <span className="text-gray-500 ml-1">({transfer.numberOfGuests} pax)</span>}
                        </span>
                      </div>
                      {transfer.contactNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <a href={`tel:${transfer.contactNumber}`} className="text-sm text-blue-600 hover:underline">{transfer.contactNumber}</a>
                        </div>
                      )}
                    </div>

                    {/* Pick-up */}
                    {transfer.tripType !== 'return_only' && transfer.pickupDate && (
                      <div className="bg-blue-50 rounded-lg p-3 space-y-1.5">
                        <p className="text-xs font-semibold text-blue-700 uppercase">Pick-up</p>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-gray-900">
                            {formatDate(transfer.pickupDate)} {transfer.pickupTime && `at ${transfer.pickupTime}`}
                          </span>
                        </div>
                        {(transfer.pickupLocation || transfer.pickupLocationUrl) && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-blue-500 mt-0.5" />
                            <div>
                              {transfer.pickupLocation ? (
                                <>
                                  <span className="text-sm text-gray-900">{transfer.pickupLocation}</span>
                                  {transfer.pickupLocationUrl && (
                                    <a href={transfer.pickupLocationUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 hover:text-blue-800 inline-flex items-center">
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </>
                              ) : (
                                <a href={transfer.pickupLocationUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                                  View on Google Maps <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                        {(transfer.pickupDropoff || transfer.pickupDropoffUrl) && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-green-500 mt-0.5" />
                            <div>
                              {transfer.pickupDropoff ? (
                                <>
                                  <span className="text-sm text-gray-600">Drop-off: {transfer.pickupDropoff}</span>
                                  {transfer.pickupDropoffUrl && (
                                    <a href={transfer.pickupDropoffUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 hover:text-blue-800 inline-flex items-center">
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </>
                              ) : (
                                <a href={transfer.pickupDropoffUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                                  Drop-off: View on Google Maps <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Return */}
                    {transfer.tripType !== 'pickup_only' && transfer.returnDate && (
                      <div className="bg-orange-50 rounded-lg p-3 space-y-1.5">
                        <p className="text-xs font-semibold text-orange-700 uppercase">Return</p>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <span className="text-sm text-gray-900">
                            {formatDate(transfer.returnDate)} {transfer.returnTime && `at ${transfer.returnTime}`}
                          </span>
                        </div>
                        {(transfer.returnLocation || transfer.returnLocationUrl) && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-orange-500 mt-0.5" />
                            <div>
                              {transfer.returnLocation ? (
                                <>
                                  <span className="text-sm text-gray-900">{transfer.returnLocation}</span>
                                  {transfer.returnLocationUrl && (
                                    <a href={transfer.returnLocationUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 hover:text-blue-800 inline-flex items-center">
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </>
                              ) : (
                                <a href={transfer.returnLocationUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                                  View on Google Maps <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                        {(transfer.returnDropoff || transfer.returnDropoffUrl) && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-green-500 mt-0.5" />
                            <div>
                              {transfer.returnDropoff ? (
                                <>
                                  <span className="text-sm text-gray-600">Drop-off: {transfer.returnDropoff}</span>
                                  {transfer.returnDropoffUrl && (
                                    <a href={transfer.returnDropoffUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 hover:text-blue-800 inline-flex items-center">
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </>
                              ) : (
                                <a href={transfer.returnDropoffUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                                  Drop-off: View on Google Maps <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Driver note */}
                    {transfer.driverNote && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Note</p>
                        <p className="text-sm text-gray-700">{transfer.driverNote}</p>
                      </div>
                    )}

                    {/* Payment info */}
                    {(transfer.paidBy || transfer.amount) && (
                      <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                        <CreditCard className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        {transfer.paidBy && (
                          <span className="text-gray-600">
                            Paid by: <span className="font-medium text-gray-800">{paidByLabels[transfer.paidBy] || transfer.paidBy}</span>
                          </span>
                        )}
                        {transfer.amount && transfer.currency && (
                          <span className="text-gray-600">
                            Amount: <span className="font-medium text-gray-800">{transfer.currency} {transfer.amount.toLocaleString()}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Driver assignment */}
                    {transfer.status === 'assigned' && transfer.driverName ? (
                      <div className="bg-green-50 rounded-lg p-3 flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-600" />
                        <div className="text-sm">
                          <span className="font-medium text-green-800">Driver: {transfer.driverName}</span>
                          {transfer.driverPhone && <span className="text-green-700 ml-2">{transfer.driverPhone}</span>}
                          {transfer.vanNumberPlate && <span className="text-green-600 ml-2">| {transfer.vanNumberPlate}</span>}
                        </div>
                        <button
                          onClick={() => startDriverAssignment(transfer)}
                          className="ml-auto text-xs text-green-700 hover:text-green-900 underline"
                        >
                          Edit
                        </button>
                      </div>
                    ) : editingId === transfer.id ? (
                      <div className="bg-yellow-50 rounded-lg p-3 space-y-3">
                        <p className="text-xs font-semibold text-yellow-700 uppercase">Assign Driver</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {drivers.length > 0 && (
                            <select
                              value={selectedDriverId || '__custom'}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__custom' || val === '') {
                                  setSelectedDriverId('');
                                } else {
                                  setSelectedDriverId(val);
                                  const d = drivers.find(dr => dr.id === val);
                                  if (d) {
                                    setDriverName(d.name); setDriverPhone(d.phone || '');
                                    if (d.defaultVehicleId) {
                                      const v = vehicles.find(vh => vh.id === d.defaultVehicleId);
                                      if (v) { setSelectedVehicleId(d.defaultVehicleId); setVanNumberPlate(v.plateNumber); }
                                    }
                                  }
                                }
                              }}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Select driver...</option>
                              {drivers.map(d => (
                                <option key={d.id} value={d.id}>{d.name}{d.phone ? ` (${d.phone})` : ''}</option>
                              ))}
                              <option value="__custom">-- Type custom --</option>
                            </select>
                          )}
                          {vehicles.length > 0 && (
                            <select
                              value={selectedVehicleId || '__custom'}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__custom' || val === '') {
                                  setSelectedVehicleId('');
                                } else {
                                  setSelectedVehicleId(val);
                                  const v = vehicles.find(vh => vh.id === val);
                                  if (v) setVanNumberPlate(v.plateNumber);
                                }
                              }}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Select vehicle...</option>
                              {vehicles.map(v => (
                                <option key={v.id} value={v.id}>{v.plateNumber}{v.description ? ` — ${v.description}` : ''}</option>
                              ))}
                              <option value="__custom">-- Type custom --</option>
                            </select>
                          )}
                        </div>
                        {selectedVehicleId && (() => {
                          const sv = vehicles.find(vh => vh.id === selectedVehicleId);
                          return sv?.photoUrl ? (
                            <div className="flex items-center gap-2">
                              <img src={sv.photoUrl} alt={sv.plateNumber} className="h-16 w-24 object-cover rounded-md border border-gray-200" />
                              <span className="text-xs text-gray-500">{sv.plateNumber}{sv.description ? ` — ${sv.description}` : ''}</span>
                            </div>
                          ) : null;
                        })()}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={driverName}
                            onChange={(e) => { setDriverName(e.target.value); if (selectedDriverId) setSelectedDriverId(''); }}
                            placeholder="Driver name"
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={driverPhone}
                            onChange={(e) => { setDriverPhone(e.target.value); if (selectedDriverId) setSelectedDriverId(''); }}
                            placeholder="Phone number"
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={vanNumberPlate}
                            onChange={(e) => { setVanNumberPlate(e.target.value); if (selectedVehicleId) setSelectedVehicleId(''); }}
                            placeholder="Van number plate"
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDriverSubmit(transfer.id)}
                            disabled={submitting || !driverName.trim()}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                          >
                            {submitting ? 'Saving...' : 'Assign Driver'}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => startDriverAssignment(transfer)}
                        className="w-full py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        Assign Driver
                      </button>
                    )}

                    {/* Success message */}
                    {submitSuccess === transfer.id && (
                      <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Driver assigned successfully
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          Faraway Yachting - Taxi Schedule
        </div>
      </div>
    </div>
  );
}
