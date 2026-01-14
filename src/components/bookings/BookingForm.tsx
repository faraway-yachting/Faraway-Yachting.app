'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Ship, Calendar, User, DollarSign, FileText, Trash2, ChevronDown, Sparkles, Plus, Search, Receipt, FileCheck, Building2 } from 'lucide-react';
import {
  Booking,
  BookingType,
  BookingStatus,
  bookingTypeLabels,
  bookingStatusLabels,
  bookingStatusColors,
  agentPlatforms,
} from '@/data/booking/types';
import { Project } from '@/data/project/types';
import { Currency } from '@/data/company/types';
import { useBookingSettings } from '@/contexts/BookingSettingsContext';
import {
  YachtProduct,
  ProductCharterType,
  bookingTypeToProductCharterTypes,
} from '@/data/yachtProduct/types';
import { yachtProductsApi } from '@/lib/supabase/api/yachtProducts';
import { contactsApi } from '@/lib/supabase/api/contacts';

// Booking type: Direct or Agency
type BookingSourceType = 'direct' | 'agency';

// Contact type from DB
interface Contact {
  id: string;
  name: string;
  type: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  is_active: boolean;
}

interface BookingFormProps {
  booking?: Booking | null;
  defaultDate?: string;
  prefilled?: Partial<Booking> | null; // Pre-filled data from Quotation/Invoice/Receipt
  projects: Project[];
  onSave: (booking: Partial<Booking>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
  isAgencyView?: boolean;
  canEdit?: boolean;
}

const currencies: Currency[] = ['THB', 'USD', 'EUR', 'GBP', 'SGD', 'AED'];

// Preset time options for day charters
const timePresets = [
  { value: '08:00 - 16:00', label: '08:00 - 16:00' },
  { value: '08:30 - 16:30', label: '08:30 - 16:30' },
  { value: '09:00 - 17:00', label: '09:00 - 17:00' },
  { value: '09:30 - 17:30', label: '09:30 - 17:30' },
  { value: '10:00 - 18:00', label: '10:00 - 18:00' },
  { value: '10:30 - 18:30', label: '10:30 - 18:30' },
  { value: '11:00 - 11:00', label: '11:00 - 11:00' },
  { value: 'To Be Confirmed', label: 'To Be Confirmed' },
];

export function BookingForm({
  booking,
  defaultDate,
  prefilled,
  projects,
  onSave,
  onDelete,
  onClose,
  isAgencyView = false,
  canEdit = true,
}: BookingFormProps) {
  const isEditing = !!booking;
  const { externalBoats } = useBookingSettings();

  // Determine initial values - use prefilled if available, then booking, then defaults
  const getInitialValue = <T,>(
    prefilledVal: T | undefined,
    bookingVal: T | undefined,
    defaultVal: T
  ): T => {
    if (prefilledVal !== undefined && prefilledVal !== null && prefilledVal !== '') return prefilledVal;
    if (bookingVal !== undefined && bookingVal !== null && bookingVal !== '') return bookingVal;
    return defaultVal;
  };

  // Form state
  const [formData, setFormData] = useState<Partial<Booking>>({
    type: getInitialValue(prefilled?.type, booking?.type, 'day_charter'),
    status: getInitialValue(prefilled?.status, booking?.status, 'enquiry'),
    title: getInitialValue(prefilled?.title, booking?.title, ''),
    dateFrom: getInitialValue(prefilled?.dateFrom, booking?.dateFrom, defaultDate || new Date().toISOString().split('T')[0]),
    dateTo: getInitialValue(prefilled?.dateTo, booking?.dateTo, defaultDate || new Date().toISOString().split('T')[0]),
    time: getInitialValue(prefilled?.time, booking?.time, ''),
    projectId: getInitialValue(prefilled?.projectId, booking?.projectId, undefined),
    externalBoatName: getInitialValue(prefilled?.externalBoatName, booking?.externalBoatName, ''),
    customerName: getInitialValue(prefilled?.customerName, booking?.customerName, ''),
    customerEmail: getInitialValue(prefilled?.customerEmail, booking?.customerEmail, ''),
    customerPhone: getInitialValue(prefilled?.customerPhone, booking?.customerPhone, ''),
    numberOfGuests: getInitialValue(prefilled?.numberOfGuests, booking?.numberOfGuests, undefined),
    bookingOwner: getInitialValue(prefilled?.bookingOwner, booking?.bookingOwner, ''),
    agentName: getInitialValue(prefilled?.agentName, booking?.agentName, ''),
    agentPlatform: getInitialValue(prefilled?.agentPlatform, booking?.agentPlatform, 'Direct'),
    meetAndGreeter: getInitialValue(prefilled?.meetAndGreeter, booking?.meetAndGreeter, ''),
    destination: getInitialValue(prefilled?.destination, booking?.destination, ''),
    pickupLocation: getInitialValue(prefilled?.pickupLocation, booking?.pickupLocation, ''),
    currency: getInitialValue(prefilled?.currency, booking?.currency, 'THB'),
    totalPrice: getInitialValue(prefilled?.totalPrice, booking?.totalPrice, undefined),
    depositAmount: getInitialValue(prefilled?.depositAmount, booking?.depositAmount, undefined),
    depositDueDate: getInitialValue(prefilled?.depositDueDate, booking?.depositDueDate, undefined),
    depositPaidDate: getInitialValue(prefilled?.depositPaidDate, booking?.depositPaidDate, undefined),
    balanceAmount: getInitialValue(prefilled?.balanceAmount, booking?.balanceAmount, undefined),
    balanceDueDate: getInitialValue(prefilled?.balanceDueDate, booking?.balanceDueDate, undefined),
    balancePaidDate: getInitialValue(prefilled?.balancePaidDate, booking?.balancePaidDate, undefined),
    internalNotes: getInitialValue(prefilled?.internalNotes, booking?.internalNotes, ''),
    customerNotes: getInitialValue(prefilled?.customerNotes, booking?.customerNotes, ''),
  });

  // Determine if using external boat based on prefilled or booking data
  const [useExternalBoat, setUseExternalBoat] = useState(
    !!(prefilled?.externalBoatName && !prefilled?.projectId) ||
    !!(booking?.externalBoatName && !booking?.projectId)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [holdUntilMode, setHoldUntilMode] = useState<'days' | 'manual'>('days');
  const [holdDays, setHoldDays] = useState<number>(3); // Default to 3 days
  const [timeInputMode, setTimeInputMode] = useState<'preset' | 'manual'>('manual'); // Default to manual input
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const timeDropdownRef = useRef<HTMLDivElement>(null);

  // Product auto-fill state
  const [availableProducts, setAvailableProducts] = useState<YachtProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<YachtProduct | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Contact search state - initialize with prefilled or booking customer name
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState(
    prefilled?.customerName || booking?.customerName || ''
  );
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  const contactDropdownRef = useRef<HTMLDivElement>(null);

  // Booking type state (Direct/Agency)
  const [bookingSourceType, setBookingSourceType] = useState<BookingSourceType>('direct');

  // Load contacts on mount
  useEffect(() => {
    async function loadContacts() {
      try {
        const data = await contactsApi.getCustomers();
        setContacts(data as Contact[]);
      } catch (error) {
        console.error('Error loading contacts:', error);
      }
    }
    loadContacts();
  }, []);

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

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    (contact.email?.toLowerCase().includes(contactSearch.toLowerCase()))
  );

  // Handle contact selection
  const handleContactSelect = (contact: Contact) => {
    setSelectedContactId(contact.id);
    handleChange('customerName', contact.name);
    if (contact.email) handleChange('customerEmail', contact.email);
    if (contact.phone) handleChange('customerPhone', contact.phone);
    setContactSearch(contact.name);
    setShowContactDropdown(false);
  };

  // Handle creating new contact
  const handleCreateContact = async () => {
    if (!newContactName.trim()) return;

    setIsCreatingContact(true);
    try {
      const newContact = await contactsApi.create({
        name: newContactName.trim(),
        type: 'customer',
        email: newContactEmail.trim() || null,
        phone: newContactPhone.trim() || null,
        is_active: true,
      });

      // Add to contacts list and select it
      setContacts(prev => [...prev, newContact as Contact]);
      handleContactSelect(newContact as Contact);

      // Reset form
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

  // Initialize form with booking data
  useEffect(() => {
    if (booking) {
      setFormData(booking);
      setUseExternalBoat(!!booking.externalBoatName && !booking.projectId);
      // Check if existing time is a preset value
      if (booking.time && timePresets.some(p => p.value === booking.time)) {
        setTimeInputMode('preset');
      } else {
        setTimeInputMode('manual');
      }
      // Set booking source type based on agentPlatform
      if (booking.agentPlatform && booking.agentPlatform !== 'Direct') {
        setBookingSourceType('agency');
      } else {
        setBookingSourceType('direct');
      }
      // Set contact search to customer name
      if (booking.customerName) {
        setContactSearch(booking.customerName);
      }
    }
  }, [booking]);

  // Close time dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
        setShowTimeDropdown(false);
      }
    };

    if (showTimeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTimeDropdown]);

  // Auto-set dateTo for day charters
  useEffect(() => {
    if (formData.type === 'day_charter' && formData.dateFrom) {
      setFormData(prev => ({ ...prev, dateTo: prev.dateFrom }));
    }
  }, [formData.type, formData.dateFrom]);

  // Load products when yacht is selected
  useEffect(() => {
    async function loadProducts() {
      // Don't load for editing existing bookings
      if (isEditing) return;

      const yachtId = useExternalBoat
        ? externalBoats.find(b => b.name === formData.externalBoatName)?.id
        : formData.projectId;

      if (!yachtId) {
        setAvailableProducts([]);
        setSelectedProduct(null);
        return;
      }

      setIsLoadingProducts(true);
      try {
        const yachtSource = useExternalBoat ? 'external' : 'own';
        const products = await yachtProductsApi.getActiveByYacht(yachtSource, yachtId);
        setAvailableProducts(products);
      } catch (error) {
        console.error('Error loading products:', error);
        setAvailableProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    }

    loadProducts();
  }, [useExternalBoat, formData.projectId, formData.externalBoatName, externalBoats, isEditing]);

  // Auto-fill from product when charter type changes or product is selected
  useEffect(() => {
    if (isEditing || availableProducts.length === 0 || !formData.type) return;

    // Find matching product for the current charter type
    const matchingCharterTypes = bookingTypeToProductCharterTypes(formData.type);
    const matchingProduct = availableProducts.find(p =>
      matchingCharterTypes.includes(p.charterType)
    );

    if (matchingProduct && matchingProduct.id !== selectedProduct?.id) {
      applyProductPreset(matchingProduct);
    }
  }, [formData.type, availableProducts, isEditing]);

  // Apply product preset to form
  const applyProductPreset = (product: YachtProduct) => {
    setSelectedProduct(product);
    const fieldsToFill = new Set<string>();

    setFormData(prev => {
      const updates: Partial<Booking> = { ...prev };

      if (product.destination && !prev.destination) {
        updates.destination = product.destination;
        fieldsToFill.add('destination');
      }
      if (product.departFrom && !prev.pickupLocation) {
        updates.pickupLocation = product.departFrom;
        fieldsToFill.add('pickupLocation');
      }
      if (product.defaultTime && !prev.time) {
        updates.time = product.defaultTime;
        fieldsToFill.add('time');
      }
      if (product.price && !prev.totalPrice) {
        updates.totalPrice = product.price;
        updates.currency = product.currency;
        fieldsToFill.add('totalPrice');
      }

      return updates;
    });

    setAutoFilledFields(fieldsToFill);

    // Clear auto-fill highlight after 5 seconds
    if (fieldsToFill.size > 0) {
      setTimeout(() => {
        setAutoFilledFields(new Set());
      }, 5000);
    }
  };

  // Helper to get auto-fill CSS class
  const getAutoFillClass = (field: string) => {
    return autoFilledFields.has(field) ? 'bg-blue-50 ring-2 ring-blue-200' : '';
  };

  // Calculate balance when total or deposit changes
  useEffect(() => {
    if (formData.totalPrice && formData.depositAmount) {
      const balance = formData.totalPrice - formData.depositAmount;
      setFormData(prev => ({ ...prev, balanceAmount: balance }));
    }
  }, [formData.totalPrice, formData.depositAmount]);

  // Auto-calculate holdUntil when status changes to 'hold' and mode is 'days'
  useEffect(() => {
    if (formData.status === 'hold' && holdUntilMode === 'days' && !formData.holdUntil) {
      const holdDate = new Date();
      holdDate.setDate(holdDate.getDate() + holdDays);
      setFormData(prev => ({ ...prev, holdUntil: holdDate.toISOString() }));
    }
  }, [formData.status, holdUntilMode, holdDays, formData.holdUntil]);

  const handleChange = (field: keyof Booking, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.dateFrom) {
      newErrors.dateFrom = 'Start date is required';
    }
    if (!formData.dateTo) {
      newErrors.dateTo = 'End date is required';
    }
    if (formData.dateFrom && formData.dateTo && formData.dateTo < formData.dateFrom) {
      newErrors.dateTo = 'End date must be after start date';
    }
    if (!useExternalBoat && !formData.projectId) {
      newErrors.projectId = 'Please select a boat';
    }
    if (useExternalBoat && !formData.externalBoatName?.trim()) {
      newErrors.externalBoatName = 'External boat name is required';
    }
    if (!formData.customerName?.trim()) {
      newErrors.customerName = 'Customer name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (!validate()) return;

    setIsSaving(true);
    try {
      // Clear projectId if using external boat
      const dataToSave = {
        ...formData,
        projectId: useExternalBoat ? undefined : formData.projectId,
        externalBoatName: useExternalBoat ? formData.externalBoatName : undefined,
      };
      await onSave(dataToSave);
    } catch (error) {
      console.error('Error saving booking:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !confirm('Are you sure you want to delete this booking?')) return;

    setIsSaving(true);
    try {
      await onDelete();
    } catch (error) {
      console.error('Error deleting booking:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit Booking' : 'New Booking'}
            </h2>
            {booking && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-lg">
                {booking.bookingNumber}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Status and Type Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value as BookingStatus)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  {(Object.keys(bookingStatusLabels) as BookingStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {bookingStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Charter Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value as BookingType)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  {(Object.keys(bookingTypeLabels) as BookingType[]).map((type) => (
                    <option key={type} value={type}>
                      {bookingTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hold Until - only shown when status is 'hold' */}
            {formData.status === 'hold' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Hold Until
                </label>

                {/* Mode Selection */}
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={holdUntilMode === 'days'}
                      onChange={() => setHoldUntilMode('days')}
                      disabled={!canEdit}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Select Days</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={holdUntilMode === 'manual'}
                      onChange={() => setHoldUntilMode('manual')}
                      disabled={!canEdit}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Manual Entry</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Days Selector or Manual Input */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {holdUntilMode === 'days' ? 'Number of Days' : 'Date & Time'}
                    </label>
                    {holdUntilMode === 'days' ? (
                      <select
                        value={holdDays}
                        onChange={(e) => {
                          const days = parseInt(e.target.value);
                          setHoldDays(days);
                          // Calculate the hold until date from now + selected days
                          const holdDate = new Date();
                          holdDate.setDate(holdDate.getDate() + days);
                          handleChange('holdUntil', holdDate.toISOString());
                        }}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      >
                        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                          <option key={day} value={day}>
                            {day} {day === 1 ? 'day' : 'days'}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="datetime-local"
                        value={formData.holdUntil ? formData.holdUntil.slice(0, 16) : ''}
                        onChange={(e) => handleChange('holdUntil', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      />
                    )}
                  </div>

                  {/* Calculated/Resulting Date Display */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Hold Expires On</label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 font-medium">
                      {formData.holdUntil ? (
                        new Date(formData.holdUntil).toLocaleString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">The booking will be held until this date and time</p>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Booking Title *
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Smith Family Day Charter"
                disabled={!canEdit}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Dates Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dates
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={formData.dateFrom || ''}
                    onChange={(e) => handleChange('dateFrom', e.target.value)}
                    disabled={!canEdit}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                      errors.dateFrom ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={formData.dateTo || ''}
                    onChange={(e) => handleChange('dateTo', e.target.value)}
                    disabled={!canEdit || formData.type === 'day_charter'}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                      errors.dateTo ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Time</label>
                  <div className="relative" ref={timeDropdownRef}>
                    <input
                      type="text"
                      value={formData.time || ''}
                      onChange={(e) => {
                        handleChange('time', e.target.value);
                        setAutoFilledFields(prev => {
                          const next = new Set(prev);
                          next.delete('time');
                          return next;
                        });
                      }}
                      placeholder="e.g., 11:00 - 19:00"
                      disabled={!canEdit}
                      className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition-all ${getAutoFillClass('time')}`}
                    />
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${showTimeDropdown ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                    {/* Time presets dropdown */}
                    {showTimeDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
                        {timePresets.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => {
                              handleChange('time', preset.value);
                              setShowTimeDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Boat Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Ship className="h-4 w-4" />
                Boat
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!useExternalBoat}
                      onChange={() => setUseExternalBoat(false)}
                      disabled={!canEdit}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Owned Yacht</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={useExternalBoat}
                      onChange={() => setUseExternalBoat(true)}
                      disabled={!canEdit}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">External Boat</span>
                  </label>
                </div>

                {!useExternalBoat ? (
                  <select
                    value={formData.projectId || ''}
                    onChange={(e) => handleChange('projectId', e.target.value || undefined)}
                    disabled={!canEdit}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                      errors.projectId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select a boat...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={formData.externalBoatName || ''}
                    onChange={(e) => handleChange('externalBoatName', e.target.value)}
                    disabled={!canEdit}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                      errors.externalBoatName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select external boat...</option>
                    {externalBoats.map((boat) => (
                      <option key={boat.id} value={boat.name}>
                        {boat.name}
                      </option>
                    ))}
                  </select>
                )}
                {(errors.projectId || errors.externalBoatName) && (
                  <p className="text-sm text-red-500">{errors.projectId || errors.externalBoatName}</p>
                )}

                {/* Product preset indicator */}
                {selectedProduct && !isEditing && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                    <Sparkles className="h-4 w-4" />
                    <span>
                      Applied preset: <strong>{selectedProduct.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        setAutoFilledFields(new Set());
                      }}
                      className="ml-auto text-blue-500 hover:text-blue-700 text-xs underline"
                    >
                      Clear
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Destination</label>
                    <input
                      type="text"
                      value={formData.destination || ''}
                      onChange={(e) => {
                        handleChange('destination', e.target.value);
                        setAutoFilledFields(prev => {
                          const next = new Set(prev);
                          next.delete('destination');
                          return next;
                        });
                      }}
                      placeholder="e.g., Phi Phi Islands"
                      disabled={!canEdit}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition-all ${getAutoFillClass('destination')}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Pickup Location</label>
                    <input
                      type="text"
                      value={formData.pickupLocation || ''}
                      onChange={(e) => {
                        handleChange('pickupLocation', e.target.value);
                        setAutoFilledFields(prev => {
                          const next = new Set(prev);
                          next.delete('pickupLocation');
                          return next;
                        });
                      }}
                      placeholder="e.g., Ao Po Marina"
                      disabled={!canEdit}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition-all ${getAutoFillClass('pickupLocation')}`}
                    />
                  </div>
                </div>

                {/* Booking Type (Direct/Agency) */}
                <div className="pt-3 mt-3 border-t border-gray-200">
                  <label className="block text-xs text-gray-500 mb-2">Booking Type</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={bookingSourceType === 'direct'}
                        onChange={() => {
                          setBookingSourceType('direct');
                          handleChange('agentPlatform', 'Direct');
                          handleChange('agentName', '');
                        }}
                        disabled={!canEdit}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Direct Booking</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={bookingSourceType === 'agency'}
                        onChange={() => {
                          setBookingSourceType('agency');
                          handleChange('agentPlatform', 'Charter Agency');
                        }}
                        disabled={!canEdit}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Agency</span>
                    </label>
                  </div>

                  {/* Agency details - only show if Agency is selected */}
                  {bookingSourceType === 'agency' && (
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Agent/Platform</label>
                        <select
                          value={formData.agentPlatform || 'Charter Agency'}
                          onChange={(e) => handleChange('agentPlatform', e.target.value)}
                          disabled={!canEdit}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                        >
                          {agentPlatforms.filter(p => p !== 'Direct').map((platform) => (
                            <option key={platform} value={platform}>
                              {platform}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Agent Name</label>
                        <input
                          type="text"
                          value={formData.agentName || ''}
                          onChange={(e) => handleChange('agentName', e.target.value)}
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
                          onChange={(e) => handleChange('meetAndGreeter', e.target.value)}
                          disabled={!canEdit}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Section - Hidden for agency view unless own booking */}
            {!isAgencyView && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Customer Name *</label>
                    <div className="relative" ref={contactDropdownRef}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={contactSearch}
                          onChange={(e) => {
                            setContactSearch(e.target.value);
                            handleChange('customerName', e.target.value);
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
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
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
                              {contact.type === 'both' && (
                                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">Customer & Vendor</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {/* No results message */}
                      {showContactDropdown && contactSearch && filteredContacts.length === 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
                          <p className="text-sm text-gray-500">No contacts found. This will be a new customer.</p>
                          <button
                            type="button"
                            onClick={() => setShowNewContactForm(true)}
                            className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
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
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.customerEmail || ''}
                      onChange={(e) => handleChange('customerEmail', e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.customerPhone || ''}
                      onChange={(e) => handleChange('customerPhone', e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Number of Guests</label>
                    <input
                      type="number"
                      value={formData.numberOfGuests || ''}
                      onChange={(e) => handleChange('numberOfGuests', e.target.value ? parseInt(e.target.value) : undefined)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {/* New Contact Form Modal */}
                {showNewContactForm && (
                  <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded-lg">
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
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        {isCreatingContact ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
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
            )}

            {/* Financial Section - Hidden for agency view */}
            {!isAgencyView && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Financials
                  </h3>
                  {/* Create Invoice/Receipt buttons - only show when editing existing booking */}
                  {isEditing && canEdit ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={`/accounting/receipts/new?bookingId=${booking?.id}&bookingNumber=${booking?.bookingNumber}&customerName=${encodeURIComponent(formData.customerName || '')}&amount=${formData.depositAmount || formData.totalPrice || ''}&currency=${formData.currency || 'THB'}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <Receipt className="h-4 w-4" />
                        Create Receipt
                      </a>
                      <a
                        href={`/accounting/invoices/new?bookingId=${booking?.id}&bookingNumber=${booking?.bookingNumber}&customerName=${encodeURIComponent(formData.customerName || '')}&amount=${formData.totalPrice || ''}&currency=${formData.currency || 'THB'}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <FileCheck className="h-4 w-4" />
                        Create Invoice
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Save booking to create receipts/invoices</p>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Currency</label>
                    <select
                      value={formData.currency || 'THB'}
                      onChange={(e) => handleChange('currency', e.target.value as Currency)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      {currencies.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Total Price</label>
                    <input
                      type="number"
                      value={formData.totalPrice || ''}
                      onChange={(e) => {
                        handleChange('totalPrice', e.target.value ? parseFloat(e.target.value) : undefined);
                        setAutoFilledFields(prev => {
                          const next = new Set(prev);
                          next.delete('totalPrice');
                          return next;
                        });
                      }}
                      disabled={!canEdit}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition-all ${getAutoFillClass('totalPrice')}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Deposit</label>
                    <input
                      type="number"
                      value={formData.depositAmount || ''}
                      onChange={(e) => handleChange('depositAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Balance</label>
                    <input
                      type="number"
                      value={formData.balanceAmount || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-3">
                  <div></div>
                  <div></div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Deposit Paid</label>
                    <input
                      type="date"
                      value={formData.depositPaidDate || ''}
                      onChange={(e) => handleChange('depositPaidDate', e.target.value || undefined)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Balance Paid</label>
                    <input
                      type="date"
                      value={formData.balancePaidDate || ''}
                      onChange={(e) => handleChange('balancePaidDate', e.target.value || undefined)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>
                {/* Linked documents info */}
                {isEditing && (booking?.depositReceiptId || booking?.finalReceiptId || booking?.invoiceId) && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Linked Documents:</p>
                    <div className="flex flex-wrap gap-2">
                      {booking?.depositReceiptId && (
                        <a
                          href={`/accounting/receipts/${booking.depositReceiptId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-50 rounded hover:bg-green-100"
                        >
                          <Receipt className="h-3 w-3" />
                          Deposit Receipt
                        </a>
                      )}
                      {booking?.finalReceiptId && (
                        <a
                          href={`/accounting/receipts/${booking.finalReceiptId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-50 rounded hover:bg-green-100"
                        >
                          <Receipt className="h-3 w-3" />
                          Final Receipt
                        </a>
                      )}
                      {booking?.invoiceId && (
                        <a
                          href={`/accounting/invoices/${booking.invoiceId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded hover:bg-blue-100"
                        >
                          <FileCheck className="h-3 w-3" />
                          Invoice
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Customer Notes</label>
                  <textarea
                    value={formData.customerNotes || ''}
                    onChange={(e) => handleChange('customerNotes', e.target.value)}
                    rows={2}
                    placeholder="Notes visible to customer..."
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  />
                </div>
                {!isAgencyView && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Internal Notes</label>
                    <textarea
                      value={formData.internalNotes || ''}
                      onChange={(e) => handleChange('internalNotes', e.target.value)}
                      rows={2}
                      placeholder="Internal notes (not visible to customer)..."
                      disabled={!canEdit}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div>
            {isEditing && onDelete && canEdit && (
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            {canEdit && (
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  isEditing ? 'Save Changes' : 'Create Booking'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
