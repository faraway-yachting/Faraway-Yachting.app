import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const searchParams = request.nextUrl.searchParams;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const todayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const year = parseInt(searchParams.get('year') || String(currentYear));
  const month = parseInt(searchParams.get('month') || String(currentMonth));

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
  }

  // Enforce: no past months
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return NextResponse.json({
      bookings: [],
      projects: [],
      linkLabel: '',
      visibleStatuses: [],
      error: 'Past months are not available',
    });
  }

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
    .from('public_calendar_links')
    .select('*')
    .eq('token', token)
    .single();

  if (linkError || !link) {
    return NextResponse.json({ error: 'Calendar link not found' }, { status: 404 });
  }

  if (!link.is_active) {
    return NextResponse.json({ error: 'This calendar link has been disabled' }, { status: 403 });
  }

  if (link.expires_at && new Date(link.expires_at) < now) {
    return NextResponse.json({ error: 'This calendar link has expired' }, { status: 403 });
  }

  // Fetch bookings for the requested month
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  let query = supabase
    .from('bookings')
    .select('id, status, date_from, date_to, project_id, external_boat_name, title')
    .or(`and(date_from.lte.${to},date_to.gte.${from})`)
    .in('project_id', link.project_ids)
    .in('status', link.visible_statuses)
    .order('date_from');

  const { data: rawBookings, error: bookingsError } = await query;
  if (bookingsError) {
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }

  // For current month, filter out bookings that ended before today
  const isCurrentMonth = year === currentYear && month === currentMonth;
  const bookings = (rawBookings ?? [])
    .filter((b) => !isCurrentMonth || b.date_to >= todayStr)
    .map((b) => ({
      id: b.id,
      status: b.status,
      dateFrom: b.date_from,
      dateTo: b.date_to,
      projectId: b.project_id,
      externalBoatName: b.external_boat_name,
    }));

  // Fetch project names for the boat tabs
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, code')
    .in('id', link.project_ids)
    .eq('status', 'active')
    .order('name');

  return NextResponse.json({
    bookings,
    projects: (projects ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
    })),
    linkLabel: link.label,
    visibleStatuses: link.visible_statuses,
  });
}
