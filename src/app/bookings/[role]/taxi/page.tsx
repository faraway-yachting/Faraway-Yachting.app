'use client';

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Car, Building2, List, CalendarDays } from 'lucide-react';
import {
  TaxiTransfer,
  TransferStatus,
  transferStatusLabels,
  transferStatusColors,
  tripTypeLabels,
  paidByLabels,
} from '@/data/taxi/types';
import { useAllTaxiTransfers } from '@/hooks/queries/useTaxiTransfers';
import { TaxiTransferForm } from '@/components/bookings/taxi/TaxiTransferForm';
import { TaxiCompanyManager } from '@/components/bookings/taxi/TaxiCompanyManager';
import { TaxiCalendarView } from '@/components/bookings/taxi/TaxiCalendarView';
import { useAuth } from '@/components/auth';

export default function TaxiPage() {
  const { isSuperAdmin, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canCreate = isSuperAdmin || hasPermission('bookings.taxi.create');

  // Data
  const { data: transfers = [], isLoading } = useAllTaxiTransfers();

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TaxiTransfer | null>(null);
  const [showCompanyManager, setShowCompanyManager] = useState(false);

  // Get unique company names for filter
  const companyNames = useMemo(() => {
    const names = new Set<string>();
    transfers.forEach(t => {
      if (t.taxiCompanyName) names.add(t.taxiCompanyName);
    });
    return Array.from(names).sort();
  }, [transfers]);

  // Filter transfers
  const filteredTransfers = useMemo(() => {
    let result = [...transfers];

    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }
    if (companyFilter !== 'all') {
      result = result.filter(t => t.taxiCompanyName === companyFilter);
    }
    if (dateFrom) {
      result = result.filter(t => (t.pickupDate && t.pickupDate >= dateFrom) || (t.returnDate && t.returnDate >= dateFrom));
    }
    if (dateTo) {
      result = result.filter(t => (t.pickupDate && t.pickupDate <= dateTo) || (t.returnDate && t.returnDate <= dateTo));
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
  }, [transfers, statusFilter, companyFilter, dateFrom, dateTo, search]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleRowClick = (transfer: TaxiTransfer) => {
    setSelectedTransfer(transfer);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedTransfer(null);
    queryClient.invalidateQueries({ queryKey: ['taxiTransfers'] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Car className="h-5 w-5" />
          Taxi Transfers
        </h1>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              title="Calendar view"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setShowCompanyManager(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Building2 className="h-4 w-4" />
            Companies
          </button>
          {canCreate && (
            <button
              onClick={() => { setSelectedTransfer(null); setShowForm(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              New Transfer
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Guest, boat, transfer #, driver..."
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              {Object.entries(transferStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Company */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Companies</option>
              {companyNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          {filteredTransfers.length} transfer{filteredTransfers.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Content: Table or Calendar */}
      {viewMode === 'calendar' ? (
        <TaxiCalendarView transfers={filteredTransfers} onTransferClick={handleRowClick} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transfer #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boat</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trip</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pick-up</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid By</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                      No taxi transfers found
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((transfer) => {
                    const statusColor = transferStatusColors[transfer.status];
                    return (
                      <tr
                        key={transfer.id}
                        onClick={() => handleRowClick(transfer)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{transfer.transferNumber}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                            {transferStatusLabels[transfer.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(transfer.pickupDate || transfer.returnDate)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[150px] truncate">{transfer.guestName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-[120px] truncate">{transfer.boatName || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{tripTypeLabels[transfer.tripType]}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">
                          {transfer.pickupLocation || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{transfer.taxiCompanyName || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{transfer.driverName || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{paidByLabels[transfer.paidBy]}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                          {transfer.amount ? `${transfer.currency} ${transfer.amount.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transfer Form Modal */}
      {showForm && (
        <TaxiTransferForm
          transfer={selectedTransfer}
          onClose={handleFormClose}
        />
      )}

      {/* Company Manager Modal */}
      {showCompanyManager && (
        <TaxiCompanyManager
          onClose={() => setShowCompanyManager(false)}
        />
      )}
    </div>
  );
}
