/**
 * Taxi Transfer Types
 *
 * Taxi transfers manage ground transportation for charter guests.
 * Supports pickup-only, return-only, or round-trip transfers.
 * Links optionally to bookings for auto-fill of guest/boat data.
 */

export type TripType = 'pickup_only' | 'return_only' | 'round_trip';
export type TransferStatus = 'pending' | 'confirmed' | 'assigned' | 'completed' | 'cancelled';
export type PaidBy = 'guest' | 'agency' | 'faraway';

export interface TaxiTransfer {
  id: string;
  transferNumber: string; // TX-YYYYMMXXX format

  // Link to booking (optional)
  bookingId?: string;

  // Transfer type and status
  tripType: TripType;
  status: TransferStatus;

  // Guest info
  boatName?: string;
  guestName: string;
  contactNumber?: string;
  numberOfGuests?: number;

  // Pickup leg
  pickupDate?: string;
  pickupTime?: string;
  pickupLocation?: string;
  pickupLocationUrl?: string;
  pickupDropoff?: string;
  pickupDropoffUrl?: string;

  // Return leg
  returnDate?: string;
  returnTime?: string;
  returnLocation?: string;
  returnLocationUrl?: string;
  returnDropoff?: string;
  returnDropoffUrl?: string;

  // Taxi company assignment
  taxiCompanyId?: string;
  taxiCompanyName?: string; // joined from taxi_companies

  // Driver info (filled after taxi company confirms)
  driverName?: string;
  driverPhone?: string;
  vanNumberPlate?: string;

  // Payment
  paidBy: PaidBy;
  amount?: number;
  currency: string;
  paymentNote?: string;
  farawayPaid: boolean;
  farawayPaidDate?: string;
  farawayPaidWeek?: string;

  // Notes
  guestNote?: string;
  driverNote?: string;

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaxiCompany {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  lineId?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaxiPublicLink {
  id: string;
  token: string;
  label: string;
  taxiCompanyId: string;
  isActive: boolean;
  expiresAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaxiGuestNoteTemplate {
  id: string;
  name: string;
  contentEn?: string;
  contentTh?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Labels
export const tripTypeLabels: Record<TripType, string> = {
  pickup_only: 'Pick-up Only',
  return_only: 'Return Only',
  round_trip: 'Round Trip',
};

export const transferStatusLabels: Record<TransferStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  assigned: 'Driver Assigned',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const transferStatusColors: Record<TransferStatus, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  confirmed: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  assigned: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  completed: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-200' },
};

export const paidByLabels: Record<PaidBy, string> = {
  guest: 'Guest',
  agency: 'Agency',
  faraway: 'Faraway',
};
