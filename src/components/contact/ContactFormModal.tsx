'use client';

import { useState, useEffect } from 'react';
import { X, Users, Loader2 } from 'lucide-react';
import { Contact, ContactType, ContactAddress } from '@/data/contact/types';

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contactData: Partial<Contact>) => Promise<void>;
  editingContact: Contact | null;
}

const emptyAddress: ContactAddress = {
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
};

const contactTypeOptions: { value: ContactType; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'agency', label: 'Agency' },
  { value: 'boat_operator', label: 'Boat Operator' },
];

export function ContactFormModal({
  isOpen,
  onClose,
  onSave,
  editingContact,
}: ContactFormModalProps) {
  const isEditing = !!editingContact;

  // Form state
  const [name, setName] = useState('');
  const [types, setTypes] = useState<ContactType[]>(['customer']);
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [taxId, setTaxId] = useState('');
  const [billingAddress, setBillingAddress] = useState<ContactAddress>(emptyAddress);
  const [shippingAddress, setShippingAddress] = useState<ContactAddress>(emptyAddress);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Errors and submission state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editingContact) {
        setName(editingContact.name);
        setTypes(editingContact.type);
        setContactPerson(editingContact.contactPerson || '');
        setEmail(editingContact.email || '');
        setPhone(editingContact.phone || '');
        setWebsite(editingContact.website || '');
        setTaxId(editingContact.taxId || '');
        setBillingAddress(editingContact.billingAddress || emptyAddress);
        setShippingAddress(editingContact.shippingAddress || emptyAddress);
        setSameAsShipping(!editingContact.shippingAddress);
        setNotes(editingContact.notes || '');
        setIsActive(editingContact.isActive);
      } else {
        // Reset for new contact
        setName('');
        setTypes(['customer']);
        setContactPerson('');
        setEmail('');
        setPhone('');
        setWebsite('');
        setTaxId('');
        setBillingAddress(emptyAddress);
        setShippingAddress(emptyAddress);
        setSameAsShipping(true);
        setNotes('');
        setIsActive(true);
      }
      setErrors({});
    }
  }, [isOpen, editingContact]);

  // Sync shipping address when checkbox is checked
  useEffect(() => {
    if (sameAsShipping) {
      setShippingAddress({ ...billingAddress });
    }
  }, [billingAddress, sameAsShipping]);

  const handleSameAsShippingChange = (checked: boolean) => {
    setSameAsShipping(checked);
    if (checked) {
      setShippingAddress({ ...billingAddress });
    }
  };

  // Validation
  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue) return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    if (types.length === 0) newErrors.type = 'At least one type is required';
    if (email && !validateEmail(email)) newErrors.email = 'Invalid email format';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const contactData: Partial<Contact> = {
      name: name.trim(),
      type: types,
      contactPerson: contactPerson.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      website: website.trim() || undefined,
      taxId: taxId.trim() || undefined,
      billingAddress: billingAddress.street ? billingAddress : undefined,
      shippingAddress: sameAsShipping ? undefined : (shippingAddress.street ? shippingAddress : undefined),
      notes: notes.trim() || undefined,
      isActive,
    };

    try {
      await onSave(contactData);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5A7A8F]/10 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-[#5A7A8F]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Edit Contact' : 'New Contact'}
              </h2>
              {isEditing && editingContact && (
                <p className="text-sm text-gray-500">{editingContact.name}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-4 overflow-y-auto flex-1">
            {/* Basic Info */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="contact-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Company or individual name"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <div className="flex flex-wrap gap-3 py-1">
                    {contactTypeOptions.map((t) => (
                      <label key={t.value} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={types.includes(t.value)}
                          onChange={() => {
                            setTypes(prev =>
                              prev.includes(t.value)
                                ? prev.filter(x => x !== t.value)
                                : [...prev, t.value]
                            );
                          }}
                          className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                        />
                        <span className="text-sm text-gray-700">{t.label}</span>
                      </label>
                    ))}
                  </div>
                  {types.length === 0 && (
                    <p className="mt-1 text-xs text-red-600">At least one type is required</p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-person" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    id="contact-person"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Primary contact name"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="contact-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="contact-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+66 81 234 5678"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  />
                </div>

                <div>
                  <label htmlFor="contact-website" className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    id="contact-website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  />
                </div>

                <div>
                  <label htmlFor="contact-tax-id" className="block text-sm font-medium text-gray-700 mb-1">
                    Tax ID
                  </label>
                  <input
                    type="text"
                    id="contact-tax-id"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="Tax identification number"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is-active"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                  />
                  <label htmlFor="is-active" className="text-sm text-gray-700">
                    Active
                  </label>
                </div>
              </div>
            </div>

            {/* Registered Address */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Registered Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="billing-street" className="block text-sm font-medium text-gray-700 mb-1">
                    Street
                  </label>
                  <input
                    type="text"
                    id="billing-street"
                    value={billingAddress.street || ''}
                    onChange={(e) => setBillingAddress({ ...billingAddress, street: e.target.value })}
                    placeholder="Street address"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  />
                </div>
                <div>
                  <label htmlFor="billing-city" className="block text-sm font-medium text-gray-700 mb-1">
                    City / District
                  </label>
                  <input
                    type="text"
                    id="billing-city"
                    value={billingAddress.city || ''}
                    onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                    placeholder="City or district"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  />
                </div>
                <div>
                  <label htmlFor="billing-state" className="block text-sm font-medium text-gray-700 mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    id="billing-state"
                    value={billingAddress.state || ''}
                    onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                    placeholder="State or province"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  />
                </div>
                <div>
                  <label htmlFor="billing-postal" className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    id="billing-postal"
                    value={billingAddress.postalCode || ''}
                    onChange={(e) => setBillingAddress({ ...billingAddress, postalCode: e.target.value })}
                    placeholder="Postal code"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  />
                </div>
                <div>
                  <label htmlFor="billing-country" className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    id="billing-country"
                    value={billingAddress.country || ''}
                    onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                    placeholder="Country"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Shipping Address</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="same-as-billing"
                    checked={sameAsShipping}
                    onChange={(e) => handleSameAsShippingChange(e.target.checked)}
                    className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                  />
                  <label htmlFor="same-as-billing" className="text-sm text-gray-700">
                    Same as registered address
                  </label>
                </div>
              </div>
              {!sameAsShipping && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="shipping-street" className="block text-sm font-medium text-gray-700 mb-1">
                      Street
                    </label>
                    <input
                      type="text"
                      id="shipping-street"
                      value={shippingAddress.street || ''}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                      placeholder="Street address"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                    />
                  </div>
                  <div>
                    <label htmlFor="shipping-city" className="block text-sm font-medium text-gray-700 mb-1">
                      City / District
                    </label>
                    <input
                      type="text"
                      id="shipping-city"
                      value={shippingAddress.city || ''}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      placeholder="City or district"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                    />
                  </div>
                  <div>
                    <label htmlFor="shipping-state" className="block text-sm font-medium text-gray-700 mb-1">
                      State / Province
                    </label>
                    <input
                      type="text"
                      id="shipping-state"
                      value={shippingAddress.state || ''}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                      placeholder="State or province"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                    />
                  </div>
                  <div>
                    <label htmlFor="shipping-postal" className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      id="shipping-postal"
                      value={shippingAddress.postalCode || ''}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                      placeholder="Postal code"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                    />
                  </div>
                  <div>
                    <label htmlFor="shipping-country" className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      id="shipping-country"
                      value={shippingAddress.country || ''}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                      placeholder="Country"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Internal notes..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              />
            </div>
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="mx-6 mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-white rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#2c3e50] transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
