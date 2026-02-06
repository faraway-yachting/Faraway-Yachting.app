'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Booking, BookingStatus, BookingType, PaymentStatus, bookingStatusLabels, bookingStatusColors, bookingTypeLabels, paymentStatusLabels } from '@/data/booking/types';
import { Project } from '@/data/project/types';
import { bookingsApi } from '@/lib/supabase/api/bookings';
import { useAllBookings } from '@/hooks/queries/useBookings';
import { useYachtProjects } from '@/hooks/queries/useProjects';
import { BookingForm } from '@/components/bookings/BookingForm';
import { useAuth } from '@/components/auth';
import { useDataScope } from '@/hooks/useDataScope';

export default function BookingsListPage() {
  const params = useParams();
  const role = params.role as string;

  const { user, getModuleRole, isSuperAdmin, hasPermission } = useAuth();
  const userBookingsRole = getModuleRole('bookings');
  // Limited view: users without full booking.view see reduced info (no financial data)
  const isAgencyView = !isSuperAdmin && !hasPermission('bookings.booking.view');
  const canEdit = isSuperAdmin || hasPermission('bookings.booking.edit');

  const queryClient = useQueryClient();
  const { projectIds } = useDataScope();

  // Data via React Query (scoped by user access)
  const { data: bookings = [], isLoading: bookingsLoading } = useAllBookings(projectIds);
  const { data: projects = [], isLoading: projectsLoading } = useYachtProjects(projectIds);
  const isLoading = bookingsLoading || projectsLoading;

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [boatFilter, setBoatFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  // Modal
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Project lookup
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach(p => map.set(p.id, p));
    return map;
  }, [projects]);

  const getBoatName = (booking: Booking): string => {
    if (booking.externalBoatName) return booking.externalBoatName;
    if (booking.projectId) {
      return projectMap.get(booking.projectId)?.name || 'Unknown';
    }
    return 'External';
  };

  // Filter
  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    if (statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter);
    }
    if (boatFilter === 'external') {
      result = result.filter(b => !b.projectId || b.externalBoatName);
    } else if (boatFilter !== 'all') {
      result = result.filter(b => b.projectId === boatFilter);
    }
    if (typeFilter !== 'all') {
      result = result.filter(b => b.type === typeFilter);
    }
    if (paymentFilter !== 'all') {
      result = result.filter(b => b.paymentStatus === paymentFilter);
    }
    if (dateFrom) {
      result = result.filter(b => b.dateFrom >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(b => b.dateTo <= dateTo);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(b =>
        b.title?.toLowerCase().includes(q) ||
        b.customerName?.toLowerCase().includes(q) ||
        b.bookingNumber?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [bookings, statusFilter, boatFilter, typeFilter, paymentFilter, dateFrom, dateTo, search]);

  // Handlers
  const handleRowClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowBookingForm(true);
  };

  const handleSaveBooking = async (bookingData: Partial<Booking>) => {
    if (selectedBooking) {
      await bookingsApi.update(selectedBooking.id, bookingData);
    }
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    setShowBookingForm(false);
    setSelectedBooking(null);
  };

  const handleDeleteBooking = async (id: string) => {
    await bookingsApi.delete(id);
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    setShowBookingForm(false);
    setSelectedBooking(null);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatPrice = (amount?: number, currency?: string) => {
    if (!amount) return '';
    return `${currency || 'THB'} ${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Bookings List</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Title, customer, booking #..."
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              {Object.entries(bookingStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Boat */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Boat</label>
            <select
              value={boatFilter}
              onChange={(e) => setBoatFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Boats</option>
              <option value="external">External / Other</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {Object.entries(bookingTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Payment */}
          {!isAgencyView && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Payment</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All</option>
                {Object.entries(paymentStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date From */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boat</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date From</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date To</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Guests</th>
                {!isAgencyView && (
                  <>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={isAgencyView ? 9 : 12} className="px-4 py-12 text-center text-gray-500">
                    No bookings found
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => {
                  const statusColor = bookingStatusColors[booking.status];
                  return (
                    <tr
                      key={booking.id}
                      onClick={() => handleRowClick(booking)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{booking.bookingNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                          {bookingStatusLabels[booking.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[200px] truncate">{booking.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{getBoatName(booking)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{bookingTypeLabels[booking.type] || booking.type}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{booking.customerName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(booking.dateFrom)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(booking.dateTo)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{booking.numberOfGuests || '-'}</td>
                      {!isAgencyView && (
                        <>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatPrice(booking.totalPrice, booking.currency)}</td>
                          <td className="px-4 py-3">
                            {booking.paymentStatus ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                booking.paymentStatus === 'paid' ? 'bg-green-50 text-green-700' :
                                booking.paymentStatus === 'partial' ? 'bg-yellow-50 text-yellow-700' :
                                'bg-red-50 text-red-700'
                              }`}>
                                {paymentStatusLabels[booking.paymentStatus]}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{booking.bookingOwnerName || '-'}</td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && (
        <BookingForm
          booking={selectedBooking}
          projects={projects}
          onSave={handleSaveBooking}
          onDelete={selectedBooking ? () => handleDeleteBooking(selectedBooking.id) : undefined}
          onClose={() => {
            setShowBookingForm(false);
            setSelectedBooking(null);
          }}
          isAgencyView={isAgencyView}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
