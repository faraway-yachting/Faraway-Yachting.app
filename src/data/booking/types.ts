/**
 * Booking Types
 *
 * Bookings represent charter reservations for yachts.
 * Supports Day Charter, Overnight Charter, and Cabin Charter booking types.
 * Links to Accounting module for receipts, invoices, and expenses.
 */

import { Currency } from '@/data/company/types';

// Booking types aligned with CharterType from income
export type BookingType =
  | 'day_charter'
  | 'overnight_charter'
  | 'cabin_charter';

export type BookingStatus =
  | 'enquiry'    // Initial inquiry
  | 'hold'       // Temporarily reserved (with holdUntil date)
  | 'booked'     // Confirmed booking
  | 'cancelled'  // Cancelled
  | 'completed'; // Charter completed

// Contact channels
export type ContactChannel = 'whatsapp' | 'email' | 'line' | 'phone' | 'other';

// Payment status
export type PaymentStatus = 'unpaid' | 'awaiting_payment' | 'partial' | 'paid';

// Main Booking entity
export interface Booking {
  id: string;
  bookingNumber: string; // FA-YYYYMMXXX format

  // Core booking info
  type: BookingType;
  status: BookingStatus;
  title: string;

  // Dates
  dateFrom: string;
  dateTo: string;
  time?: string;
  holdUntil?: string;

  // Boat/Project
  projectId?: string;
  externalBoatName?: string;

  // Customer info
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  contactChannel?: ContactChannel;
  numberOfGuests?: number;

  // Booking source
  bookingOwner: string;
  bookingOwnerName?: string;
  agentName?: string;
  agentPlatform?: string;
  meetAndGreeter?: string; // Legacy text field
  meetGreeterId?: string; // Reference to meet_greeters table

  // Location
  destination?: string;
  pickupLocation?: string;
  departureFrom?: string;
  arrivalTo?: string;
  charterTime?: string;

  // Financial info
  currency: Currency;
  totalPrice?: number;
  charterFee?: number;
  extraCharges?: number;
  adminFee?: number;
  beamChargeId?: string;
  paymentStatus?: PaymentStatus;
  depositAmount?: number;
  depositDueDate?: string;
  depositPaidDate?: string;
  balanceAmount?: number;
  balanceDueDate?: string;
  balancePaidDate?: string;
  financeNote?: string;
  financeAttachments?: BookingAttachment[];

  // Commission
  commissionRate?: number;
  totalCommission?: number;
  commissionDeduction?: number;
  commissionReceived?: number;

  // Links to Accounting
  depositReceiptId?: string;
  finalReceiptId?: string;
  invoiceId?: string;
  expenseIds?: string[];

  // Extras
  extras?: string[]; // e.g., ['taxi', 'bbq', 'diving']

  // Charter Contract
  contractNote?: string;
  contractAttachments?: BookingAttachment[];

  // Notes
  internalNotes?: string;
  customerNotes?: string;
  internalNoteAttachments?: BookingAttachment[];

  // Section completion tracking
  completedSections?: Record<string, boolean>;

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  updatedByName?: string;
  // Charter expense (external boats)
  charterCost?: number;
  charterCostCurrency?: string;
  charterExpenseStatus?: string;
  linkedExpenseId?: string;
}

// Booking payment record (multiple deposits/balances in multiple currencies)
export interface BookingPayment {
  id: string;
  bookingId: string;
  paymentType: 'deposit' | 'balance';
  amount: number;
  currency: Currency;
  dueDate?: string;
  paidDate?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

// Booking crew assignment
export interface BookingCrew {
  id: string;
  bookingId: string;
  employeeId: string;
  employeeName?: string;
  role?: string;
  createdAt: string;
}

// Booking attachment (stored as JSONB)
export interface BookingAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
}

// Guest/Cabin allocation for cabin charters
export interface BookingGuest {
  id: string;
  bookingId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  nationality?: string;
  passportNumber?: string;
  cabinNumber?: string; // For cabin assignments
  dietaryRequirements?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Status workflow labels
export const bookingStatusLabels: Record<BookingStatus, string> = {
  enquiry: 'Enquiry',
  hold: 'Hold',
  booked: 'Booked',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

// Status colors for calendar display
export const bookingStatusColors: Record<BookingStatus, { bg: string; text: string; border: string }> = {
  enquiry: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  hold: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  booked: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  cancelled: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' },
  completed: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};

// Booking type labels
export const bookingTypeLabels: Record<BookingType, string> = {
  day_charter: 'Day Charter',
  overnight_charter: 'Overnight Charter',
  cabin_charter: 'Cabin Charter',
};

// Agent platforms for dropdown
export const agentPlatforms = [
  'Direct',
  'GetYourGuide',
  'Viator',
  'Klook',
  'Airbnb Experiences',
  'Charter Agency',
  'Hotel Concierge',
  'Other',
] as const;

export type AgentPlatform = typeof agentPlatforms[number];

export const contactChannelLabels: Record<ContactChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  line: 'Line',
  phone: 'Phone',
  other: 'Other',
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  awaiting_payment: 'Awaiting Payment',
  partial: 'Partially Paid',
  paid: 'Paid',
};

// Project Cabin — configurable cabin inventory per yacht
export interface ProjectCabin {
  id: string;
  projectId: string;
  cabinName: string;
  cabinNumber: number;
  position?: string;
  maxGuests: number;
  isEnsuite: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Cabin Allocation — per-cabin booking data within a cabin charter
export type CabinAllocationStatus = 'available' | 'held' | 'booked';

export interface CabinAllocation {
  id: string;
  bookingId: string;
  projectCabinId?: string;
  cabinLabel: string;
  cabinNumber: number;
  status: CabinAllocationStatus;
  // Guest info
  guestNames?: string;
  numberOfGuests: number;
  nationality?: string;
  guestNotes?: string;
  // Booking source (per cabin — direct or agency)
  bookingSourceType?: 'direct' | 'agency';
  // Agent/source (per cabin)
  agentName?: string;
  contactPlatform?: string;
  contactInfo?: string;
  // Booking owner (user/employee ID — same as Booking.bookingOwner)
  bookingOwner?: string;
  // Extras (same as Booking.extras)
  extras?: string[];
  // Charter contract (same as Booking.contractNote/contractAttachments)
  contractNote?: string;
  contractAttachments?: BookingAttachment[];
  // Commission (same as Booking.commissionRate etc.)
  commissionRate?: number;
  totalCommission?: number;
  commissionDeduction?: number;
  commissionReceived?: number;
  // Notes (same as Booking.internalNotes/customerNotes)
  internalNotes?: string;
  internalNoteAttachments?: BookingAttachment[];
  customerNotes?: string;
  // Financial
  price?: number;
  currency: string;
  paymentStatus: PaymentStatus;
  invoiceId?: string;
  receiptId?: string;
  // Completion tracking
  isCompleted?: boolean;

  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const cabinAllocationStatusLabels: Record<CabinAllocationStatus, string> = {
  available: 'Available',
  held: 'Held',
  booked: 'Booked',
};

export const cabinAllocationStatusColors: Record<CabinAllocationStatus, { bg: string; text: string; border: string }> = {
  available: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  held: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  booked: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
};

// Helper to check if booking spans multiple days
export function isMultiDayBooking(booking: Booking): boolean {
  return booking.dateFrom !== booking.dateTo;
}

// Helper to check if booking is for owned yacht vs external
export function isOwnedYachtBooking(booking: Booking): boolean {
  return !!booking.projectId && !booking.externalBoatName;
}

// Helper to get booking duration in days
export function getBookingDurationDays(booking: Booking): number {
  const from = new Date(booking.dateFrom);
  const to = new Date(booking.dateTo);
  const diffTime = Math.abs(to.getTime() - from.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Include both start and end day
}

// Boat color configuration for calendar display
export interface BoatColor {
  id: string; // projectId or 'external' for other boats
  name: string;
  color: string; // Hex color code
}

// Default color palette for boats
export const defaultBoatColors: string[] = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6366F1', // Indigo
];

// Default color for "Other Boat + General"
export const defaultExternalBoatColor = '#64748B'; // Slate
