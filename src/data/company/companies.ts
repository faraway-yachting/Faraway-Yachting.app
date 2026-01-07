/**
 * Company Mock Data
 *
 * Mock data for company management.
 * In production, this will be replaced with database queries.
 */

import { Company } from './types';

// Initial mock data with Faraway Yachting as the parent company
export let companies: Company[] = [
  {
    id: 'company-001',
    name: 'Faraway Yachting',
    taxId: '0-1055-12345-67-8',
    registeredAddress: {
      street: '123 Marina Boulevard, Royal Phuket Marina',
      city: 'Phuket',
      state: 'Phuket',
      postalCode: '83000',
      country: 'Thailand',
    },
    billingAddress: {
      street: '123 Marina Boulevard, Royal Phuket Marina',
      city: 'Phuket',
      state: 'Phuket',
      postalCode: '83000',
      country: 'Thailand',
    },
    sameAsBillingAddress: true,
    contactInformation: {
      primaryContactName: 'John Smith',
      phoneNumber: '+66 76 123 4567',
      email: 'contact@farawayyachting.com',
    },
    isActive: true,
    createdAt: new Date('2020-01-15').toISOString(),
    updatedAt: new Date().toISOString(),
    currency: 'THB',
    fiscalYearEnd: '2024-12-31',
    isVatRegistered: true,
    vatRate: 7,
  },
  {
    id: 'company-002',
    name: 'Blue Horizon Yachts',
    taxId: 'TH-2055-98765-43-1',
    registeredAddress: {
      street: '456 Seafront Drive',
      city: 'Koh Samui',
      state: 'Surat Thani',
      postalCode: '84320',
      country: 'Thailand',
    },
    billingAddress: {
      street: '456 Seafront Drive',
      city: 'Koh Samui',
      state: 'Surat Thani',
      postalCode: '84320',
      country: 'Thailand',
    },
    sameAsBillingAddress: true,
    contactInformation: {
      primaryContactName: 'Sarah Johnson',
      phoneNumber: '+66 77 987 6543',
      email: 'info@bluehorizon.com',
    },
    isActive: true,
    createdAt: new Date('2021-06-10').toISOString(),
    updatedAt: new Date().toISOString(),
    currency: 'THB',
    fiscalYearEnd: '2024-12-31',
    isVatRegistered: true,
    vatRate: 7,
  },
  {
    id: 'company-003',
    name: 'Coastal Marine Co',
    taxId: 'SG-123456789K',
    registeredAddress: {
      street: '15 Sentosa Cove',
      city: 'Singapore',
      state: 'Singapore',
      postalCode: '098234',
      country: 'Singapore',
    },
    billingAddress: {
      street: '100 Beach Road, #12-34',
      city: 'Singapore',
      state: 'Singapore',
      postalCode: '189702',
      country: 'Singapore',
    },
    sameAsBillingAddress: false,
    contactInformation: {
      primaryContactName: 'Michael Tan',
      phoneNumber: '+65 6123 4567',
      email: 'contact@coastalmarine.sg',
    },
    isActive: true,
    createdAt: new Date('2022-03-20').toISOString(),
    updatedAt: new Date().toISOString(),
    currency: 'SGD',
    fiscalYearEnd: '2024-03-31',
    isVatRegistered: true,
    vatRate: 9,
  },
];

// Utility functions

/**
 * Get company by ID
 */
export function getCompanyById(id: string): Company | undefined {
  return companies.find(c => c.id === id);
}

/**
 * Get all active companies
 */
export function getActiveCompanies(): Company[] {
  return companies.filter(c => c.isActive);
}

/**
 * Get all companies (including inactive)
 */
export function getAllCompanies(): Company[] {
  return companies;
}

/**
 * Add a new company (mock implementation)
 */
export function addCompany(company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Company {
  const newCompany: Company = {
    ...company,
    id: `company-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  companies.push(newCompany);
  return newCompany;
}

/**
 * Update an existing company (mock implementation)
 */
export function updateCompany(id: string, updates: Partial<Company>): Company | null {
  const index = companies.findIndex(c => c.id === id);
  if (index === -1) return null;

  companies[index] = {
    ...companies[index],
    ...updates,
    id, // Ensure ID cannot be changed
    updatedAt: new Date().toISOString(),
  };

  return companies[index];
}

/**
 * Delete a company (mock implementation)
 */
export function deleteCompany(id: string): boolean {
  const index = companies.findIndex(c => c.id === id);
  if (index === -1) return false;

  companies.splice(index, 1);
  return true;
}

/**
 * Toggle company active status
 */
export function toggleCompanyStatus(id: string): Company | null {
  const company = getCompanyById(id);
  if (!company) return null;

  return updateCompany(id, { isActive: !company.isActive });
}
