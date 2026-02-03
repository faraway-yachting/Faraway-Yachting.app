import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type ModuleName = 'accounting' | 'bookings' | 'inventory' | 'maintenance' | 'customers' | 'hr';

const MODULE_ROUTES: Record<ModuleName, string> = {
  accounting: '/accounting',
  bookings: '/bookings',
  inventory: '/inventory',
  maintenance: '/maintenance',
  customers: '/customers',
  hr: '/hr',
};

function getModuleFromPath(pathname: string): ModuleName | null {
  for (const [module, route] of Object.entries(MODULE_ROUTES)) {
    if (pathname.startsWith(route)) {
      return module as ModuleName;
    }
  }
  return null;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const protectedRoutes = ['/accounting', '/bookings', '/admin'];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isAdminRoute = pathname.startsWith('/admin');

  const authRoutes = ['/login', '/signup'];
  const isAuthRoute = authRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminRoute && user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
    }
  }

  const targetModule = getModuleFromPath(pathname);
  if (targetModule && user && !isAdminRoute) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      const { data: moduleRole } = await supabase
        .from('user_module_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('module', targetModule)
        .eq('is_active', true)
        .single();

      if (!moduleRole) {
        const url = request.nextUrl.clone();
        url.pathname = '/unauthorized';
        url.searchParams.set('module', targetModule);
        return NextResponse.redirect(url);
      }
    }
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  supabaseResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  supabaseResponse.headers.set('Pragma', 'no-cache');
  supabaseResponse.headers.set('Expires', '0');

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
