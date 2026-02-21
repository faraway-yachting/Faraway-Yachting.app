'use client';

import { useState } from 'react';
import { Car, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { TaxiTransfer, transferStatusLabels, transferStatusColors, tripTypeLabels } from '@/data/taxi/types';
import { useTaxiTransfersByBooking } from '@/hooks/queries/useTaxiTransfers';
import { TaxiTransferForm } from './TaxiTransferForm';
import { useAuth } from '@/components/auth';

interface BookingTaxiSectionProps {
  bookingId: string;
}

export function BookingTaxiSection({ bookingId }: BookingTaxiSectionProps) {
  const { isSuperAdmin, hasPermission } = useAuth();
  const canCreate = isSuperAdmin || hasPermission('bookings.taxi.create');
  const { data: transfers = [], isLoading } = useTaxiTransfersByBooking(bookingId);

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TaxiTransfer | null>(null);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  return (
    <>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsCollapsed(!isCollapsed)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsCollapsed(!isCollapsed); } }}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {isCollapsed ? <ChevronRight className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            <Car className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Taxi Transfers</span>
            {transfers.length > 0 && (
              <span className="text-xs text-gray-400">({transfers.length})</span>
            )}
          </div>
          {canCreate && (
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedTransfer(null); setShowForm(true); }}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-md hover:bg-blue-50"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          )}
        </div>

        {/* Content */}
        {!isCollapsed && (
          <div className="p-4">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            ) : transfers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No taxi transfers linked to this booking</p>
            ) : (
              <div className="space-y-2">
                {transfers.map(t => {
                  const statusColor = transferStatusColors[t.status];
                  return (
                    <div
                      key={t.id}
                      onClick={() => { setSelectedTransfer(t); setShowForm(true); }}
                      className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500">{t.transferNumber}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                            {transferStatusLabels[t.status]}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5">
                          {tripTypeLabels[t.tripType]} | {formatDate(t.pickupDate || t.returnDate)}
                          {t.pickupTime && ` at ${t.pickupTime}`}
                        </p>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        {t.taxiCompanyName && <p>{t.taxiCompanyName}</p>}
                        {t.driverName && <p>{t.driverName}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transfer Form */}
      {showForm && (
        <TaxiTransferForm
          transfer={selectedTransfer}
          bookingId={bookingId}
          onClose={() => { setShowForm(false); setSelectedTransfer(null); }}
        />
      )}
    </>
  );
}
