export interface CrewConflict {
  type: 'booking_overlap' | 'on_leave';
  message: string;
  bookingId?: string;
  leaveRequestId?: string;
}

interface BookingAssignment {
  bookingId: string;
  bookingNumber?: string;
  title?: string;
  dateFrom: string;
  dateTo: string;
  status: string;
}

interface LeaveEntry {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
}

function datesOverlap(
  aFrom: string,
  aTo: string,
  bFrom: string,
  bTo: string
): boolean {
  return aFrom <= bTo && bFrom <= aTo;
}

export function checkCrewConflicts(
  dateFrom: string,
  dateTo: string,
  existingBookings: BookingAssignment[],
  leaveRequests: LeaveEntry[],
  excludeBookingId?: string
): CrewConflict[] {
  const conflicts: CrewConflict[] = [];

  for (const b of existingBookings) {
    if (excludeBookingId && b.bookingId === excludeBookingId) continue;
    if (b.status === 'cancelled' || b.status === 'completed') continue;
    if (datesOverlap(dateFrom, dateTo, b.dateFrom, b.dateTo)) {
      conflicts.push({
        type: 'booking_overlap',
        message: `Assigned to ${b.bookingNumber || b.title || 'another booking'} (${b.dateFrom} - ${b.dateTo})`,
        bookingId: b.bookingId,
      });
    }
  }

  for (const l of leaveRequests) {
    if (l.status !== 'approved') continue;
    if (datesOverlap(dateFrom, dateTo, l.startDate, l.endDate)) {
      conflicts.push({
        type: 'on_leave',
        message: `On approved leave (${l.startDate} - ${l.endDate})`,
        leaveRequestId: l.id,
      });
    }
  }

  return conflicts;
}
