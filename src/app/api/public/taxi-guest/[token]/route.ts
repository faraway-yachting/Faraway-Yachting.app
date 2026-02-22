import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );

  // Look up the link
  const { data: link, error: linkError } = await supabase
    .from('taxi_booking_links')
    .select('*')
    .eq('token', token)
    .single();

  if (linkError || !link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  }

  if (!link.is_active) {
    return NextResponse.json({ error: 'This link has been disabled' }, { status: 403 });
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This link has expired' }, { status: 403 });
  }

  // Fetch booking info
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, customer_name, booking_number, date_from, date_to, project_id, external_boat_name')
    .eq('id', link.booking_id)
    .single();

  // Get boat name from project if available
  let boatName = booking?.external_boat_name || '';
  if (booking?.project_id) {
    const { data: project } = await supabase
      .from('yacht_products')
      .select('name')
      .eq('id', booking.project_id)
      .single();
    if (project) boatName = project.name;
  }

  // Fetch taxi transfers for this booking
  const { data: transfers, error: transfersError } = await supabase
    .from('taxi_transfers')
    .select('*')
    .eq('booking_id', link.booking_id)
    .neq('status', 'cancelled')
    .order('pickup_date', { ascending: true });

  if (transfersError) {
    return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 });
  }

  return NextResponse.json({
    booking: {
      guestName: booking?.customer_name || '',
      bookingNumber: booking?.booking_number || '',
      boatName,
      dateFrom: booking?.date_from || '',
      dateTo: booking?.date_to || '',
    },
    transfers: (transfers ?? []).map((t: any) => ({
      id: t.id,
      transferNumber: t.transfer_number,
      tripType: t.trip_type,
      status: t.status,
      boatName: t.boat_name,
      guestName: t.guest_name,
      contactNumber: t.contact_number,
      numberOfGuests: t.number_of_guests,
      pickupDate: t.pickup_date,
      pickupTime: t.pickup_time,
      pickupLocation: t.pickup_location,
      pickupLocationUrl: t.pickup_location_url,
      pickupDropoff: t.pickup_dropoff,
      pickupDropoffUrl: t.pickup_dropoff_url,
      returnDate: t.return_date,
      returnTime: t.return_time,
      returnLocation: t.return_location,
      returnLocationUrl: t.return_location_url,
      returnDropoff: t.return_dropoff,
      returnDropoffUrl: t.return_dropoff_url,
      driverName: t.driver_name,
      driverPhone: t.driver_phone,
      vanNumberPlate: t.van_number_plate,
      driverNote: t.driver_note,
    })),
    label: link.label,
  });
}
