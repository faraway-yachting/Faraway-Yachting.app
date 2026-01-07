/**
 * Transform utilities for converting between Supabase (snake_case) and frontend (camelCase) data formats
 */

import type { Database, Json } from './database.types';
import type { Company, Address, ContactInformation, Currency } from '@/data/company/types';
import type { Contact, ContactType, ContactAddress } from '@/data/contact/types';
import type { Project, ProjectStatus, ProjectType, ProjectParticipant } from '@/data/project/types';

type DbCompany = Database['public']['Tables']['companies']['Row'];
type DbCompanyInsert = Database['public']['Tables']['companies']['Insert'];
type DbContact = Database['public']['Tables']['contacts']['Row'];
type DbContactInsert = Database['public']['Tables']['contacts']['Insert'];
type DbProject = Database['public']['Tables']['projects']['Row'];
type DbProjectInsert = Database['public']['Tables']['projects']['Insert'];

// Helper to safely parse JSON fields
function parseJson<T>(json: Json | null, defaultValue: T): T {
  if (json === null || json === undefined) return defaultValue;
  if (typeof json === 'object') return json as T;
  try {
    return JSON.parse(json as string) as T;
  } catch {
    return defaultValue;
  }
}

// Company transformations
export function dbCompanyToFrontend(db: DbCompany): Company {
  const registeredAddress = parseJson<Address>(db.registered_address, {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });

  const billingAddress = parseJson<Address>(db.billing_address, {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });

  const contactInformation = parseJson<ContactInformation>(db.contact_information, {
    primaryContactName: '',
    phoneNumber: '',
    email: '',
  });

  return {
    id: db.id,
    name: db.name,
    taxId: db.tax_id,
    registeredAddress,
    billingAddress,
    sameAsBillingAddress: db.same_as_billing_address,
    contactInformation,
    currency: (db.currency || 'THB') as Currency,
    isActive: db.is_active,
    isVatRegistered: db.is_vat_registered,
    vatRate: db.vat_rate ?? undefined,
    logoUrl: db.logo_url ?? undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function frontendCompanyToDb(company: Partial<Company>): DbCompanyInsert {
  return {
    name: company.name!,
    tax_id: company.taxId!,
    registered_address: company.registeredAddress as unknown as Json,
    billing_address: company.billingAddress as unknown as Json,
    same_as_billing_address: company.sameAsBillingAddress,
    contact_information: company.contactInformation as unknown as Json,
    currency: company.currency || 'THB',
    is_active: company.isActive ?? true,
    is_vat_registered: company.isVatRegistered ?? false,
    vat_rate: company.vatRate ?? null,
    logo_url: company.logoUrl ?? null,
  };
}

// Contact transformations
export function dbContactToFrontend(db: DbContact): Contact {
  const billingAddress = parseJson<ContactAddress | undefined>(db.billing_address, undefined);

  return {
    id: db.id,
    name: db.name,
    type: db.type as ContactType,
    contactPerson: db.contact_person ?? undefined,
    email: db.email ?? undefined,
    phone: db.phone ?? undefined,
    taxId: db.tax_id ?? undefined,
    billingAddress,
    defaultCurrency: (db.default_currency || 'THB') as Currency,
    paymentTerms: db.payment_terms ?? undefined,
    notes: db.notes ?? undefined,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function frontendContactToDb(contact: Partial<Contact>): DbContactInsert {
  return {
    name: contact.name!,
    type: contact.type!,
    contact_person: contact.contactPerson ?? null,
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    tax_id: contact.taxId ?? null,
    billing_address: contact.billingAddress ? (contact.billingAddress as unknown as Json) : null,
    default_currency: contact.defaultCurrency || 'THB',
    payment_terms: contact.paymentTerms ?? null,
    notes: contact.notes ?? null,
    is_active: contact.isActive ?? true,
  };
}

// Project transformations
export function dbProjectToFrontend(db: DbProject): Project {
  const participants = parseJson<ProjectParticipant[]>(db.participants, []);

  return {
    id: db.id,
    name: db.name,
    code: db.code,
    companyId: db.company_id,
    type: (db.type || 'other') as ProjectType,
    description: db.description ?? undefined,
    participants,
    status: (db.status || 'active') as ProjectStatus,
    managementFeePercentage: db.management_fee_percentage ?? 15,
    createdBy: db.created_by ?? undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function frontendProjectToDb(project: Partial<Project>): DbProjectInsert {
  return {
    name: project.name!,
    code: project.code!,
    company_id: project.companyId!,
    type: project.type || 'other',
    description: project.description ?? null,
    participants: project.participants ? (project.participants as unknown as Json) : [],
    status: project.status || 'active',
    management_fee_percentage: project.managementFeePercentage ?? 15,
    created_by: project.createdBy ?? null,
  };
}
