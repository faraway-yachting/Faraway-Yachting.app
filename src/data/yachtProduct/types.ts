/**
 * Yacht Product Types
 *
 * Products represent charter presets for yachts.
 * Each yacht (own or external) can have multiple products.
 * Used to auto-fill booking form fields when creating new bookings.
 */

import { Currency } from '@/data/company/types';
import { BookingType } from '@/data/booking/types';

// Charter types specifically for products (more granular than booking types)
export type ProductCharterType =
  | 'full_day_charter'
  | 'half_day_charter'
  | 'overnight_charter'
  | 'cabin_charter'
  | 'bareboat_charter'
  | 'other_charter';

export const productCharterTypeLabels: Record<ProductCharterType, string> = {
  full_day_charter: 'Full Day Charter',
  half_day_charter: 'Half Day Charter',
  overnight_charter: 'Overnight Charter',
  cabin_charter: 'Cabin Charter',
  bareboat_charter: 'Bareboat Charter',
  other_charter: 'Other',
};

// Yacht source discriminator
export type YachtSource = 'own' | 'external';

// Duration presets for dropdown
export const durationPresets = [
  { value: 'Full Day (8 hours)', label: 'Full Day (8 hours)' },
  { value: 'Half Day (4 hours)', label: 'Half Day (4 hours)' },
  { value: '1 Night', label: '1 Night' },
  { value: '2 Nights', label: '2 Nights' },
  { value: '3 Nights', label: '3 Nights' },
  { value: '1 Week', label: '1 Week' },
] as const;

export type DurationPreset = (typeof durationPresets)[number]['value'];

// Marina presets for dropdown (same as Settings page)
export const marinaPresets = [
  'Ao Po Grand Marina',
  'Royal Phuket Marina',
  'Yacht Haven Marina',
  'Boat Lagoon Marina',
  'Chalong Pier',
] as const;

export type MarinaPreset = (typeof marinaPresets)[number];

/**
 * Yacht Product entity
 */
export interface YachtProduct {
  id: string;

  // Yacht Reference (discriminated union)
  yachtSource: YachtSource;
  projectId?: string; // For own yachts (links to projects table)
  externalYachtId?: string; // For external yachts (localStorage ID)

  // Product Details
  name: string; // Display name (e.g., "Full Day Phi Phi")
  charterType: ProductCharterType;
  duration: string; // Preset or custom text
  departFrom?: string; // Marina location
  destination?: string; // Charter destination

  // Pricing
  price?: number;
  currency: Currency;

  // Default time
  defaultTime?: string; // e.g., "09:00 - 17:00"

  // Status
  displayOrder: number;
  isActive: boolean;

  // Notes
  notes?: string;

  // Metadata
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Map product charter type to booking type
 * Used when creating a booking from a product preset
 */
export function productCharterTypeToBookingType(
  productType: ProductCharterType
): BookingType {
  switch (productType) {
    case 'full_day_charter':
    case 'half_day_charter':
    case 'other_charter':
      return 'day_charter';
    case 'overnight_charter':
    case 'bareboat_charter':
      return 'overnight_charter';
    case 'cabin_charter':
      return 'cabin_charter';
  }
}

/**
 * Map booking type to possible product charter types
 * Used when filtering products based on selected booking type
 */
export function bookingTypeToProductCharterTypes(
  bookingType: BookingType
): ProductCharterType[] {
  switch (bookingType) {
    case 'day_charter':
      return ['full_day_charter', 'half_day_charter', 'other_charter'];
    case 'overnight_charter':
      return ['overnight_charter', 'bareboat_charter'];
    case 'cabin_charter':
      return ['cabin_charter'];
  }
}

/**
 * Check if a duration is a preset value
 */
export function isDurationPreset(duration: string): duration is DurationPreset {
  return durationPresets.some(preset => preset.value === duration);
}

/**
 * Check if a marina is a preset value
 */
export function isMarinaPreset(marina: string): marina is MarinaPreset {
  return marinaPresets.includes(marina as MarinaPreset);
}
