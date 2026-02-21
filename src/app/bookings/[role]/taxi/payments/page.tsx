'use client';

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Check, DollarSign } from 'lucide-react';
import {
  TaxiTransfer,
  transferStatusLabels,
  transferStatusColors,
  paidByLabels,
} from '@/data/taxi/types';
import { taxiTransfersApi } from '@/lib/supabase/api/taxiTransfers';
import { useUnpaidTaxiTransfers } from '@/hooks/queries/useTaxiTransfers';
import { useAuth } from '@/components/auth';

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getWeekDates(weekStr: string): { start: string; end: string } {
  const [yearStr, weekPart] = weekStr.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekPart);
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay() || 7;
  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() + (1 - dayOfWeek) + (week - 1) * 7);
  const sunday = new Date(firstMonday);
  sunday.setDate(firstMonday.getDate() + 6);
  return {
    start: firstMonday.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    end: sunday.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  };
}

export default function TaxiPaymentsPage() {
  const { isSuperAdmin, hasPermission } = useAuth();
  const canManage = isSuperAdmin || hasPermission('bookings.taxi_payments.manage');
  const queryClient = useQueryClient();

  const [currentWeek, setCurrentWeek] = useState(getISOWeek(new Date()));
  const { data: unpaidTransfers = [], isLoading } = useUnpaidTaxiTransfers();

  const weekDates = getWeekDates(currentWeek);

  const navigateWeek = (direction: number) => {
    const [yearStr, weekPart] = currentWeek.split('-W');
    let year = parseInt(yearStr);
    let week = parseInt(weekPart) + direction;
    if (week < 1) { year--; week = 52; }
    if (week > 52) { year++; week = 1; }
    setCurrentWeek(`${year}-W${String(week).padStart(2, '0')}`);
  };

  // Group unpaid transfers by taxi company
  const groupedByCompany = useMemo(() => {
    const groups: Record<string, { companyName: string; transfers: TaxiTransfer[] }> = {};
    unpaidTransfers.forEach(t => {
      const key = t.taxiCompanyId || 'unassigned';
      if (!groups[key]) {
        groups[key] = { companyName: t.taxiCompanyName || 'Unassigned', transfers: [] };
      }
      groups[key].transfers.push(t);
    });
    return Object.entries(groups).sort(([, a], [, b]) => a.companyName.localeCompare(b.companyName));
  }, [unpaidTransfers]);

  const grandTotal = unpaidTransfers.reduce((sum, t) => sum + (t.amount || 0), 0);

  const handleMarkPaid = async (transferId: string) => {
    await taxiTransfersApi.markFarawayPaid(transferId);
    queryClient.invalidateQueries({ queryKey: ['taxiTransfers'] });
  };

  const handleMarkAllPaid = async (transfers: TaxiTransfer[]) => {
    for (const t of transfers) {
      await taxiTransfersApi.markFarawayPaid(t.id);
    }
    queryClient.invalidateQueries({ queryKey: ['taxiTransfers'] });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
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
          <DollarSign className="h-5 w-5" />
          Taxi Payments
        </h1>
      </div>

      {/* Week selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
        <button
          onClick={() => navigateWeek(-1)}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900">{currentWeek}</p>
          <p className="text-xs text-gray-500">{weekDates.start} - {weekDates.end}</p>
        </div>
        <button
          onClick={() => navigateWeek(1)}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Unpaid transfers (paid by Faraway)</p>
            <p className="text-2xl font-bold text-gray-900">{unpaidTransfers.length}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total outstanding</p>
            <p className="text-2xl font-bold text-red-600">THB {grandTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Grouped by company */}
      {groupedByCompany.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No unpaid transfers. All payments are settled.
        </div>
      ) : (
        groupedByCompany.map(([companyId, group]) => {
          const companyTotal = group.transfers.reduce((sum, t) => sum + (t.amount || 0), 0);
          return (
            <div key={companyId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Company header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{group.companyName}</h3>
                  <p className="text-xs text-gray-500">{group.transfers.length} transfer{group.transfers.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">THB {companyTotal.toLocaleString()}</span>
                  {canManage && (
                    <button
                      onClick={() => handleMarkAllPaid(group.transfers)}
                      className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
                    >
                      Mark All Paid
                    </button>
                  )}
                </div>
              </div>

              {/* Transfers table */}
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Transfer #</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Boat</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {group.transfers.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-mono text-gray-600">{t.transferNumber}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{formatDate(t.pickupDate || t.returnDate)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{t.guestName}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{t.boatName || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">{t.currency} {t.amount?.toLocaleString() || '-'}</td>
                      <td className="px-4 py-2 text-center">
                        {canManage && (
                          <button
                            onClick={() => handleMarkPaid(t.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Mark as paid"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </div>
  );
}
