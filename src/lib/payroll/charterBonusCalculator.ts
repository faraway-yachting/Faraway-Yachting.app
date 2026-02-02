/**
 * Charter Bonus Calculator
 *
 * Calculates crew charter bonuses based on booking dates and employee rates.
 *
 * Rules:
 * - Single-day charter: hours = endTime - startTime
 *   - ≤4 hrs → half_day rate
 *   - 5-8 hrs → full_day rate
 *   - >8 hrs → full_day rate + (hours - 8) × hourly extra
 * - Multi-day charter:
 *   - All days except last → overnight rate
 *   - Last day: hours from 07:00 to endTime
 *     - ≤4 hrs → half_day, 5-8 hrs → full_day, >8 hrs → full_day + extra
 * - Hourly extra = full_day_rate / 8
 * - Season: Nov-Apr = high, May-Oct = low
 */

export type CharterDayType = 'overnight' | 'full_day' | 'half_day';

export interface CharterDay {
  date: string;
  type: CharterDayType;
  hours: number;
  rate: number;
  extraHours: number;
  extraAmount: number;
  extraRemark: string;
  deductionAmount: number;
  deductionReason: string;
  total: number;
}

export interface CharterRates {
  half_day: number;
  full_day: number;
  overnight: number;
}

export interface CharterBonusResult {
  days: CharterDay[];
  total: number;
}

function parseTime(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1], 10) + parseInt(match[2], 10) / 60;
}

/** Parse "HH:MM - HH:MM" time range into start/end hours */
function parseTimeRange(timeRange: string | null | undefined): { start: number | null; end: number | null } {
  if (!timeRange) return { start: null, end: null };
  const parts = timeRange.split('-').map(s => s.trim());
  if (parts.length !== 2) return { start: null, end: null };
  return { start: parseTime(parts[0]), end: parseTime(parts[1]) };
}

function classifyHours(
  hours: number,
  rates: CharterRates,
): { type: CharterDayType; rate: number; extraHours: number; extraAmount: number; total: number } {
  const hourlyExtra = rates.full_day / 8;
  if (hours <= 4) {
    return { type: 'half_day', rate: rates.half_day, extraHours: 0, extraAmount: 0, total: rates.half_day };
  } else if (hours <= 8) {
    return { type: 'full_day', rate: rates.full_day, extraHours: 0, extraAmount: 0, total: rates.full_day };
  } else {
    const extra = hours - 8;
    const extraAmt = Math.round(extra * hourlyExtra * 100) / 100;
    return { type: 'full_day', rate: rates.full_day, extraHours: extra, extraAmount: extraAmt, total: rates.full_day + extraAmt };
  }
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  const ry = date.getFullYear();
  const rm = String(date.getMonth() + 1).padStart(2, '0');
  const rd = String(date.getDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
}

function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  const a = new Date(y1, m1 - 1, d1);
  const b = new Date(y2, m2 - 1, d2);
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function calculateCharterBonus(
  dateFrom: string,
  dateTo: string,
  timeRange: string | null | undefined,
  rates: CharterRates,
): CharterBonusResult {
  const totalDays = daysBetween(dateFrom, dateTo);
  const days: CharterDay[] = [];
  const { start: parsedStart, end: parsedEnd } = parseTimeRange(timeRange);

  if (totalDays <= 0) return { days: [], total: 0 };

  if (totalDays === 1) {
    // Single-day charter
    const start = parsedStart ?? 9;
    const end = parsedEnd ?? 17;
    const hours = Math.max(0, end - start);
    const classification = classifyHours(hours, rates);
    days.push({ date: dateFrom, hours, ...classification, extraRemark: classification.extraHours > 0 ? `${classification.extraHours}h overtime` : '', deductionAmount: 0, deductionReason: '' });
  } else {
    // Multi-day charter
    // Days 1 to N-1: overnight
    for (let i = 0; i < totalDays - 1; i++) {
      const date = addDays(dateFrom, i);
      days.push({
        date,
        type: 'overnight',
        hours: 24,
        rate: rates.overnight,
        extraHours: 0,
        extraAmount: 0,
        extraRemark: '',
        deductionAmount: 0,
        deductionReason: '',
        total: rates.overnight,
      });
    }

    // Last day: hours from 07:00 to endTime
    const lastDate = addDays(dateFrom, totalDays - 1);
    const end = parsedEnd ?? 12;
    const hours = Math.max(0, end - 7);
    const classification = classifyHours(hours, rates);
    days.push({ date: lastDate, hours, ...classification, extraRemark: classification.extraHours > 0 ? `${classification.extraHours}h overtime` : '', deductionAmount: 0, deductionReason: '' });
  }

  const total = days.reduce((sum, d) => sum + d.total, 0);
  return { days, total: Math.round(total * 100) / 100 };
}

export function getSeason(month: number): 'high' | 'low' {
  return (month >= 11 || month <= 4) ? 'high' : 'low';
}
