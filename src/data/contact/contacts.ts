/**
 * Contact Data and Operations
 *
 * Mock data and CRUD operations for Contacts.
 * In production, this will be replaced with database queries.
 */

import { Contact, ContactType } from './types';

// Generate unique ID
const generateId = (): string => `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Mock data
export let contacts: Contact[] = [
  {
    id: 'contact-001',
    name: 'ABC Marina Services',
    type: ['vendor'],
    contactPerson: 'Tom Wilson',
    email: 'tom@abcmarina.com',
    phone: '+66 81 234 5678',
    taxId: '0105561234567',
    billingAddress: {
      street: '123 Marina Road',
      city: 'Phuket',
      state: 'Phuket',
      postalCode: '83100',
      country: 'Thailand',
    },
    defaultCurrency: 'THB',
    paymentTerms: 'Net 30',
    notes: 'Primary marina service provider',
    isActive: true,
    createdAt: new Date('2023-01-01').toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'contact-002',
    name: 'Blue Ocean Fuel Co.',
    type: ['vendor'],
    contactPerson: 'Mike Chen',
    email: 'mike@blueoceanfuel.com',
    phone: '+66 82 345 6789',
    taxId: '0105562345678',
    billingAddress: {
      street: '456 Harbor Drive',
      city: 'Phuket',
      state: 'Phuket',
      postalCode: '83110',
      country: 'Thailand',
    },
    defaultCurrency: 'THB',
    paymentTerms: 'Due on receipt',
    notes: 'Fuel supplier for all yachts',
    isActive: true,
    createdAt: new Date('2023-02-15').toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'contact-003',
    name: 'Luxury Charter Group',
    type: ['customer'],
    contactPerson: 'Sarah Miller',
    email: 'sarah@luxurycharter.com',
    phone: '+44 20 7123 4567',
    website: 'https://luxurycharter.com',
    taxId: 'GB123456789',
    billingAddress: {
      street: '10 Mayfair Street',
      city: 'London',
      state: 'Greater London',
      postalCode: 'W1K 2AB',
      country: 'United Kingdom',
    },
    defaultCurrency: 'GBP',
    paymentTerms: 'Net 15',
    notes: 'Premium charter booking agency',
    isActive: true,
    createdAt: new Date('2023-03-10').toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'contact-004',
    name: 'Siam Yacht Supplies',
    type: ['customer', 'vendor'],
    contactPerson: 'Nat Pongpanich',
    email: 'nat@siamyacht.co.th',
    phone: '+66 83 456 7890',
    taxId: '0105563456789',
    billingAddress: {
      street: '789 Industrial Estate',
      city: 'Bangkok',
      state: 'Bangkok',
      postalCode: '10110',
      country: 'Thailand',
    },
    defaultCurrency: 'THB',
    paymentTerms: 'Net 30',
    notes: 'Supplies and occasional charter bookings',
    isActive: true,
    createdAt: new Date('2023-04-20').toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'contact-005',
    name: 'Mediterranean Charters Ltd',
    type: ['customer'],
    contactPerson: 'Marco Rossi',
    email: 'marco@medcharters.eu',
    phone: '+39 06 1234 5678',
    website: 'https://medcharters.eu',
    taxId: 'IT12345678901',
    billingAddress: {
      street: 'Via Roma 42',
      city: 'Rome',
      state: 'Lazio',
      postalCode: '00184',
      country: 'Italy',
    },
    defaultCurrency: 'EUR',
    paymentTerms: 'Net 30',
    isActive: true,
    createdAt: new Date('2023-05-15').toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'contact-006',
    name: 'Old Supplier Co.',
    type: ['vendor'],
    contactPerson: 'John Doe',
    email: 'john@oldsupplier.com',
    phone: '+66 84 567 8901',
    isActive: false,
    createdAt: new Date('2022-01-01').toISOString(),
    updatedAt: new Date('2023-06-01').toISOString(),
  },
];

// ============= CRUD Operations =============

/**
 * Get all contacts
 */
export function getAllContacts(): Contact[] {
  return contacts;
}

/**
 * Get contact by ID
 */
export function getContactById(id: string): Contact | undefined {
  return contacts.find((c) => c.id === id);
}

/**
 * Get contacts by type
 */
export function getContactsByType(type: ContactType): Contact[] {
  return contacts.filter((c) => c.type.includes(type));
}

/**
 * Get only active contacts
 */
export function getActiveContacts(): Contact[] {
  return contacts.filter((c) => c.isActive);
}

/**
 * Get active contacts by type (for selectors)
 */
export function getActiveContactsByType(type: ContactType): Contact[] {
  return contacts.filter((c) => c.isActive && c.type.includes(type));
}

/**
 * Search contacts by name or email
 */
export function searchContacts(query: string): Contact[] {
  const lowerQuery = query.toLowerCase();
  return contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.email?.toLowerCase().includes(lowerQuery) ||
      c.contactPerson?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Create a new contact
 */
export function createContact(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Contact {
  const now = new Date().toISOString();
  const newContact: Contact = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  contacts.push(newContact);
  return newContact;
}

/**
 * Update a contact
 */
export function updateContact(id: string, updates: Partial<Contact>): Contact | null {
  const index = contacts.findIndex((c) => c.id === id);
  if (index === -1) return null;

  contacts[index] = {
    ...contacts[index],
    ...updates,
    id, // Ensure ID cannot be changed
    updatedAt: new Date().toISOString(),
  };

  return contacts[index];
}

/**
 * Delete a contact
 */
export function deleteContact(id: string): boolean {
  const index = contacts.findIndex((c) => c.id === id);
  if (index === -1) return false;

  contacts.splice(index, 1);
  return true;
}

/**
 * Toggle contact active status
 */
export function toggleContactStatus(id: string): Contact | null {
  const contact = getContactById(id);
  if (!contact) return null;

  return updateContact(id, { isActive: !contact.isActive });
}
