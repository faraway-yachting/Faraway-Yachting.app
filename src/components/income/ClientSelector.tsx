'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, User, Plus, Loader2 } from 'lucide-react';
import { contactsApi } from '@/lib/supabase/api';
import { dbContactToFrontend, frontendContactToDb } from '@/lib/supabase/transforms';
import { ContactFormModal } from '@/components/contact/ContactFormModal';
import { Contact } from '@/data/contact/types';

interface ClientSelectorProps {
  value: string; // clientId
  onChange: (clientId: string, clientName: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export default function ClientSelector({
  value,
  onChange,
  required = false,
  disabled = false,
}: ClientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch customers from Supabase
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await contactsApi.getCustomers();
      setCustomers(data.map(dbContactToFrontend));
    } catch (e) {
      console.error('Failed to load customers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Get selected client
  const selectedClient = customers.find((c) => c.id === value);

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    return customers.filter((client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customers, searchQuery]);

  // Sort alphabetically
  const sortedClients = useMemo(() => {
    return [...filteredClients].sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredClients]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleSelect = (clientId: string, clientName: string) => {
    onChange(clientId, clientName);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSaveContact = async (contactData: Partial<Contact>) => {
    // Force customer type
    const dbData = frontendContactToDb({ ...contactData, type: 'customer' });
    await contactsApi.create(dbData);
    setIsContactModalOpen(false);
    await fetchCustomers();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-4 py-2.5 text-sm border rounded-lg transition-colors
          ${
            disabled
              ? 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed'
              : 'bg-white border-gray-300 hover:border-[#5A7A8F] focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]'
          }
          ${!selectedClient && !disabled ? 'text-gray-400' : 'text-gray-900'}
        `}
      >
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          <span className="truncate">
            {loading ? 'Loading...' : selectedClient ? selectedClient.name : 'Select customer...'}
          </span>
          {required && !selectedClient && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers..."
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                autoFocus
              />
            </div>
          </div>

          {/* Client List */}
          <div className="overflow-y-auto max-h-60">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Loading customers...
              </div>
            ) : sortedClients.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No customers found
              </div>
            ) : (
              <ul className="py-1">
                {sortedClients.map((client) => (
                  <li key={client.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(client.id, client.name)}
                      className={`
                        w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors
                        ${client.id === value ? 'bg-blue-50 text-[#5A7A8F] font-medium' : 'text-gray-900'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{client.name}</div>
                          {(client.contactPerson || client.email) && (
                            <div className="text-xs text-gray-500 truncate">
                              {client.contactPerson && client.email
                                ? `${client.contactPerson} • ${client.email}`
                                : client.contactPerson || client.email}
                            </div>
                          )}
                        </div>
                        {client.id === value && (
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-[#5A7A8F] rounded-full" />
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add New Contact Button */}
          <div className="p-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setIsContactModalOpen(true);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-sm text-[#5A7A8F] hover:bg-[#5A7A8F]/5 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add new contact</span>
            </button>
          </div>
        </div>
      )}

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSave={handleSaveContact}
        editingContact={null}
      />
    </div>
  );
}
