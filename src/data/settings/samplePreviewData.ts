/**
 * Sample Preview Data for PDF Settings
 *
 * Static mock data used to render the PDF preview in settings page.
 * This provides realistic sample content for visualizing field visibility changes.
 */

import type { Company } from '@/data/company/types';
import type { Contact } from '@/data/contact/types';
import type { BankAccount } from '@/data/banking/types';
import type { LineItem, PricingType } from '@/data/income/types';

// Sample company for preview
export const sampleCompany: Company = {
  id: 'preview-company',
  name: 'Faraway Yachting Company Limited',
  taxId: '0835540002116',
  isVatRegistered: true,
  registeredAddress: {
    street: '40/1 Moo 9 Chaofa Rd, Chalong',
    city: 'Muang Phuket',
    state: 'Phuket',
    postalCode: '83130',
    country: 'Thailand',
  },
  billingAddress: {
    street: '40/1 Moo 9 Chaofa Rd, Chalong',
    city: 'Muang Phuket',
    state: 'Phuket',
    postalCode: '83130',
    country: 'Thailand',
  },
  sameAsBillingAddress: true,
  contactInformation: {
    primaryContactName: 'Oil',
    phoneNumber: '06-123456-23',
    email: 'oil@far-away.net',
  },
  currency: 'THB',
  fiscalYearEnd: '12-31',
  isActive: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

// Sample client for preview
export const sampleClient: Contact = {
  id: 'preview-client',
  type: 'customer',
  name: 'Karen Durbidge',
  contactPerson: 'Karen Durbidge',
  email: 'karen.d@example.com',
  phone: '095-1234567',
  taxId: '1234567890123',
  billingAddress: {
    street: '123 Sample Street',
    city: 'Bangkok',
    state: '',
    postalCode: '10110',
    country: 'Thailand',
  },
  isActive: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

// Sample bank account for preview
export const sampleBankAccount: BankAccount = {
  id: 'preview-bank',
  companyId: 'preview-company',
  accountName: 'Faraway Yachting Co.Ltd.',
  accountNumber: '494-2-00683-2',
  currency: 'THB',
  bankInformation: {
    bankName: 'KBANK',
    bankBranch: 'Phuket Branch',
    bankCountry: 'Thailand',
    swiftBic: 'KASITHBK',
  },
  glAccountCode: '1010',
  openingBalance: 0,
  openingBalanceDate: '2024-01-01',
  isActive: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

// Sample line items for preview
export const sampleLineItems: LineItem[] = [
  {
    id: 'preview-item-1',
    description: 'Boat: Fountaine 75 ft.\nDate: 03 January, 2026\nTime: 9:00 AM to 6:00 PM (9 hours)\nDestination: Coral (Nikorn Beach) + Racha Yai\nNumber of guests: 29 pax (14 adults and 15 children)',
    quantity: 1,
    unitPrice: 92000,
    taxRate: 7,
    whtRate: 3,
    customWhtAmount: undefined,
    amount: 92000,
    accountCode: '',
    projectId: 'project-sample',
  },
];

// Sample quotation data for preview
export interface SampleQuotationData {
  quotationNumber: string;
  dateCreated: string;
  validUntil: string;
  projectId?: string;
  charterPeriodFrom?: string;
  charterPeriodTo?: string;
  lineItems: LineItem[];
  pricingType: PricingType;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  whtAmount: number;
  currency: string;
  termsAndConditions?: string;
}

export const sampleQuotation: SampleQuotationData = {
  quotationNumber: 'QO-2026001',
  dateCreated: '2026-01-02',
  validUntil: '2026-02-01',
  charterPeriodFrom: '2026-01-03',
  charterPeriodTo: '2026-01-03',
  lineItems: sampleLineItems,
  pricingType: 'include_vat',
  subtotal: 85981.31,
  taxAmount: 6018.69,
  totalAmount: 92000,
  whtAmount: 2579.44,
  currency: 'THB',
  termsAndConditions: 'Please note that the booking terms and conditions as outlined on our website apply to this reservation.\nhttps://far-away.net/booking-terms-and-conditions/',
};

// Get sample data for preview
export function getSamplePreviewData() {
  return {
    company: sampleCompany,
    client: sampleClient,
    clientName: sampleClient.name,
    bankAccount: sampleBankAccount,
    quotation: sampleQuotation,
    createdBy: 'Sheila Libardo',
  };
}
