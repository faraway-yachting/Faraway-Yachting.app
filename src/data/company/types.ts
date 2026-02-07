/**
 * Company Data Types
 *
 * Defines the data structure for multi-company management.
 * Companies can be used across Accounting, Invoicing, Tax Reporting, and Shareholder Reporting.
 */

export type KnownCurrency = 'THB' | 'EUR' | 'USD' | 'SGD' | 'GBP' | 'AED';
export type Currency = KnownCurrency | (string & {});

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ContactInformation {
  primaryContactName: string;
  phoneNumber: string;
  email: string;
}

export interface Company {
  id: string;
  name: string;
  taxId: string; // TEXT field - supports non-numeric formats (e.g., "GB-123", "DE/456/789")
  registeredAddress: Address;
  billingAddress: Address;
  sameAsBillingAddress: boolean; // Checkbox state for address sync
  contactInformation: ContactInformation;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Optional fields for future use
  currency?: Currency;
  fiscalYearEnd?: string; // Format: "YYYY-MM-DD"
  logoUrl?: string;
  // VAT registration
  isVatRegistered?: boolean;
  vatRate?: number; // VAT rate as percentage (e.g., 7 for 7%)
}
