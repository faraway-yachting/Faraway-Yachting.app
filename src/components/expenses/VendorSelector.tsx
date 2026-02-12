'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Building2, Plus, Loader2 } from 'lucide-react';
import { contactsApi } from '@/lib/supabase/api';
import { dbContactToFrontend, frontendContactToDb } from '@/lib/supabase/transforms';
import { ContactFormModal } from '@/components/contact/ContactFormModal';
import { Contact } from '@/data/contact/types';

interface VendorSelectorProps {
  value: string; // vendorId
  onChange: (vendorId: string, vendorName: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export function VendorSelector({
  value,
  onChange,
  required = false,
  disabled = false,
}: VendorSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch vendors from Supabase
  const fetchVendors = async () => {
    setLoading(true);
    try {
      const data = await contactsApi.getVendors();
      setVendors(data.map(dbContactToFrontend));
    } catch (e) {
      console.error('Failed to load vendors:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  // Get selected vendor
  const selectedVendor = vendors.find((v) => v.id === value);

  // Filter vendors based on search query
  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) =>
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.alternativeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.taxId?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [vendors, searchQuery]);

  // Sort alphabetically
  const sortedVendors = useMemo(() => {
    return [...filteredVendors].sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredVendors]);

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

  const handleSelect = (vendorId: string, vendorName: string) => {
    onChange(vendorId, vendorName);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSaveContact = async (contactData: Partial<Contact>) => {
    // Force vendor type
    const dbData = frontendContactToDb({ ...contactData, type: ['vendor'] });
    await contactsApi.create(dbData);
    setIsContactModalOpen(false);
    await fetchVendors();
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
          ${!selectedVendor && !disabled ? 'text-gray-400' : 'text-gray-900'}
        `}
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <span className="truncate">
            {loading ? 'Loading...' : selectedVendor ? selectedVendor.name : 'Select vendor...'}
          </span>
          {required && !selectedVendor && (
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
                placeholder="Search vendors..."
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                autoFocus
              />
            </div>
          </div>

          {/* Vendor List */}
          <div className="overflow-y-auto max-h-60">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Loading vendors...
              </div>
            ) : sortedVendors.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No vendors found
              </div>
            ) : (
              <ul className="py-1">
                {sortedVendors.map((vendor) => (
                  <li key={vendor.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(vendor.id, vendor.name)}
                      className={`
                        w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors
                        ${vendor.id === value ? 'bg-blue-50 text-[#5A7A8F] font-medium' : 'text-gray-900'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{vendor.name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {vendor.taxId && (
                              <span className="mr-2">Tax ID: {vendor.taxId}</span>
                            )}
                            {vendor.contactPerson && (
                              <span>{vendor.contactPerson}</span>
                            )}
                          </div>
                        </div>
                        {vendor.id === value && (
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

          {/* Add New Vendor Button */}
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
              <span>Add new vendor</span>
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
