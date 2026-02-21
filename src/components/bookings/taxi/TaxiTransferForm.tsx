'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Trash2, Search, ExternalLink } from 'lucide-react';
import {
  TaxiTransfer,
  TripType,
  TransferStatus,
  PaidBy,
  tripTypeLabels,
  transferStatusLabels,
  paidByLabels,
} from '@/data/taxi/types';
import { Booking } from '@/data/booking/types';
import { taxiTransfersApi, createTransferWithNumber } from '@/lib/supabase/api/taxiTransfers';
import { bookingsApi } from '@/lib/supabase/api/bookings';
import { useTaxiCompanies, useTaxiGuestNoteTemplates, useTaxiDriversByCompany, useTaxiVehiclesByCompany } from '@/hooks/queries/useTaxiTransfers';
import { useYachtProjects } from '@/hooks/queries/useProjects';
import { useAuth } from '@/components/auth';

interface TaxiTransferFormProps {
  transfer?: TaxiTransfer | null;
  bookingId?: string; // pre-link to a booking
  onClose: () => void;
}

export function TaxiTransferForm({ transfer, bookingId, onClose }: TaxiTransferFormProps) {
  const isEditing = !!transfer;
  const { isSuperAdmin, hasPermission } = useAuth();
  const canEdit = isSuperAdmin || hasPermission('bookings.taxi.edit');
  const canDelete = isSuperAdmin || hasPermission('bookings.taxi.delete');

  // Lookup data
  const { data: companies = [] } = useTaxiCompanies();
  const { data: noteTemplates = [] } = useTaxiGuestNoteTemplates();
  const { data: projects = [] } = useYachtProjects();

  // Form state
  const [tripType, setTripType] = useState<TripType>(transfer?.tripType || 'round_trip');
  const [status, setStatus] = useState<TransferStatus>(transfer?.status || 'pending');
  const [linkedBookingId, setLinkedBookingId] = useState(transfer?.bookingId || bookingId || '');
  const [boatName, setBoatName] = useState(transfer?.boatName || '');
  const [guestName, setGuestName] = useState(transfer?.guestName || '');
  const [contactNumber, setContactNumber] = useState(transfer?.contactNumber || '');
  const [numberOfGuests, setNumberOfGuests] = useState<string>(transfer?.numberOfGuests?.toString() || '');

  // Pickup
  const [pickupDate, setPickupDate] = useState(transfer?.pickupDate || '');
  const [pickupTime, setPickupTime] = useState(transfer?.pickupTime || '');
  const [pickupLocation, setPickupLocation] = useState(transfer?.pickupLocation || '');
  const [pickupLocationUrl, setPickupLocationUrl] = useState(transfer?.pickupLocationUrl || '');
  const [pickupDropoff, setPickupDropoff] = useState(transfer?.pickupDropoff || '');
  const [pickupDropoffUrl, setPickupDropoffUrl] = useState(transfer?.pickupDropoffUrl || '');

  // Return
  const [returnDate, setReturnDate] = useState(transfer?.returnDate || '');
  const [returnTime, setReturnTime] = useState(transfer?.returnTime || '');
  const [returnLocation, setReturnLocation] = useState(transfer?.returnLocation || '');
  const [returnLocationUrl, setReturnLocationUrl] = useState(transfer?.returnLocationUrl || '');
  const [returnDropoff, setReturnDropoff] = useState(transfer?.returnDropoff || '');
  const [returnDropoffUrl, setReturnDropoffUrl] = useState(transfer?.returnDropoffUrl || '');

  // Company & driver
  const [taxiCompanyId, setTaxiCompanyId] = useState(transfer?.taxiCompanyId || '');
  const [taxiDriverId, setTaxiDriverId] = useState(transfer?.taxiDriverId || '');
  const [taxiVehicleId, setTaxiVehicleId] = useState(transfer?.taxiVehicleId || '');
  const [driverName, setDriverName] = useState(transfer?.driverName || '');
  const [driverPhone, setDriverPhone] = useState(transfer?.driverPhone || '');
  const [vanNumberPlate, setVanNumberPlate] = useState(transfer?.vanNumberPlate || '');

  // Fetch drivers/vehicles for selected company
  const { data: companyDrivers = [] } = useTaxiDriversByCompany(taxiCompanyId || undefined);
  const { data: companyVehicles = [] } = useTaxiVehiclesByCompany(taxiCompanyId || undefined);

  // Payment
  const [paidBy, setPaidBy] = useState<PaidBy>(transfer?.paidBy || 'guest');
  const [amount, setAmount] = useState<string>(transfer?.amount?.toString() || '');
  const [currency, setCurrency] = useState(transfer?.currency || 'THB');
  const [paymentNote, setPaymentNote] = useState(transfer?.paymentNote || '');
  const [farawayPaid, setFarawayPaid] = useState(transfer?.farawayPaid || false);

  // Notes
  const [guestNote, setGuestNote] = useState(transfer?.guestNote || '');
  const [driverNote, setDriverNote] = useState(transfer?.driverNote || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateLang, setTemplateLang] = useState<'en' | 'th'>('en');

  // Booking search
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingResults, setBookingResults] = useState<Booking[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [linkedBooking, setLinkedBooking] = useState<Booking | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Load linked booking and auto-fill for new transfers
  useEffect(() => {
    if (linkedBookingId) {
      bookingsApi.getById(linkedBookingId).then(b => {
        if (b) {
          setLinkedBooking(b);
          // Auto-fill guest info when creating a new transfer with a pre-linked booking
          if (!isEditing && bookingId) {
            const project = projects.find(p => p.id === b.projectId);
            setBoatName(project?.name || b.externalBoatName || '');
            setGuestName(b.customerName || '');
            setContactNumber(b.customerPhone || '');
            setNumberOfGuests(b.numberOfGuests?.toString() || '');
            if (b.dateFrom) setPickupDate(b.dateFrom);
            if (b.pickupLocation) setPickupLocation(b.pickupLocation);
          }
        }
      });
    }
  }, [linkedBookingId, isEditing, bookingId, projects]);

  // Auto-fill from booking
  const fillFromBooking = useCallback((booking: Booking) => {
    const project = projects.find(p => p.id === booking.projectId);
    setBoatName(project?.name || booking.externalBoatName || '');
    setGuestName(booking.customerName || '');
    setContactNumber(booking.customerPhone || '');
    setNumberOfGuests(booking.numberOfGuests?.toString() || '');
    if (booking.dateFrom) setPickupDate(booking.dateFrom);
    if (booking.pickupLocation) setPickupLocation(booking.pickupLocation);
    setLinkedBookingId(booking.id);
    setLinkedBooking(booking);
    setBookingSearch('');
    setBookingResults([]);
  }, [projects]);

  // Search bookings
  useEffect(() => {
    if (bookingSearch.length < 2) {
      setBookingResults([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const all = await bookingsApi.getAll();
        const q = bookingSearch.toLowerCase();
        const filtered = all.filter(b =>
          b.customerName?.toLowerCase().includes(q) ||
          b.bookingNumber?.toLowerCase().includes(q) ||
          b.title?.toLowerCase().includes(q)
        ).slice(0, 10);
        setBookingResults(filtered);
      } catch {
        setBookingResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [bookingSearch]);

  // Template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = noteTemplates.find(t => t.id === templateId);
    if (template) {
      const content = templateLang === 'th' ? template.contentTh : template.contentEn;
      if (content) setGuestNote(content);
    }
  };

  // Save
  const handleSave = async () => {
    if (!guestName.trim()) {
      setError('Guest name is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const data: Partial<TaxiTransfer> = {
        tripType,
        status,
        bookingId: linkedBookingId || undefined,
        boatName: boatName || undefined,
        guestName,
        contactNumber: contactNumber || undefined,
        numberOfGuests: numberOfGuests ? parseInt(numberOfGuests) : undefined,
        pickupDate: pickupDate || undefined,
        pickupTime: pickupTime || undefined,
        pickupLocation: pickupLocation || undefined,
        pickupLocationUrl: pickupLocationUrl || undefined,
        pickupDropoff: pickupDropoff || undefined,
        pickupDropoffUrl: pickupDropoffUrl || undefined,
        returnDate: returnDate || undefined,
        returnTime: returnTime || undefined,
        returnLocation: returnLocation || undefined,
        returnLocationUrl: returnLocationUrl || undefined,
        returnDropoff: returnDropoff || undefined,
        returnDropoffUrl: returnDropoffUrl || undefined,
        taxiCompanyId: taxiCompanyId || undefined,
        taxiDriverId: taxiDriverId || undefined,
        taxiVehicleId: taxiVehicleId || undefined,
        driverName: driverName || undefined,
        driverPhone: driverPhone || undefined,
        vanNumberPlate: vanNumberPlate || undefined,
        paidBy,
        amount: amount ? parseFloat(amount) : undefined,
        currency,
        paymentNote: paymentNote || undefined,
        farawayPaid,
        guestNote: guestNote || undefined,
        driverNote: driverNote || undefined,
      };

      if (isEditing) {
        await taxiTransfersApi.update(transfer!.id, data);
      } else {
        await createTransferWithNumber(data);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save transfer');
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!transfer || !confirm('Are you sure you want to delete this transfer?')) return;
    setDeleting(true);
    try {
      await taxiTransfersApi.delete(transfer.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete transfer');
    } finally {
      setDeleting(false);
    }
  };

  const showPickup = tripType !== 'return_only';
  const showReturn = tripType !== 'pickup_only';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? `Transfer ${transfer.transferNumber}` : 'New Taxi Transfer'}
            </h2>
            {isEditing && (
              <p className="text-sm text-gray-500">Created {new Date(transfer.createdAt).toLocaleDateString()}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditing && canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete transfer"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Transfer Info */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Transfer Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trip Type</label>
                <select
                  value={tripType}
                  onChange={(e) => setTripType(e.target.value as TripType)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {Object.entries(tripTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TransferStatus)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {Object.entries(transferStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No. of Guests</label>
                <input
                  type="number"
                  value={numberOfGuests}
                  onChange={(e) => setNumberOfGuests(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. 9"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Link to Booking */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Link to Booking</h3>
            {linkedBooking ? (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {linkedBooking.bookingNumber} - {linkedBooking.customerName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {linkedBooking.title} | {linkedBooking.dateFrom}
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => { setLinkedBookingId(''); setLinkedBooking(null); }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Unlink
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    placeholder="Search booking by guest name, booking #..."
                    disabled={!canEdit}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                {bookingResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {bookingResults.map(b => (
                      <button
                        key={b.id}
                        onClick={() => fillFromBooking(b)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <span className="font-medium">{b.bookingNumber}</span>
                        <span className="text-gray-500"> - {b.customerName}</span>
                        <span className="text-gray-400 text-xs ml-2">{b.dateFrom}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Guest Info */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Guest Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Boat Name</label>
                <input
                  type="text"
                  value={boatName}
                  onChange={(e) => setBoatName(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. MY Hot Chilli"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name *</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. Valerie/Betti Eric"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. +33 6 22 38 49 00"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Pickup Details */}
          {showPickup && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Pick-up Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pick-up Date</label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pick-up Time</label>
                  <input
                    type="text"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g. 9:15 AM"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pick-up Location</label>
                  <input
                    type="text"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Hotel name / address"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google Maps Link
                    {pickupLocationUrl && (
                      <a href={pickupLocationUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:text-blue-700">
                        <ExternalLink className="inline h-3 w-3" />
                      </a>
                    )}
                  </label>
                  <input
                    type="url"
                    value={pickupLocationUrl}
                    onChange={(e) => setPickupLocationUrl(e.target.value)}
                    disabled={!canEdit}
                    placeholder="https://maps.app.goo.gl/..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Drop-off Location</label>
                  <input
                    type="text"
                    value={pickupDropoff}
                    onChange={(e) => setPickupDropoff(e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g. Chalong Pier Meeting Point"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Drop-off Maps Link
                    {pickupDropoffUrl && (
                      <a href={pickupDropoffUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:text-blue-700">
                        <ExternalLink className="inline h-3 w-3" />
                      </a>
                    )}
                  </label>
                  <input
                    type="url"
                    value={pickupDropoffUrl}
                    onChange={(e) => setPickupDropoffUrl(e.target.value)}
                    disabled={!canEdit}
                    placeholder="https://maps.app.goo.gl/..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Return Details */}
          {showReturn && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Return Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Time</label>
                  <input
                    type="text"
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g. 6:00 PM"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pick-up Location (Return)</label>
                  <input
                    type="text"
                    value={returnLocation}
                    onChange={(e) => setReturnLocation(e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g. Chalong Pier"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google Maps Link
                    {returnLocationUrl && (
                      <a href={returnLocationUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:text-blue-700">
                        <ExternalLink className="inline h-3 w-3" />
                      </a>
                    )}
                  </label>
                  <input
                    type="url"
                    value={returnLocationUrl}
                    onChange={(e) => setReturnLocationUrl(e.target.value)}
                    disabled={!canEdit}
                    placeholder="https://maps.app.goo.gl/..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Drop-off Location (Return)</label>
                  <input
                    type="text"
                    value={returnDropoff}
                    onChange={(e) => setReturnDropoff(e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g. Veranda Resort Phuket"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Drop-off Maps Link
                    {returnDropoffUrl && (
                      <a href={returnDropoffUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:text-blue-700">
                        <ExternalLink className="inline h-3 w-3" />
                      </a>
                    )}
                  </label>
                  <input
                    type="url"
                    value={returnDropoffUrl}
                    onChange={(e) => setReturnDropoffUrl(e.target.value)}
                    disabled={!canEdit}
                    placeholder="https://maps.app.goo.gl/..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Taxi Company & Driver */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Taxi Company & Driver</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taxi Company</label>
                <select
                  value={taxiCompanyId}
                  onChange={(e) => {
                    setTaxiCompanyId(e.target.value);
                    // Reset driver/vehicle selections when company changes
                    setTaxiDriverId('');
                    setTaxiVehicleId('');
                    setDriverName('');
                    setDriverPhone('');
                    setVanNumberPlate('');
                  }}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select company...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Driver dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                <select
                  value={taxiDriverId || '__custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__custom' || val === '') {
                      setTaxiDriverId('');
                      setDriverName('');
                      setDriverPhone('');
                    } else {
                      setTaxiDriverId(val);
                      const driver = companyDrivers.find(d => d.id === val);
                      if (driver) {
                        setDriverName(driver.name);
                        setDriverPhone(driver.phone || '');
                      }
                    }
                  }}
                  disabled={!canEdit || !taxiCompanyId}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {companyDrivers.length > 0 ? (
                    <>
                      <option value="">Select driver...</option>
                      {companyDrivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}{d.phone ? ` (${d.phone})` : ''}</option>
                      ))}
                      <option value="__custom">-- Type custom --</option>
                    </>
                  ) : (
                    <option value="__custom">{taxiCompanyId ? 'No drivers — type below' : 'Select a company first'}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => { setDriverName(e.target.value); if (taxiDriverId) setTaxiDriverId(''); }}
                  disabled={!canEdit}
                  placeholder="Assigned by taxi company"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver Phone</label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => { setDriverPhone(e.target.value); if (taxiDriverId) setTaxiDriverId(''); }}
                  disabled={!canEdit}
                  placeholder="Driver phone number"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Vehicle dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
                <select
                  value={taxiVehicleId || '__custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__custom' || val === '') {
                      setTaxiVehicleId('');
                      setVanNumberPlate('');
                    } else {
                      setTaxiVehicleId(val);
                      const vehicle = companyVehicles.find(v => v.id === val);
                      if (vehicle) {
                        setVanNumberPlate(vehicle.plateNumber);
                      }
                    }
                  }}
                  disabled={!canEdit || !taxiCompanyId}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {companyVehicles.length > 0 ? (
                    <>
                      <option value="">Select vehicle...</option>
                      {companyVehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.plateNumber}{v.description ? ` — ${v.description}` : ''}</option>
                      ))}
                      <option value="__custom">-- Type custom --</option>
                    </>
                  ) : (
                    <option value="__custom">{taxiCompanyId ? 'No vehicles — type below' : 'Select a company first'}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Van Number Plate</label>
                <input
                  type="text"
                  value={vanNumberPlate}
                  onChange={(e) => { setVanNumberPlate(e.target.value); if (taxiVehicleId) setTaxiVehicleId(''); }}
                  disabled={!canEdit}
                  placeholder="e.g. กข 1234"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Payment */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Payment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value as PaidBy)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {Object.entries(paidByLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g. 1400"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="THB">THB</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Note</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. Guests will pay 1400 THB cash to the driver for the round trip"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {paidBy === 'faraway' && (
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={farawayPaid}
                      onChange={(e) => setFarawayPaid(e.target.checked)}
                      disabled={!canEdit}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Faraway has paid the taxi company for this transfer
                  </label>
                </div>
              )}
            </div>
          </section>

          {/* Notes */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Notes</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Note for Guest</label>
                  <div className="flex items-center gap-2">
                    {noteTemplates.length > 0 && (
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => handleTemplateSelect(e.target.value)}
                        disabled={!canEdit}
                        className="text-xs px-2 py-1 border border-gray-200 rounded-md"
                      >
                        <option value="">Use template...</option>
                        {noteTemplates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    )}
                    <div className="flex border border-gray-200 rounded-md overflow-hidden">
                      <button
                        onClick={() => setTemplateLang('en')}
                        className={`text-xs px-2 py-1 ${templateLang === 'en' ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}
                      >
                        EN
                      </button>
                      <button
                        onClick={() => setTemplateLang('th')}
                        className={`text-xs px-2 py-1 ${templateLang === 'th' ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}
                      >
                        TH
                      </button>
                    </div>
                  </div>
                </div>
                <textarea
                  value={guestNote}
                  onChange={(e) => setGuestNote(e.target.value)}
                  disabled={!canEdit}
                  rows={3}
                  placeholder="Note to send to the guest..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note for Driver</label>
                <textarea
                  value={driverNote}
                  onChange={(e) => setDriverNote(e.target.value)}
                  disabled={!canEdit}
                  rows={2}
                  placeholder="Instructions for the driver..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Transfer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
