import type { Currency } from '@/data/company/types';

export interface BookingAgency {
  id: string;
  contactId: string;
  platform?: string;
  commissionRate?: number;
  defaultCurrency: Currency;
  contractUrl?: string;
  contractFilename?: string;
  isActive: boolean;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingAgencyWithContact extends BookingAgency {
  contactName: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
}
