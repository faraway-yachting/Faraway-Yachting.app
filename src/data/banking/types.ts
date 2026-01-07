import { Currency } from '../company/types';

export interface BankInformation {
  bankName: string;
  bankBranch?: string;
  bankCountry: string;
  swiftBic?: string;
}

export interface BankAccount {
  id: string;
  bankInformation: BankInformation;
  accountName: string;
  accountNumber: string; // TEXT type - preserves leading zeros
  iban?: string;
  currency: Currency;
  companyId: string;
  glAccountCode: string; // Must be 1010-1013 (bank account GL codes)
  openingBalance: number;
  openingBalanceDate: string; // ISO date string
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
