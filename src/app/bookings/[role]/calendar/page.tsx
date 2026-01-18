'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Plus, Calendar as CalendarIcon, Ship } from 'lucide-react';
import { BookingCalendar, CalendarViewMode } from '@/components/bookings/BookingCalendar';
import { CalendarViewToggle } from '@/components/bookings/CalendarViewToggle';
import { BookingForm } from '@/components/bookings/BookingForm';
import { Booking, BookingType, BookingStatus } from '@/data/booking/types';
import { Project } from '@/data/project/types';
import { Currency } from '@/data/company/types';
import { projectsApi } from '@/lib/supabase/api/projects';
import { dbProjectToFrontend } from '@/lib/supabase/transforms';
import { useBookingSettings } from '@/contexts/BookingSettingsContext';
import { useAuth } from '@/components/auth';

// Mock bookings for demo (replace with API call)
const mockBookings: Booking[] = [
  {
    id: '1',
    bookingNumber: 'FA-202601001',
    type: 'day_charter',
    status: 'booked',
    title: 'Smith Family',
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    time: '09:00 - 17:00',
    projectId: 'project-1',
    customerName: 'John Smith',
    customerEmail: 'john@example.com',
    numberOfGuests: 6,
    bookingOwner: 'user-1',
    agentPlatform: 'Direct',
    destination: 'Phi Phi Islands',
    currency: 'THB',
    totalPrice: 85000,
    depositAmount: 42500,
    depositPaidDate: new Date().toISOString().split('T')[0],
    balanceAmount: 42500,
    createdBy: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    bookingNumber: 'FA-202601002',
    type: 'overnight_charter',
    status: 'hold',
    title: 'Corporate Event',
    dateFrom: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    projectId: 'project-1',
    customerName: 'ABC Corp',
    numberOfGuests: 12,
    bookingOwner: 'user-1',
    agentPlatform: 'Charter Agency',
    destination: 'Krabi',
    currency: 'USD',
    totalPrice: 8500,
    holdUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    bookingNumber: 'FA-202601003',
    type: 'day_charter',
    status: 'enquiry',
    title: 'Wedding Party',
    dateFrom: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '14:00 - 22:00',
    externalBoatName: 'External Yacht',
    customerName: 'Sarah Johnson',
    numberOfGuests: 20,
    bookingOwner: 'user-1',
    agentPlatform: 'Hotel Concierge',
    currency: 'THB',
    totalPrice: 150000,
    createdBy: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function BookingCalendarPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = params.role as string;

  // Get user's actual role from auth context (database-enforced)
  const { getModuleRole, isSuperAdmin, hasPermission } = useAuth();
  const userBookingsRole = getModuleRole('bookings');

  // Determine if user is an agent based on their ACTUAL role, not URL
  // Super admin sees everything, agent only sees status
  const isAgencyView = !isSuperAdmin && userBookingsRole === 'agent';

  // Can create if user has manager role or super admin, or agent (agents can create enquiries)
  const canCreate = isSuperAdmin || userBookingsRole === 'manager' || userBookingsRole === 'agent';

  // Get boat color settings and banner
  const { getBoatColor, bannerImageUrl } = useBookingSettings();

  // Pre-filled booking from URL params (from Quotation/Invoice/Receipt)
  const [prefilledBooking, setPrefilledBooking] = useState<Partial<Booking> | null>(null);

  // Calendar state
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  // Data state
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state - null means "All Bookings"
  const [selectedBoatFilter, setSelectedBoatFilter] = useState<string | null>(null);

  // Modal state
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Load projects
  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await projectsApi.getActive();
        // Transform DB rows to frontend types and filter to yacht type only
        const yachts = data
          .map(dbProjectToFrontend)
          .filter(p => p.type === 'yacht');
        setProjects(yachts);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProjects();
  }, []);

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

  // Booking handlers
  const handleDateClick = (date: string) => {
    if (!canCreate) return;
    setSelectedDate(date);
    setSelectedBooking(null);
    setShowBookingForm(true);
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setSelectedDate(null);
    setShowBookingForm(true);
  };

  const handleSaveBooking = async (bookingData: Partial<Booking>) => {
    // In production, this would call the API
    console.log('Saving booking:', bookingData);

    if (selectedBooking) {
      // Update existing
      setBookings(prev =>
        prev.map(b => b.id === selectedBooking.id ? { ...b, ...bookingData } as Booking : b)
      );
    } else {
      // Create new - Generate FA-YYYYMMXXX format booking number
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const seq = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      const newBooking: Booking = {
        id: `new-${Date.now()}`,
        bookingNumber: `FA-${year}${month}${seq}`,
        ...bookingData,
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Booking;
      setBookings(prev => [...prev, newBooking]);
    }

    setShowBookingForm(false);
    setSelectedBooking(null);
    setSelectedDate(null);
  };

  const handleDeleteBooking = async (id: string) => {
    // In production, this would call the API
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
          {/* View toggle */}
          <CalendarViewToggle viewMode={viewMode} onChange={setViewMode} />

          {/* Add booking button */}
          {canCreate && (
            <button
              onClick={() => {
                setSelectedDate(new Date().toISOString().split('T')[0]);
                setSelectedBooking(null);
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
        viewMode={viewMode}
        onDateClick={canCreate ? handleDateClick : undefined}
        onBookingClick={handleBookingClick}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        isAgencyView={isAgencyView}
        getBoatColor={getBoatColor}
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
