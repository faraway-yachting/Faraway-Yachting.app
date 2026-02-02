import { Booking } from '@/data/booking/types';

export interface ConflictResult {
  hasHardConflict: boolean;
  hasSoftConflict: boolean;
  conflicts: Booking[];
  message: string;
}

/**
 * Parse a free-text time range like "09:00 - 17:00" into start/end minutes since midnight.
 * Returns null if unparseable.
 */
export function parseTimeRange(time: string | undefined): { startMin: number; endMin: number } | null {
  if (!time) return null;
  const match = time.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const startMin = parseInt(match[1]) * 60 + parseInt(match[2]);
  const endMin = parseInt(match[3]) * 60 + parseInt(match[4]);
  if (startMin >= endMin) return null; // invalid range
  return { startMin, endMin };
}

/**
 * Check if two time ranges overlap.
 * If either is null (unparseable/missing), treat as full day → always overlaps.
 */
export function checkTimeOverlap(
  timeA: string | undefined,
  timeB: string | undefined
): boolean {
  const a = parseTimeRange(timeA);
  const b = parseTimeRange(timeB);
  // If either is unparseable, treat as full day → overlaps
  if (!a || !b) return true;
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

/**
 * Check if a hold booking has expired based on its holdUntil date.
 */
function isHoldExpired(booking: Booking): boolean {
  if (!booking.holdUntil) return false; // no expiry set → not expired
  const today = new Date().toISOString().split('T')[0];
  return booking.holdUntil < today;
}

/**
 * Classify conflicts between a new/edited booking and existing bookings.
 * existingBookings should already be filtered to same boat + overlapping dates + hold/booked status.
 *
 * Rules:
 * - Existing "booked" + time overlap → HARD BLOCK (cannot add any new booking)
 * - Existing "hold" (not expired) + time overlap → HARD BLOCK
 * - Existing "hold" (expired) → ignored (treat as if it doesn't exist)
 * - Same date, different/no time overlap → SOFT WARNING (confirm dialog)
 * - Existing "enquiry" + same date → SOFT WARNING
 */
export function classifyConflicts(
  newBooking: Partial<Booking>,
  existingBookings: Booking[]
): ConflictResult {
  if (existingBookings.length === 0) {
    return { hasHardConflict: false, hasSoftConflict: false, conflicts: [], message: '' };
  }

  const newTime = newBooking.time;
  const hardConflicts: Booking[] = [];
  const softConflicts: Booking[] = [];

  for (const existing of existingBookings) {
    // Skip expired holds
    if (existing.status === 'hold' && isHoldExpired(existing)) {
      continue;
    }

    const existingTime = existing.time;
    const timeOverlaps = checkTimeOverlap(newTime, existingTime);

    if (existing.status === 'booked' && timeOverlaps) {
      // Booked + time overlap → hard block
      hardConflicts.push(existing);
    } else if (existing.status === 'hold' && timeOverlaps) {
      // Active hold + time overlap → hard block
      hardConflicts.push(existing);
    } else {
      // Same date but different time, or enquiry → soft warning
      softConflicts.push(existing);
    }
  }

  if (hardConflicts.length > 0) {
    const b = hardConflicts[0];
    const time = b.time || 'full day';
    const statusLabel = b.status === 'hold'
      ? `on hold${b.holdUntil ? ` until ${b.holdUntil}` : ''}`
      : 'confirmed (booked)';
    return {
      hasHardConflict: true,
      hasSoftConflict: false,
      conflicts: hardConflicts,
      message: `This boat is already ${statusLabel} for this period. There is a booking on ${b.dateFrom}${b.dateFrom !== b.dateTo ? ` - ${b.dateTo}` : ''} (${time}). Please choose a different date or time.`,
    };
  }

  if (softConflicts.length > 0) {
    const b = softConflicts[0];
    const time = b.time || 'full day';
    return {
      hasHardConflict: false,
      hasSoftConflict: true,
      conflicts: softConflicts,
      message: `There is an existing booking for this boat on ${b.dateFrom}${b.dateFrom !== b.dateTo ? ` - ${b.dateTo}` : ''} (${time}). Do you want to proceed?`,
    };
  }

  return { hasHardConflict: false, hasSoftConflict: false, conflicts: [], message: '' };
}
