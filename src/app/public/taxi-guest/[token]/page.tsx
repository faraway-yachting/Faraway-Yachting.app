'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Car, MapPin, Clock, Users, Phone, ExternalLink, Check, User } from 'lucide-react';

interface BookingInfo {
  guestName: string;
  bookingNumber: string;
  boatName: string;
  dateFrom: string;
  dateTo: string;
}

interface GuestTransfer {
  id: string;
  transferNumber: string;
  tripType: string;
  status: string;
  boatName?: string;
  guestName: string;
  contactNumber?: string;
  numberOfGuests?: number;
  pickupDate?: string;
  pickupTime?: string;
  pickupLocation?: string;
  pickupLocationUrl?: string;
  pickupDropoff?: string;
  pickupDropoffUrl?: string;
  returnDate?: string;
  returnTime?: string;
  returnLocation?: string;
  returnLocationUrl?: string;
  returnDropoff?: string;
  returnDropoffUrl?: string;
  driverName?: string;
  driverPhone?: string;
  vanNumberPlate?: string;
  driverNote?: string;
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  assigned: 'Driver Assigned',
  completed: 'Completed',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  assigned: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-600',
};

export default function PublicTaxiGuestPage() {
  const params = useParams();
  const token = params.token as string;

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [transfers, setTransfers] = useState<GuestTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/taxi-guest/${token}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to load');
        return;
      }
      const data = await res.json();
      setBooking(data.booking || null);
      setTransfers(data.transfers || []);
    } catch {
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Car className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-900">Unavailable</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#0f2744] text-white py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Faraway Yachting</h1>
              <p className="text-blue-200 text-sm">Your Taxi Transfers</p>
            </div>
          </div>
          {booking && (
            <div className="bg-white/10 rounded-lg px-4 py-3 mt-3">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {booking.guestName && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-blue-200" />
                    <span>{booking.guestName}</span>
                  </div>
                )}
                {booking.boatName && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-200">Boat:</span>
                    <span>{booking.boatName}</span>
                  </div>
                )}
                {booking.dateFrom && booking.dateTo && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-200" />
                    <span>{formatDate(booking.dateFrom)} — {formatDate(booking.dateTo)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto py-6 px-4">
        {transfers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Car className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No taxi transfers for this booking</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transfers.map(transfer => (
              <div key={transfer.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[transfer.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabels[transfer.status] || transfer.status}
                    </span>
                    {transfer.tripType === 'round_trip' && (
                      <span className="text-xs text-gray-500">Round Trip</span>
                    )}
                  </div>
                  {transfer.numberOfGuests && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Users className="h-3.5 w-3.5" />
                      <span>{transfer.numberOfGuests} pax</span>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-5 space-y-4">
                  {/* Pick-up */}
                  {transfer.tripType !== 'return_only' && transfer.pickupDate && (
                    <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Pick-up</p>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(transfer.pickupDate)} {transfer.pickupTime && `at ${transfer.pickupTime}`}
                        </span>
                      </div>
                      {transfer.pickupLocation && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-blue-500 mt-0.5" />
                          <div>
                            <span className="text-sm text-gray-900">{transfer.pickupLocation}</span>
                            {transfer.pickupLocationUrl && (
                              <a href={transfer.pickupLocationUrl} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-blue-600 hover:text-blue-800 inline-flex items-center">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                      {transfer.pickupDropoff && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-green-500 mt-0.5" />
                          <div>
                            <span className="text-sm text-gray-600">Drop-off: {transfer.pickupDropoff}</span>
                            {transfer.pickupDropoffUrl && (
                              <a href={transfer.pickupDropoffUrl} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-blue-600 hover:text-blue-800 inline-flex items-center">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Return */}
                  {transfer.tripType !== 'pickup_only' && transfer.returnDate && (
                    <div className="bg-orange-50 rounded-lg p-4 space-y-2">
                      <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Return</p>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(transfer.returnDate)} {transfer.returnTime && `at ${transfer.returnTime}`}
                        </span>
                      </div>
                      {transfer.returnLocation && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-orange-500 mt-0.5" />
                          <div>
                            <span className="text-sm text-gray-900">{transfer.returnLocation}</span>
                            {transfer.returnLocationUrl && (
                              <a href={transfer.returnLocationUrl} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-blue-600 hover:text-blue-800 inline-flex items-center">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                      {transfer.returnDropoff && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-green-500 mt-0.5" />
                          <div>
                            <span className="text-sm text-gray-600">Drop-off: {transfer.returnDropoff}</span>
                            {transfer.returnDropoffUrl && (
                              <a href={transfer.returnDropoffUrl} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-blue-600 hover:text-blue-800 inline-flex items-center">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Driver note */}
                  {transfer.driverNote && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Note</p>
                      <p className="text-sm text-gray-700">{transfer.driverNote}</p>
                    </div>
                  )}

                  {/* Driver info */}
                  {transfer.driverName && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">Your Driver</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{transfer.driverName}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {transfer.driverPhone && (
                              <a href={`tel:${transfer.driverPhone}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {transfer.driverPhone}
                              </a>
                            )}
                            {transfer.vanNumberPlate && (
                              <span className="text-sm text-gray-500">
                                <Car className="h-3 w-3 inline mr-1" />
                                {transfer.vanNumberPlate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pending status message */}
                  {!transfer.driverName && transfer.status !== 'completed' && (
                    <div className="bg-yellow-50 rounded-lg p-3 text-center">
                      <p className="text-sm text-yellow-700">Driver details will appear here once assigned</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          Faraway Yachting - Taxi Transfers
        </div>
      </div>
    </div>
  );
}
