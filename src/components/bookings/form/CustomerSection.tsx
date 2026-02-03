'use client';

import { useState, useEffect, useRef } from 'react';
import {
  User,
  Search,
  Plus,
  Building2,
} from 'lucide-react';
import {
  Booking,
  ContactChannel,
} from '@/data/booking/types';
import { contactsApi } from '@/lib/supabase/api/contacts';
import { DynamicSelect } from './DynamicSelect';

type BookingSourceType = 'direct' | 'agency';

interface Contact {
  id: string;
  name: string;
  type: string[];
  contact_person?: string;
  email?: string;
  phone?: string;
  is_active: boolean;
}

interface CustomerSectionProps {
  formData: Partial<Booking>;
  onChange: (field: keyof Booking, value: any) => void;
  errors: Record<string, string>;
  canEdit: boolean;
  isAgencyView: boolean;
}

export function CustomerSection({
  formData,
  onChange,
  errors,
  canEdit,
  isAgencyView,
}: CustomerSectionProps) {
  // Contact search state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState(formData.customerName || '');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  const contactDropdownRef = useRef<HTMLDivElement>(null);

  // Booking source type
  const [bookingSourceType, setBookingSourceType] = useState<BookingSourceType>(
    formData.agentPlatform && formData.agentPlatform !== 'Direct' ? 'agency' : 'direct'
  );

  // Agency state for booking source dropdown
  const [agencies, setAgencies] = useState<Contact[]>([]);

  // Load contacts and agencies on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [customersData, agenciesData] = await Promise.all([
          contactsApi.getCustomers(),
          contactsApi.getAgencies(),
        ]);
        setContacts(customersData as Contact[]);
        setAgencies(agenciesData as Contact[]);
      } catch (error) {
        console.error('Error loading contacts:', error);
      }
    }
    loadData();
  }, []);

  // Sync contactSearch when formData.customerName changes externally
  useEffect(() => {
    if (formData.customerName && formData.customerName !== contactSearch) {
      setContactSearch(formData.customerName);
    }
  }, [formData.customerName]);

  // Close contact dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contactDropdownRef.current && !contactDropdownRef.current.contains(event.target as Node)) {
        setShowContactDropdown(false);
      }
    };
    if (showContactDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showContactDropdown]);

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      contact.email?.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const handleContactSelect = (contact: Contact) => {
    setSelectedContactId(contact.id);
    onChange('customerName', contact.name);
    if (contact.email) onChange('customerEmail', contact.email);
    if (contact.phone) onChange('customerPhone', contact.phone);
    setContactSearch(contact.name);
    setShowContactDropdown(false);
  };

  const handleCreateContact = async () => {
    if (!newContactName.trim()) return;
    setIsCreatingContact(true);
    try {
      const newContact = await contactsApi.create({
        name: newContactName.trim(),
        type: ['customer'],
        email: newContactEmail.trim() || null,
        phone: newContactPhone.trim() || null,
        is_active: true,
      });
      setContacts((prev) => [...prev, newContact as Contact]);
      handleContactSelect(newContact as Contact);
      setNewContactName('');
      setNewContactEmail('');
      setNewContactPhone('');
      setShowNewContactForm(false);
    } catch (error) {
      console.error('Error creating contact:', error);
      alert('Failed to create contact');
    } finally {
      setIsCreatingContact(false);
    }
  };

  if (isAgencyView) return null;

  return (
    <div className="bg-purple-50 rounded-lg p-4">
      <div className="flex items-center gap-2 px-3 py-2 -mx-4 -mt-4 mb-3 rounded-t-lg bg-purple-100">
        <User className="h-4 w-4 text-purple-600" />
        <h3 className="text-sm font-semibold text-purple-800">Customer Information</h3>
      </div>

      <div className="space-y-4">
        {/* Customer Name with contact search */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Customer / Agency Name *</label>
          <div className="relative" ref={contactDropdownRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => {
                  setContactSearch(e.target.value);
                  onChange('customerName', e.target.value);
                  setShowContactDropdown(true);
                  setSelectedContactId(null);
                }}
                onFocus={() => setShowContactDropdown(true)}
                placeholder="Search existing contact or type new name..."
                disabled={!canEdit}
                className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                  errors.customerName ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setShowNewContactForm(true)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#5A7A8F] hover:bg-blue-50 rounded transition-colors"
                  title="Add new contact"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Contact search dropdown */}
            {showContactDropdown && contactSearch && filteredContacts.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleContactSelect(contact)}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors flex items-center gap-2"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                      {contact.email && (
                        <p className="text-xs text-gray-500">{contact.email}</p>
                      )}
                    </div>
                    {contact.type.length > 1 && (
                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                        {contact.type.map(t => t === 'customer' ? 'Customer' : t === 'vendor' ? 'Vendor' : t === 'agency' ? 'Agency' : t === 'boat_operator' ? 'Operator' : t).join(' & ')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {showContactDropdown && contactSearch && filteredContacts.length === 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
                <p className="text-sm text-gray-500">No contacts found. This will be a new customer.</p>
                <button
                  type="button"
                  onClick={() => setShowNewContactForm(true)}
                  className="mt-2 flex items-center gap-1 text-sm text-[#5A7A8F] hover:text-[#4a6a7f]"
                >
                  <Plus className="h-4 w-4" />
                  Add as new contact
                </button>
              </div>
            )}
          </div>
          {errors.customerName && <p className="text-sm text-red-500 mt-1">{errors.customerName}</p>}
          {selectedContactId && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Linked to existing contact
            </p>
          )}
        </div>

        {/* Contact Channel */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Contact Channel</label>
          <DynamicSelect
            category="contact_channel"
            value={formData.contactChannel || ''}
            onChange={(val) => onChange('contactChannel', val as ContactChannel)}
            disabled={!canEdit}
            placeholder="Select channel..."
          />
        </div>

        {/* Email + Phone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={formData.customerEmail || ''}
              onChange={(e) => onChange('customerEmail', e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.customerPhone || ''}
              onChange={(e) => onChange('customerPhone', e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>

        {/* Booking Type (Direct/Agency) */}
        <div className="pt-3 border-t border-gray-200">
          <label className="block text-xs text-gray-500 mb-2">Booking Type</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={bookingSourceType === 'direct'}
                onChange={() => {
                  setBookingSourceType('direct');
                  onChange('agentPlatform', 'Direct');
                  onChange('agentName', '');
                }}
                disabled={!canEdit}
                className="text-[#5A7A8F] focus:ring-[#5A7A8F]"
              />
              <span className="text-sm text-gray-700">Direct Booking</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={bookingSourceType === 'agency'}
                onChange={() => {
                  setBookingSourceType('agency');
                  // Clear the platform value when switching to agency mode
                  if (formData.agentPlatform === 'Direct') {
                    onChange('agentPlatform', '');
                  }
                }}
                disabled={!canEdit}
                className="text-[#5A7A8F] focus:ring-[#5A7A8F]"
              />
              <span className="text-sm text-gray-700">Agency</span>
            </label>
          </div>

          {bookingSourceType === 'agency' && (
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Agency</label>
                <select
                  value={formData.agentPlatform || ''}
                  onChange={(e) => onChange('agentPlatform', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select agency...</option>
                  {agencies.map((agency) => (
                    <option key={agency.id} value={agency.name}>
                      {agency.name}
                    </option>
                  ))}
                </select>
                {agencies.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No agencies found. Add agencies in Contacts.</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Agent Name</label>
                <input
                  type="text"
                  value={formData.agentName || ''}
                  onChange={(e) => onChange('agentName', e.target.value)}
                  placeholder="Agent name"
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Meet & Greeter</label>
                <input
                  type="text"
                  value={formData.meetAndGreeter || ''}
                  onChange={(e) => onChange('meetAndGreeter', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* New Contact Form */}
        {showNewContactForm && (
          <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Contact
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name *</label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Contact name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="Phone"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleCreateContact}
                disabled={!newContactName.trim() || isCreatingContact}
                className="px-3 py-1.5 bg-[#5A7A8F] text-white text-sm rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 flex items-center gap-1"
              >
                {isCreatingContact ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3" />
                    Create & Select
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewContactForm(false);
                  setNewContactName('');
                  setNewContactEmail('');
                  setNewContactPhone('');
                }}
                className="px-3 py-1.5 text-gray-600 text-sm hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This contact will be saved to your Contacts in Accounting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
