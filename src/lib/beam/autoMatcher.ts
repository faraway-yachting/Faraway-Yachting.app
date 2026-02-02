interface MatchResult {
  transactionId: string;
  bookingId: string;
  confidence: number;
  matchReason: string;
}

interface BookingForMatch {
  id: string;
  projectName?: string;
  externalBoatName?: string;
  dateFrom: string;
  dateTo: string;
  totalPrice?: number;
}

interface TransactionForMatch {
  id: string;
  paymentLinkDescription?: string;
  grossAmount: number;
  transactionDate: string;
}

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function normalizeBoatName(name: string): string {
  let normalized = name
    .replace(/^(SY|MY|MV|SS)\s+/i, '')
    .replace(/\d+\s*(ft\.?|foot)\s*/gi, '')
    .replace(/power\s+catamaran/gi, '')
    .replace(/sailing\s+catamaran/gi, '')
    .replace(/catamaran/gi, '')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return normalized;
}

function extractDateFromDescription(description: string): { month?: number; year?: number; dayFrom?: number; dayTo?: number } {
  const result: { month?: number; year?: number; dayFrom?: number; dayTo?: number } = {};

  // Try patterns like "DD Month YYYY", "Month DD YYYY", "DD to DD Month YYYY", "DD-DD Month YYYY"
  const desc = description.toLowerCase();

  // Find year (4-digit number >= 2020)
  const yearMatch = desc.match(/\b(20[2-9]\d)\b/);
  if (yearMatch) {
    result.year = parseInt(yearMatch[1], 10);
  }

  // Find month name
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (desc.includes(MONTH_NAMES[i])) {
      result.month = i; // 0-based
      break;
    }
  }

  // Find day range: "DD to DD" or "DD-DD"
  const rangeMatch = desc.match(/(\d{1,2})\s*(?:to|-)\s*(\d{1,2})\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)/i);
  if (rangeMatch) {
    result.dayFrom = parseInt(rangeMatch[1], 10);
    result.dayTo = parseInt(rangeMatch[2], 10);
  } else {
    // Single day before month: "DD Month"
    const dayBeforeMonth = desc.match(/(\d{1,2})\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)/i);
    if (dayBeforeMonth) {
      result.dayFrom = parseInt(dayBeforeMonth[1], 10);
    } else {
      // Month DD pattern
      const dayAfterMonth = desc.match(/(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i);
      if (dayAfterMonth) {
        result.dayFrom = parseInt(dayAfterMonth[1], 10);
      }
    }
  }

  return result;
}

function extractBoatNameFromDescription(description: string): string {
  let name = description;

  // Remove "OV" suffix and everything after it if followed by date-like content
  name = name.replace(/\s+OV\s+\d.*/i, '');

  // Remove trailing date patterns: "DD Month YYYY", "Month DD YYYY", "DD to DD Month YYYY", "Month YYYY"
  // Work backwards: remove year and month references from the end
  name = name.replace(/\s+\d{1,2}\s*(?:to|-)\s*\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}$/i, '');
  name = name.replace(/\s+\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}$/i, '');
  name = name.replace(/\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\s+\d{4}$/i, '');
  name = name.replace(/\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}$/i, '');
  name = name.replace(/\s+\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)$/i, '');
  name = name.replace(/\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}$/i, '');

  return name.trim();
}

function dateOverlaps(
  txnDate: { month?: number; year?: number; dayFrom?: number; dayTo?: number },
  bookingFrom: string,
  bookingTo: string
): boolean {
  if (txnDate.month === undefined && txnDate.year === undefined) return false;

  const from = new Date(bookingFrom);
  const to = new Date(bookingTo);

  if (txnDate.year !== undefined && txnDate.month !== undefined && txnDate.dayFrom !== undefined) {
    const dayTo = txnDate.dayTo ?? txnDate.dayFrom;
    const txnStart = new Date(txnDate.year, txnDate.month, txnDate.dayFrom);
    const txnEnd = new Date(txnDate.year, txnDate.month, dayTo);
    // Check overlap: txnStart <= bookingTo && txnEnd >= bookingFrom
    return txnStart <= to && txnEnd >= from;
  }

  if (txnDate.year !== undefined && txnDate.month !== undefined) {
    const monthStart = new Date(txnDate.year, txnDate.month, 1);
    const monthEnd = new Date(txnDate.year, txnDate.month + 1, 0);
    return monthStart <= to && monthEnd >= from;
  }

  return false;
}

function boatNameMatches(descName: string, booking: BookingForMatch): boolean {
  const normalizedDesc = normalizeBoatName(descName);
  if (!normalizedDesc) return false;

  const candidates: string[] = [];
  if (booking.projectName) candidates.push(normalizeBoatName(booking.projectName));
  if (booking.externalBoatName) candidates.push(normalizeBoatName(booking.externalBoatName));

  for (const candidate of candidates) {
    if (!candidate) continue;
    // Exact match
    if (normalizedDesc === candidate) return true;
    // One contains the other
    if (normalizedDesc.includes(candidate) || candidate.includes(normalizedDesc)) return true;
  }

  return false;
}

export function autoMatchTransactions(
  transactions: TransactionForMatch[],
  bookings: BookingForMatch[]
): MatchResult[] {
  const results: MatchResult[] = [];
  const matchedBookingIds = new Set<string>();

  for (const txn of transactions) {
    if (!txn.paymentLinkDescription) continue;

    const boatName = extractBoatNameFromDescription(txn.paymentLinkDescription);
    const dateInfo = extractDateFromDescription(txn.paymentLinkDescription);

    let bestMatch: { booking: BookingForMatch; confidence: number; reason: string } | null = null;

    for (const booking of bookings) {
      if (matchedBookingIds.has(booking.id)) continue;

      const nameMatch = boatNameMatches(boatName, booking);
      const dateMatch = dateOverlaps(dateInfo, booking.dateFrom, booking.dateTo);

      let confidence = 0;
      let reason = '';

      if (nameMatch && dateMatch) {
        confidence = 0.9;
        reason = `Boat name "${boatName}" and date match booking ${booking.dateFrom} to ${booking.dateTo}`;
      } else if (nameMatch) {
        confidence = 0.6;
        reason = `Boat name "${boatName}" matches but date not confirmed`;
      } else if (dateMatch) {
        confidence = 0.3;
        reason = `Date matches booking ${booking.dateFrom} to ${booking.dateTo} but boat name not confirmed`;
      }

      if (confidence > 0 && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = { booking, confidence, reason };
      }
    }

    if (bestMatch) {
      results.push({
        transactionId: txn.id,
        bookingId: bestMatch.booking.id,
        confidence: bestMatch.confidence,
        matchReason: bestMatch.reason,
      });
      if (bestMatch.confidence >= 0.9) {
        matchedBookingIds.add(bestMatch.booking.id);
      }
    }
  }

  return results;
}
