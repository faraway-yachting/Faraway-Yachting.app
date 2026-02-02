'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronDown, ChevronUp, Check, Edit2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { calculateCharterBonus, getSeason, type CharterDay, type CharterRates } from '@/lib/payroll/charterBonusCalculator';

interface EmployeeBonus {
  employeeId: string;
  employeeName: string;
  position: string;
  rates: CharterRates;
  bookings: BookingBonus[];
  total: number;
}

interface BookingBonus {
  bookingId: string;
  boatName: string;
  dateFrom: string;
  dateTo: string;
  timeRange: string | null;
  charterType: string;
  days: CharterDay[];
  total: number;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CharterBonusSummary() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeeBonus[]>([]);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<{ empId: string; bookingIdx: number; dayIdx: number } | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setApplied(false);
    try {
      const supabase = createClient();
      const season = getSeason(month);
      const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const periodEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      // Get bookings in this period with crew
      const { data: bookingCrew } = await (supabase as any)
        .from('booking_crew')
        .select('employee_id, booking_id, bookings!inner(id, date_from, date_to, type, time, project_id, projects:project_id(name))')
        .gte('bookings.date_from', periodStart)
        .lte('bookings.date_from', periodEnd);

      if (!bookingCrew || bookingCrew.length === 0) {
        setEmployees([]);
        setLoading(false);
        return;
      }

      // Get unique employee IDs
      const empIds = [...new Set(bookingCrew.map((bc: any) => bc.employee_id))] as string[];

      // Get employee details
      const { data: emps } = await (supabase as any)
        .from('employees')
        .select('id, full_name_en, position')
        .in('id', empIds);

      // Get charter rates for these employees
      const { data: allRates } = await (supabase as any)
        .from('employee_charter_rates')
        .select('*')
        .in('employee_id', empIds)
        .eq('season', season);

      // Build per-employee data
      const result: EmployeeBonus[] = [];

      for (const emp of (emps || [])) {
        const empRates = (allRates || []).filter((r: any) => r.employee_id === emp.id);
        const rates: CharterRates = {
          half_day: Number(empRates.find((r: any) => r.charter_rate_type === 'half_day')?.rate_amount) || 0,
          full_day: Number(empRates.find((r: any) => r.charter_rate_type === 'full_day')?.rate_amount) || 0,
          overnight: Number(empRates.find((r: any) => r.charter_rate_type === 'overnight')?.rate_amount) || 0,
        };

        const empBookings = bookingCrew.filter((bc: any) => bc.employee_id === emp.id);
        const bookings: BookingBonus[] = [];

        for (const bc of empBookings) {
          const b = bc.bookings;
          if (!b) continue;
          const boatName = b.projects?.name || 'External Boat';
          const bonus = calculateCharterBonus(
            b.date_from,
            b.date_to || b.date_from,
            b.time,
            rates,
          );
          bookings.push({
            bookingId: b.id,
            boatName,
            dateFrom: b.date_from,
            dateTo: b.date_to || b.date_from,
            timeRange: b.time || null,
            charterType: b.type,
            days: bonus.days,
            total: bonus.total,
          });
        }

        const total = bookings.reduce((sum, bk) => sum + bk.total, 0);
        result.push({
          employeeId: emp.id,
          employeeName: emp.full_name_en || 'Unknown',
          position: emp.position || '-',
          rates,
          bookings,
          total,
        });
      }

      result.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
      setEmployees(result);
    } catch (err) {
      console.error('Failed to load charter bonus data:', err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateDay = (empId: string, bookingIdx: number, dayIdx: number, changes: Partial<CharterDay>) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.employeeId !== empId) return emp;
      const updated = { ...emp, bookings: [...emp.bookings] };
      const booking = { ...updated.bookings[bookingIdx], days: [...updated.bookings[bookingIdx].days] };
      const day = { ...booking.days[dayIdx], ...changes };

      // If type changed, recalculate rate
      if (changes.type) {
        const rate = changes.type === 'overnight' ? emp.rates.overnight : changes.type === 'full_day' ? emp.rates.full_day : emp.rates.half_day;
        day.rate = rate;
        if (changes.type === 'overnight' || changes.type === 'half_day') {
          day.extraHours = 0;
          day.extraAmount = 0;
        }
      }

      day.total = day.rate + day.extraAmount - day.deductionAmount;
      booking.days[dayIdx] = day;
      booking.total = booking.days.reduce((s, d) => s + d.total, 0);
      updated.bookings[bookingIdx] = booking;
      updated.total = updated.bookings.reduce((s, b) => s + b.total, 0);
      return updated;
    }));
  };

  const handleDayTypeChange = (empId: string, bookingIdx: number, dayIdx: number, newType: CharterDay['type']) => {
    updateDay(empId, bookingIdx, dayIdx, { type: newType });
    setEditingDay(null);
  };

  const applyToPayroll = async () => {
    setApplying(true);
    try {
      const supabase = createClient();

      // Find or check for existing payroll run for this period
      const { data: runs } = await (supabase as any)
        .from('payroll_runs')
        .select('id')
        .eq('period_year', year)
        .eq('period_month', month)
        .limit(1);

      if (!runs || runs.length === 0) {
        alert('No payroll run found for this period. Please create a payroll run first.');
        setApplying(false);
        return;
      }

      const runId = runs[0].id;

      // Update charter_bonus and earnings_detail for each employee's payroll slip
      for (const emp of employees) {
        if (emp.total <= 0) continue;

        const earningsDetail = emp.bookings.map(b => ({
          label: `${b.boatName} (${b.dateFrom} - ${b.dateTo})`,
          amount: b.total,
          booking_id: b.bookingId,
        }));

        const { error } = await (supabase as any)
          .from('payroll_slips')
          .update({
            charter_bonus: emp.total,
            earnings_detail: earningsDetail,
            updated_at: new Date().toISOString(),
          })
          .eq('payroll_run_id', runId)
          .eq('employee_id', emp.employeeId);

        if (error) console.error(`Failed to update slip for ${emp.employeeName}:`, error);
      }

      setApplied(true);
    } catch (err) {
      console.error('Failed to apply to payroll:', err);
      alert('Failed to apply charter bonuses to payroll.');
    } finally {
      setApplying(false);
    }
  };

  const formatMoney = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const typeLabel = (t: string) => t === 'overnight' ? 'Overnight' : t === 'full_day' ? 'Full Day' : 'Half Day';

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#5A7A8F]"
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#5A7A8F]"
        >
          {[year - 1, year, year + 1].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          onClick={applyToPayroll}
          disabled={applying || applied || employees.length === 0}
          className={`ml-auto inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            applied
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-[#5A7A8F] text-white hover:bg-[#4a6a7f] disabled:opacity-50'
          }`}
        >
          {applied ? <><Check className="h-4 w-4" /> Applied</> : applying ? <><Loader2 className="h-4 w-4 animate-spin" /> Applying...</> : 'Apply to Payroll'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : employees.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-12">No charter bookings with crew found for this period.</p>
      ) : (
        <div className="space-y-4">
          {employees.map(emp => (
            <div key={emp.employeeId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Employee header */}
              <button
                onClick={() => setExpandedEmployee(expandedEmployee === emp.employeeId ? null : emp.employeeId)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <span className="font-semibold text-gray-900">{emp.employeeName}</span>
                    <span className="ml-2 text-sm text-gray-500">{emp.position}</span>
                  </div>
                  <span className="text-xs text-gray-400">{emp.bookings.length} charter{emp.bookings.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-[#5A7A8F]">{formatMoney(emp.total)} THB</span>
                  {expandedEmployee === emp.employeeId ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </button>

              {/* Expanded detail */}
              {expandedEmployee === emp.employeeId && (
                <div className="border-t border-gray-100 px-5 pb-5 space-y-4">
                  {/* Rates reference */}
                  <div className="flex gap-4 text-xs text-gray-500 pt-3">
                    <span>Half Day: {formatMoney(emp.rates.half_day)}</span>
                    <span>Full Day: {formatMoney(emp.rates.full_day)}</span>
                    <span>Overnight: {formatMoney(emp.rates.overnight)}</span>
                    <span className="text-gray-400">({getSeason(month)} season)</span>
                  </div>

                  {emp.bookings.map((bk, bkIdx) => (
                    <div key={bk.bookingId} className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900 text-sm">{bk.boatName}</span>
                          <span className="ml-2 text-xs text-gray-500">{bk.dateFrom} - {bk.dateTo}</span>
                          <span className="ml-2 text-xs text-gray-400">({bk.charterType.replace('_', ' ')})</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{formatMoney(bk.total)}</span>
                      </div>

                      {/* Day-by-day breakdown */}
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-200">
                            <th className="text-left py-1 font-medium">Date</th>
                            <th className="text-left py-1 font-medium">Type</th>
                            <th className="text-right py-1 font-medium">Hours</th>
                            <th className="text-right py-1 font-medium">Rate</th>
                            <th className="text-right py-1 font-medium">Extra</th>
                            <th className="text-right py-1 font-medium">Deduction</th>
                            <th className="text-right py-1 font-medium">Total</th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {bk.days.map((day, dayIdx) => {
                            const isEditing = editingDay?.empId === emp.employeeId && editingDay?.bookingIdx === bkIdx && editingDay?.dayIdx === dayIdx;
                            return (
                              <React.Fragment key={day.date}>
                                <tr className="border-b border-gray-100">
                                  <td className="py-1.5 text-gray-700">{day.date}</td>
                                  <td className="py-1.5">
                                    {isEditing ? (
                                      <select
                                        value={day.type}
                                        onChange={e => handleDayTypeChange(emp.employeeId, bkIdx, dayIdx, e.target.value as CharterDay['type'])}
                                        className="px-1 py-0.5 border border-gray-300 rounded text-xs"
                                      >
                                        <option value="overnight">Overnight</option>
                                        <option value="full_day">Full Day</option>
                                        <option value="half_day">Half Day</option>
                                      </select>
                                    ) : (
                                      <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                                        day.type === 'overnight' ? 'bg-indigo-100 text-indigo-700' :
                                        day.type === 'full_day' ? 'bg-blue-100 text-blue-700' :
                                        'bg-amber-100 text-amber-700'
                                      }`}>
                                        {typeLabel(day.type)}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-1.5 text-right text-gray-600">{day.hours.toFixed(1)}</td>
                                  <td className="py-1.5 text-right text-gray-600">{formatMoney(day.rate)}</td>
                                  <td className="py-1.5 text-right text-gray-500">
                                    {day.extraAmount > 0 ? (
                                      <span title={day.extraRemark || undefined}>+{formatMoney(day.extraAmount)}{day.extraRemark ? ` (${day.extraRemark})` : ''}</span>
                                    ) : '-'}
                                  </td>
                                  <td className="py-1.5 text-right">
                                    {day.deductionAmount > 0 ? (
                                      <span className="text-red-600" title={day.deductionReason || undefined}>-{formatMoney(day.deductionAmount)}{day.deductionReason ? ` (${day.deductionReason})` : ''}</span>
                                    ) : '-'}
                                  </td>
                                  <td className="py-1.5 text-right font-medium text-gray-800">{formatMoney(day.total)}</td>
                                  <td className="py-1.5 text-center">
                                    <button
                                      onClick={() => setEditingDay(isEditing ? null : { empId: emp.employeeId, bookingIdx: bkIdx, dayIdx })}
                                      className={`${isEditing ? 'text-[#5A7A8F]' : 'text-gray-400 hover:text-gray-600'}`}
                                      title="Edit day"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                  </td>
                                </tr>
                                {/* Inline edit row */}
                                {isEditing && (
                                  <tr className="bg-blue-50/50 border-b border-gray-100">
                                    <td colSpan={8} className="px-2 py-2">
                                      <div className="flex flex-wrap gap-3 items-end text-xs">
                                        <div className="flex items-center gap-1.5">
                                          <label className="text-gray-500 font-medium">Extra:</label>
                                          <input
                                            type="number"
                                            value={day.extraAmount}
                                            onChange={e => updateDay(emp.employeeId, bkIdx, dayIdx, { extraAmount: Math.max(0, Number(e.target.value) || 0) })}
                                            className="w-20 px-1.5 py-0.5 border border-gray-300 rounded text-xs"
                                            min="0"
                                            step="0.01"
                                          />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <label className="text-gray-500 font-medium">Remark:</label>
                                          <input
                                            type="text"
                                            value={day.extraRemark}
                                            onChange={e => updateDay(emp.employeeId, bkIdx, dayIdx, { extraRemark: e.target.value })}
                                            className="w-36 px-1.5 py-0.5 border border-gray-300 rounded text-xs"
                                            placeholder="Reason for extra"
                                          />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <label className="text-red-500 font-medium">Deduction:</label>
                                          <input
                                            type="number"
                                            value={day.deductionAmount}
                                            onChange={e => updateDay(emp.employeeId, bkIdx, dayIdx, { deductionAmount: Math.max(0, Number(e.target.value) || 0) })}
                                            className="w-20 px-1.5 py-0.5 border border-gray-300 rounded text-xs"
                                            min="0"
                                            step="0.01"
                                          />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <label className="text-red-500 font-medium">Reason:</label>
                                          <input
                                            type="text"
                                            value={day.deductionReason}
                                            onChange={e => updateDay(emp.employeeId, bkIdx, dayIdx, { deductionReason: e.target.value })}
                                            className="w-36 px-1.5 py-0.5 border border-gray-300 rounded text-xs"
                                            placeholder="Reason for deduction"
                                          />
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Grand total */}
          <div className="bg-[#5A7A8F]/10 border border-[#5A7A8F]/20 rounded-lg px-5 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Grand Total</span>
            <span className="text-lg font-bold text-[#5A7A8F]">{formatMoney(employees.reduce((s, e) => s + e.total, 0))} THB</span>
          </div>
        </div>
      )}
    </div>
  );
}
