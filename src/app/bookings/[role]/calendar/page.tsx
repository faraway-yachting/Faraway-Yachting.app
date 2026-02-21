'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar as CalendarIcon, Ship, BedDouble } from 'lucide-react';
import { BookingCalendar } from '@/components/bookings/BookingCalendar';
import { CalendarDisplayPopover } from '@/components/bookings/CalendarDisplayPopover';
import { BookingForm } from '@/components/bookings/BookingForm';
import { Booking, BookingType, BookingStatus } from '@/data/booking/types';
import { Project } from '@/data/project/types';
import { Currency } from '@/data/company/types';
import { bookingsApi, createBookingWithNumber } from '@/lib/supabase/api/bookings';
import { cabinAllocationsApi } from '@/lib/supabase/api/cabinAllocations';
import { bookingPaymentsApi } from '@/lib/supabase/api/bookingPayments';
import { taxiTransfersApi } from '@/lib/supabase/api/taxiTransfers';
import { projectCabinsApi } from '@/lib/supabase/api/projectCabins';
import { yachtProductsApi } from '@/lib/supabase/api/yachtProducts';
import { useYachtProjects } from '@/hooks/queries/useProjects';
import { useBookingsByMonth } from '@/hooks/queries/useBookings';
import { useDataScope } from '@/hooks/useDataScope';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useBookingSettings } from '@/contexts/BookingSettingsContext';
import { useAuth } from '@/components/auth';

export default function BookingCalendarPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = params.role as string;

  // Get user's actual role from auth context (database-enforced)
  const { user, getModuleRole, isSuperAdmin, hasPermission } = useAuth();
  const userBookingsRole = getModuleRole('bookings');

  // Limited view: user can only see booking status (no financial details)
  // Users with full calendar.view permission see everything; others get status-only view
  const isAgencyView = !isSuperAdmin && !hasPermission('bookings.calendar.view');

  // Can create if user has the booking.create permission
  const canCreate = isSuperAdmin || hasPermission('bookings.booking.create');

  // Get boat color settings and banner
  const { getBoatColor, bannerImageUrl, calendarDisplay } = useBookingSettings();

  const queryClient = useQueryClient();

  // Pre-filled booking from URL params (from Quotation/Invoice/Receipt)
  const [prefilledBooking, setPrefilledBooking] = useState<Partial<Booking> | null>(null);

  // Calendar state
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  // Data scoping — restricted roles only see their assigned projects
  const { projectIds } = useDataScope();

  // Data via React Query (cached, auto-refreshes when stale)
  const { data: projects = [], isLoading: projectsLoading } = useYachtProjects(projectIds);
  const { data: bookings = [], isLoading: bookingsLoading } = useBookingsByMonth(currentYear, currentMonth, projectIds);
  const isLoading = projectsLoading || bookingsLoading;

  // Load cabin counts for cabin charter bookings
  const [cabinCounts, setCabinCounts] = useState<Map<string, { total: number; booked: number }>>(new Map());
  useEffect(() => {
    const cabinBookingIds = bookings
      .filter(b => b.type === 'cabin_charter')
      .map(b => b.id);
    if (cabinBookingIds.length === 0) return; // Keep existing empty map, avoid new reference
    cabinAllocationsApi.getCabinCountsByBookingIds(cabinBookingIds)
      .then(setCabinCounts)
      .catch(() => {}); // Silently ignore if table doesn't exist yet
  }, [bookings]);

  // Load payment totals for balance due display
  const [paymentTotals, setPaymentTotals] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    const ids = bookings.map(b => b.id);
    if (ids.length === 0) return;
    bookingPaymentsApi.getPaidTotalsByBookingIds(ids)
      .then(setPaymentTotals)
      .catch(() => {});
  }, [bookings]);

  // Load taxi transfer counts per booking
  const [taxiCounts, setTaxiCounts] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    const ids = bookings.map(b => b.id);
    if (ids.length === 0) return;
    taxiTransfersApi.getTaxiCountsByBookingIds(ids)
      .then(setTaxiCounts)
      .catch(() => {});
  }, [bookings]);

  // Real-time updates: when another user creates/edits a booking, this calendar auto-refreshes
  useRealtimeSubscription([{
    table: 'bookings',
    event: '*',
    queryKeys: [['bookings']],
  }]);

  // Filter state - null means "All Bookings"
  const [selectedBoatFilter, setSelectedBoatFilter] = useState<string | null>(null);

  // Modal state
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Handle URL parameters for pre-filled booking (from Quotation/Invoice/Receipt)
  useEffect(() => {
    const newBooking = searchParams.get('newBooking');
    if (newBooking === 'true' && canCreate) {
      // Parse URL parameters to create pre-filled booking data
      const status = searchParams.get('status') as BookingStatus || 'enquiry';
      const type = searchParams.get('type') as BookingType || 'day_charter';
      const title = searchParams.get('title') || '';
      const customerName = searchParams.get('customerName') || '';
      const dateFrom = searchParams.get('dateFrom') || new Date().toISOString().split('T')[0];
      const dateTo = searchParams.get('dateTo') || dateFrom;
      const time = searchParams.get('time') || '';
      const projectId = searchParams.get('projectId') || undefined;
      const externalBoatName = searchParams.get('externalBoatName') || '';
      const totalPrice = searchParams.get('totalPrice') ? parseFloat(searchParams.get('totalPrice')!) : undefined;
      const currency = (searchParams.get('currency') as Currency) || 'THB';
      const sourceDoc = searchParams.get('sourceDoc') || '';

      // Build pre-filled booking object
      const prefilled: Partial<Booking> = {
        status,
        type,
        title,
        customerName,
        dateFrom,
        dateTo,
        time,
        currency,
        totalPrice,
        internalNotes: sourceDoc ? `Source: ${sourceDoc}` : '',
      };

      // Set boat info - either projectId or externalBoatName
      if (projectId) {
        prefilled.projectId = projectId;
      } else if (externalBoatName) {
        prefilled.externalBoatName = externalBoatName;
      }

      setPrefilledBooking(prefilled);
      setSelectedDate(dateFrom);
      setShowBookingForm(true);

      // Clear URL parameters to prevent re-opening on refresh
      router.replace(`/bookings/${role}/calendar`, { scroll: false });
    }
  }, [searchParams, canCreate, role, router]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    // Filter by boat
    if (selectedBoatFilter === 'external') {
      result = result.filter(b => !b.projectId || b.externalBoatName);
    } else if (selectedBoatFilter) {
      result = result.filter(b => b.projectId === selectedBoatFilter);
    }

    return result;
  }, [bookings, selectedBoatFilter]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Build prefilled booking data from selected boat tab
  const buildBoatPrefill = (): Partial<Booking> | null => {
    if (!selectedBoatFilter || selectedBoatFilter === 'external') return null;
    const project = projects.find(p => p.id === selectedBoatFilter);
    if (!project) return null;
    return { projectId: project.id };
  };

  // Quick-create cabin charter with flexible schedule
  const handleQuickCreateCabinCharter = async () => {
    const projectId = selectedBoatFilter && selectedBoatFilter !== 'external'
      ? selectedBoatFilter
      : projects[0]?.id;
    if (!projectId) return;

    const prefill: Partial<Booking> = {
      projectId,
      type: 'cabin_charter' as BookingType,
      title: 'Cabin Charter',
    };

    // Look up cabin charter product for schedule defaults
    try {
      const product = await yachtProductsApi.findMatchingProduct('own', projectId, 'cabin_charter');
      if (product?.defaultStartDay !== undefined && product?.defaultNights) {
        // Calculate next occurrence of the start day
        const today = new Date();
        const currentDay = today.getDay(); // 0=Sun
        let daysUntilStart = product.defaultStartDay - currentDay;
        if (daysUntilStart <= 0) daysUntilStart += 7; // Next week if today or past

        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() + daysUntilStart);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + product.defaultNights);

        prefill.dateFrom = startDate.toISOString().split('T')[0];
        prefill.dateTo = endDate.toISOString().split('T')[0];
        if (product.name) prefill.title = product.name;
        if (product.price) prefill.totalPrice = product.price;
        if (product.currency) prefill.currency = product.currency;
        if (product.departFrom) prefill.departureFrom = product.departFrom;
        if (product.destination) prefill.destination = product.destination;
      }
    } catch (err) {
      console.error('Error loading cabin charter product:', err);
    }

    setPrefilledBooking(prefill);
    setSelectedBooking(null);
    setSelectedDate(null);
    setShowBookingForm(true);
  };

  // Booking handlers
  const handleDateClick = (date: string) => {
    if (!canCreate) return;
    let prefill = buildBoatPrefill();
    // If no boat selected in filter, default to first project to satisfy DB constraint
    if (!prefill && projects.length > 0) {
      prefill = { projectId: projects[0].id };
    }
    if (!prefill) return; // No projects available at all

    // Open form with prefilled data - NO database record yet
    setPrefilledBooking({
      ...prefill,
      dateFrom: date,
      dateTo: date,
    });
    setSelectedBooking(null);
    setSelectedDate(date);
    setShowBookingForm(true);
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setSelectedDate(null);
    setShowBookingForm(true);
  };

  const handleSaveBooking = async (bookingData: Partial<Booking>) => {
    if (selectedBooking) {
      // Update existing booking
      await bookingsApi.update(selectedBooking.id, bookingData);
    } else {
      // Create NEW booking (only happens on explicit save)
      await createBookingWithNumber({
        ...bookingData,
        bookingOwner: bookingData.bookingOwner || undefined,
      });
    }

    // Invalidate cache so React Query refetches
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    setShowBookingForm(false);
    setSelectedBooking(null);
    setSelectedDate(null);
    setPrefilledBooking(null);
  };

  const handleDeleteBooking = async (id: string) => {
    await bookingsApi.delete(id);
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    setShowBookingForm(false);
    setSelectedBooking(null);
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
      {/* Banner Image */}
      {bannerImageUrl && (
        <div className="w-full overflow-hidden rounded-lg">
          <img
            src={bannerImageUrl}
            alt="Calendar banner"
            className="w-full object-cover"
            style={{ height: '189px' }}
          />
        </div>
      )}

      {/* Filter tabs row - Notion style */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {/* All Bookings tab */}
          <button
            onClick={() => setSelectedBoatFilter(null)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors
              ${selectedBoatFilter === null
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
              }
            `}
          >
            <CalendarIcon className="h-4 w-4" />
            All Bookings
          </button>

          {/* External/General tab - hidden for agency view */}
          {!isAgencyView && (
            <button
              onClick={() => setSelectedBoatFilter('external')}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors
                ${selectedBoatFilter === 'external'
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
              style={selectedBoatFilter === 'external' ? {
                backgroundColor: getBoatColor('external'),
              } : undefined}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getBoatColor('external') }}
              />
              Other Boat + General
            </button>
          )}

          {/* Boat tabs */}
          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => setSelectedBoatFilter(project.id)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors
                ${selectedBoatFilter === project.id
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
              style={selectedBoatFilter === project.id ? {
                backgroundColor: getBoatColor(project.id),
              } : undefined}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getBoatColor(project.id) }}
              />
              {project.name}
            </button>
          ))}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          {/* Display settings */}
          <CalendarDisplayPopover />

          {/* Add booking buttons */}
          {canCreate && (
            <>
              <button
                onClick={handleQuickCreateCabinCharter}
                className="flex items-center gap-2 px-3 py-2 text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium"
              >
                <BedDouble className="h-4 w-4" />
                <span>Cabin Charter</span>
              </button>
              <button
                onClick={() => {
                  const prefill = buildBoatPrefill();
                  setPrefilledBooking(prefill);
                  setSelectedBooking(null);
                  setSelectedDate(null);
                  setShowBookingForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>New</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Calendar */}
      <BookingCalendar
        year={currentYear}
        month={currentMonth}
        bookings={filteredBookings}
        projects={projects}
        viewMode="month"
        onDateClick={canCreate ? handleDateClick : undefined}
        onBookingClick={handleBookingClick}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        isAgencyView={isAgencyView}
        getBoatColor={getBoatColor}
        selectedBoatFilter={selectedBoatFilter}
        allBookingsDisplayFields={calendarDisplay.allBookingsFields}
        boatTabDisplayFields={calendarDisplay.boatTabFields}
        cabinCounts={cabinCounts}
        paymentTotals={paymentTotals}
        taxiCounts={taxiCounts}
      />

      {/* Booking Form Modal */}
      {showBookingForm && (
        <BookingForm
          booking={selectedBooking}
          defaultDate={selectedDate || undefined}
          prefilled={prefilledBooking}
          projects={projects}
          onSave={handleSaveBooking}
          onDelete={selectedBooking ? () => handleDeleteBooking(selectedBooking.id) : undefined}
          onClose={() => {
            setShowBookingForm(false);
            setSelectedBooking(null);
            setSelectedDate(null);
            setPrefilledBooking(null); // Clear prefilled data
          }}
          isAgencyView={isAgencyView}
          canEdit={canCreate}
        />
      )}
    </div>
  );
}
