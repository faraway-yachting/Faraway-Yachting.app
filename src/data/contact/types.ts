/**
 * Contact Types
 *
 * Unified contact management for customers (invoicing) and vendors (expenses).
 * Contacts can be categorized as customer, vendor, or both.
 */

import { Currency } from '@/data/company/types';

export type ContactType = 'customer' | 'vendor' | 'both';

export interface ContactAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Contact {
  id: string;
  name: string; // Company or individual name
  type: ContactType; // customer, vendor, or both
  contactPerson?: string; // Primary contact person name
  email?: string;
  phone?: string;
  website?: string;
  taxId?: string; // Tax ID for invoicing
  billingAddress?: ContactAddress;
  shippingAddress?: ContactAddress;
  defaultCurrency?: Currency;
  paymentTerms?: string; // e.g., "Net 30", "Due on receipt"
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
