'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/accounting/AppShell';
import { Users, Plus, Edit2, Search, Building2, ShoppingCart, Loader2 } from 'lucide-react';
import { ContactFormModal } from '@/components/contact/ContactFormModal';
import { contactsApi } from '@/lib/supabase/api';
import { dbContactToFrontend, frontendContactToDb } from '@/lib/supabase/transforms';
import { Contact, ContactType } from '@/data/contact/types';

type FilterTab = 'all' | 'customer' | 'vendor';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch contacts from Supabase
  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await contactsApi.getAll();
      setContacts(data.map(dbContactToFrontend));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      // Filter by active status
      if (!showInactive && !contact.isActive) return false;

      // Filter by type
      if (filterTab === 'customer' && contact.type === 'vendor') return false;
      if (filterTab === 'vendor' && contact.type === 'customer') return false;

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = contact.name.toLowerCase().includes(query);
        const matchesEmail = contact.email?.toLowerCase().includes(query);
        const matchesPerson = contact.contactPerson?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesPerson) return false;
      }

      return true;
    });
  }, [contacts, showInactive, filterTab, searchQuery]);

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await contactsApi.toggleStatus(id);
      await fetchContacts();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to toggle status');
    }
  };

  const handleSave = async (contactData: Partial<Contact>) => {
    const dbData = frontendContactToDb(contactData);
    if (editingContact) {
      await contactsApi.update(editingContact.id, dbData);
    } else {
      await contactsApi.create(dbData);
    }
    setIsModalOpen(false);
    setEditingContact(null);
    await fetchContacts();
  };

  const getTypeIcon = (type: ContactType) => {
    switch (type) {
      case 'customer':
        return <ShoppingCart className="h-4 w-4 text-blue-600" />;
      case 'vendor':
        return <Building2 className="h-4 w-4 text-orange-600" />;
      case 'both':
        return <Users className="h-4 w-4 text-purple-600" />;
    }
  };

  const getTypeBadge = (type: ContactType) => {
    const styles = {
      customer: 'bg-blue-100 text-blue-800',
      vendor: 'bg-orange-100 text-orange-800',
      both: 'bg-purple-100 text-purple-800',
    };
    const labels = {
      customer: 'Customer',
      vendor: 'Vendor',
      both: 'Both',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[type]}`}>
        {getTypeIcon(type)}
        {labels[type]}
      </span>
    );
  };

  // Count contacts by type for tabs
  const customerCount = contacts.filter(c => (showInactive || c.isActive) && (c.type === 'customer' || c.type === 'both')).length;
  const vendorCount = contacts.filter(c => (showInactive || c.isActive) && (c.type === 'vendor' || c.type === 'both')).length;
  const allCount = contacts.filter(c => showInactive || c.isActive).length;

  return (
    <AppShell currentRole="sales">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5A7A8F]/10 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-[#5A7A8F]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
              <p className="text-sm text-gray-500">
                Manage customers and vendors for invoicing and expenses
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingContact(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#2c3e50] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filterTab === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({allCount})
              </button>
              <button
                onClick={() => setFilterTab('customer')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filterTab === 'customer'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Customers ({customerCount})
              </button>
              <button
                onClick={() => setFilterTab('vendor')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filterTab === 'vendor'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Vendors ({vendorCount})
              </button>
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or contact person..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              />
            </div>

            {/* Show Inactive */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="show-inactive"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
              />
              <label htmlFor="show-inactive" className="text-sm text-gray-700">
                Show inactive
              </label>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-gray-200 bg-white">
          {loading ? (
            <div className="text-center py-12">
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading contacts...</span>
              </div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-sm font-medium text-gray-900">No contacts found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Get started by adding a new contact'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => {
                    setEditingContact(null);
                    setIsModalOpen(true);
                  }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#5A7A8F] border border-[#5A7A8F] rounded-lg hover:bg-[#5A7A8F]/5 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Contact
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Contact Person
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className={!contact.isActive ? 'bg-gray-50' : ''}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {contact.name}
                        </div>
                        {contact.taxId && (
                          <div className="text-xs text-gray-500">
                            Tax ID: {contact.taxId}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getTypeBadge(contact.type)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {contact.contactPerson || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {contact.email ? (
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-[#5A7A8F] hover:underline"
                          >
                            {contact.email}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {contact.phone || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleStatus(contact.id)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            contact.isActive
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {contact.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleEditContact(contact)}
                          className="text-[#5A7A8F] hover:text-[#2c3e50] transition-colors"
                          title="Edit contact"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <ContactFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingContact={editingContact}
      />
    </AppShell>
  );
}
