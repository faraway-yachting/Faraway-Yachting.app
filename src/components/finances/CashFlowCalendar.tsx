'use client';

import { useMemo, useState } from 'react';
import { DailyCashFlow, CashFlowTransaction } from '@/data/finances/types';
import type { Currency } from '@/data/company/types';

interface CashFlowCalendarProps {
  year: number;
  month: number;
  dailyData: DailyCashFlow[];
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Currency symbols
const CURRENCY_SYMBOLS: Record<string, string> = {
  THB: '฿',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SGD: 'S$',
  AED: 'د.إ',
};

function getCurrencySymbol(currency: Currency | string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

function formatAmount(amount: number, currency: Currency | string = 'THB'): string {
  const absAmount = Math.abs(amount);
  const symbol = getCurrencySymbol(currency);
  if (absAmount >= 1000000) {
    return `${symbol}${(absAmount / 1000000).toFixed(1)}M`;
  }
  if (absAmount >= 1000) {
    return `${symbol}${(absAmount / 1000).toFixed(0)}K`;
  }
  return `${symbol}${absAmount.toFixed(0)}`;
}

interface DayModalProps {
  date: string;
  transactions: CashFlowTransaction[];
  onClose: () => void;
}

function DayModal({ date, transactions, onClose }: DayModalProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Group totals by currency
  const totalsByCurrency = useMemo(() => {
    const map = new Map<string, { totalIn: number; totalOut: number }>();
    transactions.forEach((t) => {
      const currency = t.currency || 'THB';
      const existing = map.get(currency) || { totalIn: 0, totalOut: 0 };
      if (t.type === 'in') {
        existing.totalIn += t.amount;
      } else {
        existing.totalOut += t.amount;
      }
      map.set(currency, existing);
    });
    return map;
  }, [transactions]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{formattedDate}</h3>
          <div className="flex flex-wrap gap-4 mt-2 text-sm">
            {Array.from(totalsByCurrency.entries()).map(([currency, totals]) => {
              const symbol = getCurrencySymbol(currency);
              const net = totals.totalIn - totals.totalOut;
              return (
                <div key={currency} className="flex gap-2">
                  <span className="text-gray-500 font-medium">{currency}:</span>
                  <span className="text-green-600">+{symbol}{totals.totalIn.toLocaleString()}</span>
                  <span className="text-red-600">-{symbol}{totals.totalOut.toLocaleString()}</span>
                  <span className={net >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ({net >= 0 ? '+' : ''}{symbol}{net.toLocaleString()})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No transactions</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Description</th>
                  <th className="pb-2">Document</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((t) => {
                  const symbol = getCurrencySymbol(t.currency || 'THB');
                  return (
                    <tr key={t.id} className="text-sm">
                      <td className="py-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            t.type === 'in'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {t.type === 'in' ? 'IN' : 'OUT'}
                        </span>
                      </td>
                      <td className="py-2 text-gray-900">{t.description}</td>
                      <td className="py-2 text-gray-500">{t.sourceDocument || '-'}</td>
                      <td className={`py-2 text-right font-medium ${
                        t.type === 'in' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {t.type === 'in' ? '+' : '-'}{symbol}{t.amount.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function CashFlowCalendar({ year, month, dailyData }: CashFlowCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<DailyCashFlow | null>(null);

  // Create a map for quick lookup
  const dataMap = useMemo(() => {
    const map = new Map<string, DailyCashFlow>();
    dailyData.forEach(d => map.set(d.date, d));
    return map;
  }, [dailyData]);

  // Calculate calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();

    // Get day of week (0 = Sunday, adjust to Monday = 0)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    const days: Array<{ date: string; dayOfMonth: number; isCurrentMonth: boolean } | null> = [];

    // Add empty cells for days before the month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({ date, dayOfMonth: day, isCurrentMonth: true });
    }

    return days;
  }, [year, month]);

  // Get transactions grouped by currency for a day
  const getDayDisplayData = (dayData: DailyCashFlow | undefined) => {
    if (!dayData || dayData.transactions.length === 0) return null;

    // Group by currency
    const byCurrency = new Map<string, { totalIn: number; totalOut: number }>();
    dayData.transactions.forEach((t) => {
      const currency = t.currency || 'THB';
      const existing = byCurrency.get(currency) || { totalIn: 0, totalOut: 0 };
      if (t.type === 'in') {
        existing.totalIn += t.amount;
      } else {
        existing.totalOut += t.amount;
      }
      byCurrency.set(currency, existing);
    });

    return Array.from(byCurrency.entries()).map(([currency, totals]) => ({
      currency,
      netMovement: totals.totalIn - totals.totalOut,
    }));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Calendar Header */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          if (!day) {
            return (
              <div
                key={`empty-${index}`}
                className="min-h-[80px] bg-gray-50 border-b border-r border-gray-100"
              />
            );
          }

          const dayData = dataMap.get(day.date);
          const hasTransactions = dayData && dayData.transactions.length > 0;
          const currencyData = getDayDisplayData(dayData);

          return (
            <div
              key={day.date}
              onClick={() => hasTransactions && setSelectedDay(dayData)}
              className={`
                min-h-[80px] p-2 border-b border-r border-gray-100 transition-colors
                ${hasTransactions ? 'cursor-pointer hover:bg-gray-50' : ''}
              `}
            >
              {/* Day number */}
              <div className="text-sm font-medium text-gray-900 mb-1">
                {day.dayOfMonth}
              </div>

              {/* Net movement per currency */}
              {currencyData && currencyData.map(({ currency, netMovement }) => (
                <div
                  key={currency}
                  className={`text-sm font-semibold ${
                    netMovement > 0
                      ? 'text-green-600'
                      : netMovement < 0
                      ? 'text-red-600'
                      : 'text-gray-400'
                  }`}
                >
                  {netMovement > 0 ? '+' : ''}
                  {formatAmount(netMovement, currency)}
                </div>
              ))}

              {/* Transaction count */}
              {hasTransactions && (
                <div className="text-xs text-gray-400 mt-0.5">
                  {dayData.transactions.length} txn
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <DayModal
          date={selectedDay.date}
          transactions={selectedDay.transactions}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}
