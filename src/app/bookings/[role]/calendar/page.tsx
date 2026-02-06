'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar as CalendarIcon, Ship } from 'lucide-react';
import { BookingCalendar } from '@/components/bookings/BookingCalendar';
import { CalendarDisplayPopover } from '@/components/bookings/CalendarDisplayPopover';
import { BookingForm } from '@/components/bookings/BookingForm';
import { Booking, BookingType, BookingStatus } from '@/data/booking/types';
import { Project } from '@/data/project/types';
import { Currency } from '@/data/company/types';
import { bookingsApi } from '@/lib/supabase/api/bookings';
import { useYachtProjects } from '@/hooks/queries/useProjects';
import { useBookingsByMonth } from '@/hooks/queries/useBookings';
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

  // Data via React Query (cached, auto-refreshes when stale)
  const { data: projects = [], isLoading: projectsLoading } = useYachtProjects();
  const { data: bookings = [], isLoading: bookingsLoading } = useBookingsByMonth(currentYear, currentMonth);
  const isLoading = projectsLoading || bookingsLoading;

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
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      await bookingsApi.create({
        ...bookingData,
        bookingNumber: `FA-${year}${month}${rand}`,
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

          {/* Add booking button */}
          {canCreate && (
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
