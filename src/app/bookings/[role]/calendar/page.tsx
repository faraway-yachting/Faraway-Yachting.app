'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Plus, Calendar as CalendarIcon, Ship } from 'lucide-react';
import { BookingCalendar } from '@/components/bookings/BookingCalendar';
import { CalendarDisplayPopover } from '@/components/bookings/CalendarDisplayPopover';
import { BookingForm } from '@/components/bookings/BookingForm';
import { Booking, BookingType, BookingStatus } from '@/data/booking/types';
import { Project } from '@/data/project/types';
import { Currency } from '@/data/company/types';
import { projectsApi } from '@/lib/supabase/api/projects';
import { bookingsApi } from '@/lib/supabase/api/bookings';
import { dbProjectToFrontend } from '@/lib/supabase/transforms';
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

  // Determine if user is an agent based on their ACTUAL role, not URL
  // Super admin sees everything, agent only sees status
  const isAgencyView = !isSuperAdmin && userBookingsRole === 'agent';

  // Can create if user has manager role or super admin, or agent (agents can create enquiries)
  const canCreate = isSuperAdmin || userBookingsRole === 'manager' || userBookingsRole === 'agent';

  // Get boat color settings and banner
  const { getBoatColor, bannerImageUrl, calendarDisplay } = useBookingSettings();

  // Pre-filled booking from URL params (from Quotation/Invoice/Receipt)
  const [prefilledBooking, setPrefilledBooking] = useState<Partial<Booking> | null>(null);

  // Calendar state
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);


  // Data state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state - null means "All Bookings"
  const [selectedBoatFilter, setSelectedBoatFilter] = useState<string | null>(null);

  // Modal state
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Load projects and bookings
  const loadBookings = async (year: number, month: number) => {
    try {
      const data = await bookingsApi.getByMonth(year, month);
      setBookings(data);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [projectsData] = await Promise.all([
          projectsApi.getActive(),
          loadBookings(currentYear, currentMonth),
        ]);
        const yachts = projectsData
          .map(dbProjectToFrontend)
          .filter(p => p.type === 'yacht');
        setProjects(yachts);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload bookings when month changes
  useEffect(() => {
    loadBookings(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

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
  const handleDateClick = async (date: string) => {
    if (!canCreate) return;
    let prefill = buildBoatPrefill();
    // If no boat selected in filter, default to first project to satisfy DB constraint
    if (!prefill && projects.length > 0) {
      prefill = { projectId: projects[0].id };
    }
    if (!prefill) return; // No projects available at all
    const draft = await createDraftBooking(date, prefill);
    if (draft) {
      setSelectedBooking(draft);
      setSelectedDate(null);
      setPrefilledBooking(null);
      setShowBookingForm(true);
    }
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setSelectedDate(null);
    setShowBookingForm(true);
  };

  // Auto-create draft booking when opening new form
  const createDraftBooking = async (date?: string, prefill?: Partial<Booking> | null) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const today = `${year}-${month}-${day}`;
    const draftData: Partial<Booking> = {
      ...prefill,
      status: 'enquiry' as BookingStatus,
      type: prefill?.type || 'day_charter' as BookingType,
      title: prefill?.title || 'Draft',
      customerName: prefill?.customerName || '-',
      dateFrom: date || prefill?.dateFrom || today,
      dateTo: date || prefill?.dateTo || today,
      bookingNumber: `FA-${year}${month}${rand}`,
    };
    try {
      const created = await bookingsApi.create(draftData);
      setBookings(prev => [...prev, created]);
      return created;
    } catch (err: any) {
      console.error('Failed to create draft booking:', err?.message || err?.code || JSON.stringify(err));
      return null;
    }
  };

  const handleSaveBooking = async (bookingData: Partial<Booking>) => {
    if (selectedBooking) {
      // Update existing (including auto-created drafts)
      const updated = await bookingsApi.update(selectedBooking.id, bookingData);
      setBookings(prev =>
        prev.map(b => b.id === selectedBooking.id ? updated : b)
      );
    } else {
      // Fallback: Create new if no selectedBooking (shouldn't happen with auto-draft)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      const created = await bookingsApi.create({
        ...bookingData,
        bookingNumber: `FA-${year}${month}${rand}`,
        bookingOwner: bookingData.bookingOwner || undefined,
      });
      setBookings(prev => [...prev, created]);
    }

    setShowBookingForm(false);
    setSelectedBooking(null);
    setSelectedDate(null);
  };

  const handleDeleteBooking = async (id: string) => {
    await bookingsApi.delete(id);
    setBookings(prev => prev.filter(b => b.id !== id));
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
              onClick={async () => {
                const prefill = buildBoatPrefill();
                const draft = await createDraftBooking(undefined, prefill);
                if (draft) {
                  setSelectedBooking(draft);
                  setSelectedDate(null);
                  setPrefilledBooking(null);
                  setShowBookingForm(true);
                }
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
