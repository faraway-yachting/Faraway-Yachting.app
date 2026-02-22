'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Trash2, Search, ExternalLink, Link2, Check, MapPin, Clock, Users, CreditCard, MessageSquare, Car, User, FileDown } from 'lucide-react';
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
import { taxiBookingLinksApi } from '@/lib/supabase/api/taxiBookingLinks';
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleShareLink = async () => {
    const bId = linkedBookingId;
    if (!bId) return;
    try {
      setGeneratingLink(true);
      const existing = await taxiBookingLinksApi.getByBookingId(bId);
      const link = existing.length > 0
        ? existing[0]
        : await taxiBookingLinksApi.create({ bookingId: bId, label: 'Guest Link' });
      const url = `${window.location.origin}/public/taxi-guest/${link.token}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to generate share link:', err);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const { generateTaxiTransferPdf } = await import('@/lib/pdf/generateTaxiTransferPdf');
      const selectedCompany = companies.find(c => c.id === taxiCompanyId);
      await generateTaxiTransferPdf({
        transferNumber: transfer?.transferNumber,
        tripType,
        status,
        guestName,
        boatName: boatName || undefined,
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
        taxiCompanyName: selectedCompany?.name || undefined,
        driverName: driverName || undefined,
        driverPhone: driverPhone || undefined,
        vanNumberPlate: vanNumberPlate || undefined,
        paidBy,
        amount: amount ? parseFloat(amount) : undefined,
        currency,
        paymentNote: paymentNote || undefined,
        guestNote: guestNote || undefined,
        driverNote: driverNote || undefined,
      });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

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

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors';
  const labelClass = 'block text-xs font-medium text-gray-500 mb-1.5';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#1e3a5f] to-[#2a5280] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
              <Car className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {isEditing ? `Transfer ${transfer.transferNumber}` : 'New Taxi Transfer'}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                {isEditing && (
                  <span className="text-xs text-blue-200">Created {new Date(transfer.createdAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {linkedBookingId && (
              <button
                onClick={handleShareLink}
                disabled={generatingLink}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  copiedLink
                    ? 'bg-green-500/20 text-green-200 border border-green-400/30'
                    : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                }`}
                title="Copy guest link to clipboard"
              >
                {generatingLink ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/40 border-t-white" />
                ) : copiedLink ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Link2 className="h-3 w-3" />
                )}
                {copiedLink ? 'Copied!' : 'Guest Link'}
              </button>
            )}
            {isEditing && (
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all"
                title="Download PDF"
              >
                {downloadingPdf ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/40 border-t-white" />
                ) : (
                  <FileDown className="h-3 w-3" />
                )}
                PDF
              </button>
            )}
            {isEditing && canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 text-white/60 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
                title="Delete transfer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Transfer Info + Booking — compact top bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Trip Type</label>
                <select value={tripType} onChange={(e) => setTripType(e.target.value as TripType)} disabled={!canEdit} className={inputClass}>
                  {Object.entries(tripTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as TransferStatus)} disabled={!canEdit} className={inputClass}>
                  {Object.entries(transferStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>No. of Guests</label>
                <div className="relative">
                  <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input type="number" value={numberOfGuests} onChange={(e) => setNumberOfGuests(e.target.value)} disabled={!canEdit} placeholder="e.g. 9" className={`${inputClass} pl-8`} />
                </div>
              </div>
            </div>

            {/* Link to Booking — inline */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <label className={labelClass}>Linked Booking</label>
              {linkedBooking ? (
                <div className="flex items-center gap-3 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Search className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {linkedBooking.bookingNumber} — {linkedBooking.customerName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{linkedBooking.title} | {linkedBooking.dateFrom}</p>
                  </div>
                  {canEdit && (
                    <button onClick={() => { setLinkedBookingId(''); setLinkedBooking(null); }} className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50">
                      Unlink
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input type="text" value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)} placeholder="Search booking by guest name, booking #..." disabled={!canEdit} className={`${inputClass} pl-8`} />
                  {bookingResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {bookingResults.map(b => (
                        <button key={b.id} onClick={() => fillFromBooking(b)} className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-b-0 transition-colors">
                          <span className="font-medium text-gray-900">{b.bookingNumber}</span>
                          <span className="text-gray-500"> — {b.customerName}</span>
                          <span className="text-gray-400 text-xs ml-2">{b.dateFrom}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Guest Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-gray-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Guest Info</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Boat Name</label>
                <input type="text" value={boatName} onChange={(e) => setBoatName(e.target.value)} disabled={!canEdit} placeholder="e.g. MY Hot Chilli" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Guest Name <span className="text-red-400">*</span></label>
                <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} disabled={!canEdit} placeholder="e.g. Valerie/Betti Eric" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Contact Number</label>
                <input type="text" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} disabled={!canEdit} placeholder="e.g. +33 6 22 38 49 00" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Pickup Details */}
          {showPickup && (
            <div className="bg-blue-50/70 rounded-xl border border-blue-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
                  <MapPin className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-blue-800">Pick-up</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Date</label>
                  <div className="relative">
                    <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-400" />
                    <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} disabled={!canEdit} className={`${inputClass} pl-8`} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Time</label>
                  <input type="text" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} disabled={!canEdit} placeholder="e.g. 9:15 AM" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Pick-up Location</label>
                  <input type="text" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} disabled={!canEdit} placeholder="Hotel name / address" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>
                    Maps Link
                    {pickupLocationUrl && (
                      <a href={pickupLocationUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:text-blue-700 inline-flex items-center">
                        <ExternalLink className="inline h-3 w-3" />
                      </a>
                    )}
                  </label>
                  <input type="url" value={pickupLocationUrl} onChange={(e) => setPickupLocationUrl(e.target.value)} disabled={!canEdit} placeholder="https://maps.app.goo.gl/..." className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Drop-off Location</label>
                  <input type="text" value={pickupDropoff} onChange={(e) => setPickupDropoff(e.target.value)} disabled={!canEdit} placeholder="e.g. Chalong Pier Meeting Point" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>
                    Drop-off Maps Link
                    {pickupDropoffUrl && (
                      <a href={pickupDropoffUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:text-blue-700 inline-flex items-center">
                        <ExternalLink className="inline h-3 w-3" />
                      </a>
                    )}
                  </label>
                  <input type="url" value={pickupDropoffUrl} onChange={(e) => setPickupDropoffUrl(e.target.value)} disabled={!canEdit} placeholder="https://maps.app.goo.gl/..." className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {/* Return Details */}
          {showReturn && (
            <div className="bg-orange-50/70 rounded-xl border border-orange-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-orange-100 rounded-md flex items-center justify-center">
                  <MapPin className="h-3.5 w-3.5 text-orange-600" />
                </div>
                <h3 className="text-sm font-semibold text-orange-800">Return</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Date</label>
                  <div className="relative">
                    <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-orange-400" />
                    <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} disabled={!canEdit} className={`${inputClass} pl-8`} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Time</label>
                  <input type="text" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} disabled={!canEdit} placeholder="e.g. 6:00 PM" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Pick-up Location (Return)</label>
                  <input type="text" value={returnLocation} onChange={(e) => setReturnLocation(e.target.value)} disabled={!canEdit} placeholder="e.g. Chalong Pier" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>
                    Maps Link
                    {returnLocationUrl && (
                      <a href={returnLocationUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:text-blue-700 inline-flex items-center">
                        <ExternalLink className="inline h-3 w-3" />
                      </a>
                    )}
                  </label>
                  <input type="url" value={returnLocationUrl} onChange={(e) => setReturnLocationUrl(e.target.value)} disabled={!canEdit} placeholder="https://maps.app.goo.gl/..." className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Drop-off Location (Return)</label>
                  <input type="text" value={returnDropoff} onChange={(e) => setReturnDropoff(e.target.value)} disabled={!canEdit} placeholder="e.g. Veranda Resort Phuket" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>
                    Drop-off Maps Link
                    {returnDropoffUrl && (
                      <a href={returnDropoffUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:text-blue-700 inline-flex items-center">
                        <ExternalLink className="inline h-3 w-3" />
                      </a>
                    )}
                  </label>
                  <input type="url" value={returnDropoffUrl} onChange={(e) => setReturnDropoffUrl(e.target.value)} disabled={!canEdit} placeholder="https://maps.app.goo.gl/..." className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {/* Taxi Company & Driver */}
          <div className="bg-green-50/70 rounded-xl border border-green-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center">
                <Car className="h-3.5 w-3.5 text-green-600" />
              </div>
              <h3 className="text-sm font-semibold text-green-800">Taxi Company & Driver</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Taxi Company</label>
                <select
                  value={taxiCompanyId}
                  onChange={(e) => {
                    setTaxiCompanyId(e.target.value);
                    setTaxiDriverId(''); setTaxiVehicleId('');
                    setDriverName(''); setDriverPhone(''); setVanNumberPlate('');
                  }}
                  disabled={!canEdit}
                  className={inputClass}
                >
                  <option value="">Select company...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Driver</label>
                <select
                  value={taxiDriverId || '__custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__custom' || val === '') {
                      setTaxiDriverId(''); setDriverName(''); setDriverPhone('');
                    } else {
                      setTaxiDriverId(val);
                      const driver = companyDrivers.find(d => d.id === val);
                      if (driver) {
                        setDriverName(driver.name);
                        setDriverPhone(driver.phone || '');
                        if (driver.defaultVehicleId) {
                          const vehicle = companyVehicles.find(v => v.id === driver.defaultVehicleId);
                          if (vehicle) { setTaxiVehicleId(driver.defaultVehicleId); setVanNumberPlate(vehicle.plateNumber); }
                        }
                      }
                    }
                  }}
                  disabled={!canEdit || !taxiCompanyId}
                  className={inputClass}
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
                <label className={labelClass}>Driver Name</label>
                <input type="text" value={driverName} onChange={(e) => { setDriverName(e.target.value); if (taxiDriverId) setTaxiDriverId(''); }} disabled={!canEdit} placeholder="Assigned by taxi company" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Driver Phone</label>
                <input type="text" value={driverPhone} onChange={(e) => { setDriverPhone(e.target.value); if (taxiDriverId) setTaxiDriverId(''); }} disabled={!canEdit} placeholder="Driver phone number" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Vehicle</label>
                <select
                  value={taxiVehicleId || '__custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__custom' || val === '') {
                      setTaxiVehicleId(''); setVanNumberPlate('');
                    } else {
                      setTaxiVehicleId(val);
                      const vehicle = companyVehicles.find(v => v.id === val);
                      if (vehicle) setVanNumberPlate(vehicle.plateNumber);
                    }
                  }}
                  disabled={!canEdit || !taxiCompanyId}
                  className={inputClass}
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
                <label className={labelClass}>Van Number Plate</label>
                <input type="text" value={vanNumberPlate} onChange={(e) => { setVanNumberPlate(e.target.value); if (taxiVehicleId) setTaxiVehicleId(''); }} disabled={!canEdit} placeholder="e.g. กข 1234" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center">
                <CreditCard className="h-3.5 w-3.5 text-purple-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Payment</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Paid By</label>
                <select value={paidBy} onChange={(e) => setPaidBy(e.target.value as PaidBy)} disabled={!canEdit} className={inputClass}>
                  {Object.entries(paidByLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelClass}>Amount</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!canEdit} placeholder="e.g. 1400" className={inputClass} />
                </div>
                <div className="w-24">
                  <label className={labelClass}>Currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={!canEdit} className={inputClass}>
                    <option value="THB">THB</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Payment Note</label>
                <input type="text" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} disabled={!canEdit} placeholder="e.g. Guests will pay 1400 THB cash to the driver for the round trip" className={inputClass} />
              </div>
              {paidBy === 'faraway' && (
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={farawayPaid} onChange={(e) => setFarawayPaid(e.target.checked)} disabled={!canEdit} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    Faraway has paid the taxi company for this transfer
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-amber-100 rounded-md flex items-center justify-center">
                <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Notes</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelClass}>Note for Guest</label>
                  <div className="flex items-center gap-2">
                    {noteTemplates.length > 0 && (
                      <select value={selectedTemplateId} onChange={(e) => handleTemplateSelect(e.target.value)} disabled={!canEdit} className="text-xs px-2 py-1 border border-gray-200 rounded-md bg-white">
                        <option value="">Use template...</option>
                        {noteTemplates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    )}
                    <div className="flex border border-gray-200 rounded-md overflow-hidden">
                      <button onClick={() => setTemplateLang('en')} className={`text-xs px-2 py-1 ${templateLang === 'en' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>EN</button>
                      <button onClick={() => setTemplateLang('th')} className={`text-xs px-2 py-1 ${templateLang === 'th' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>TH</button>
                    </div>
                  </div>
                </div>
                <textarea value={guestNote} onChange={(e) => setGuestNote(e.target.value)} disabled={!canEdit} rows={3} placeholder="Note to send to the guest..." className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Note for Driver</label>
                <textarea value={driverNote} onChange={(e) => setDriverNote(e.target.value)} disabled={!canEdit} rows={2} placeholder="Instructions for the driver..." className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-200 bg-white flex items-center justify-end gap-2.5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Transfer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
