import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Use service role to bypass RLS for public access
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
    .from('taxi_public_links')
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

  // Fetch upcoming transfers for this taxi company
  const today = new Date().toISOString().split('T')[0];
  const { data: transfers, error: transfersError } = await supabase
    .from('taxi_transfers')
    .select('*')
    .eq('taxi_company_id', link.taxi_company_id)
    .neq('status', 'cancelled')
    .or(`pickup_date.gte.${today},return_date.gte.${today}`)
    .order('pickup_date', { ascending: true });

  if (transfersError) {
    return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 });
  }

  // Get company name
  const { data: company } = await supabase
    .from('taxi_companies')
    .select('name')
    .eq('id', link.taxi_company_id)
    .single();

  return NextResponse.json({
    transfers: (transfers ?? []).map(t => ({
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
    companyName: company?.name || link.label,
  });
}

// PATCH: Taxi company assigns driver info
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await request.json();

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

  // Validate token
  const { data: link, error: linkError } = await supabase
    .from('taxi_public_links')
    .select('*')
    .eq('token', token)
    .single();

  if (linkError || !link || !link.is_active) {
    return NextResponse.json({ error: 'Invalid or inactive link' }, { status: 403 });
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Link expired' }, { status: 403 });
  }

  // Validate transfer belongs to this company
  const { transferId, driverName, driverPhone, vanNumberPlate } = body;
  if (!transferId) {
    return NextResponse.json({ error: 'Transfer ID required' }, { status: 400 });
  }

  const { data: transfer } = await supabase
    .from('taxi_transfers')
    .select('taxi_company_id')
    .eq('id', transferId)
    .single();

  if (!transfer || transfer.taxi_company_id !== link.taxi_company_id) {
    return NextResponse.json({ error: 'Transfer not found for this company' }, { status: 404 });
  }

  // Update driver info
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (driverName !== undefined) updates.driver_name = driverName;
  if (driverPhone !== undefined) updates.driver_phone = driverPhone;
  if (vanNumberPlate !== undefined) updates.van_number_plate = vanNumberPlate;

  // Auto-set status to 'assigned' if driver info is provided
  if (driverName && driverPhone) {
    updates.status = 'assigned';
  }

  const { error: updateError } = await supabase
    .from('taxi_transfers')
    .update(updates)
    .eq('id', transferId);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update transfer' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
