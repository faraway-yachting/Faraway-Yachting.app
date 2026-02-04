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

  // Get user with error handling - if token refresh fails, treat as unauthenticated
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error) {
      user = data.user;
    }
    // If error, user stays null - will redirect to login for protected routes
  } catch (err) {
    // Network error or other failure - treat as unauthenticated
    console.error('Middleware auth error:', err);
  }

  const pathname = request.nextUrl.pathname;

  const protectedRoutes = ['/accounting', '/bookings', '/admin', '/hr'];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isAdminRoute = pathname.startsWith('/admin');

  const authRoutes = ['/login', '/signup', '/forgot-password'];
  const isAuthRoute = authRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect to login if not authenticated
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Get target module for permission check
  const targetModule = getModuleFromPath(pathname);

  // Only fetch user data if needed (admin or module routes)
  const needsPermissionCheck = (isAdminRoute || targetModule) && user;

  if (needsPermissionCheck && user) {
    // Single consolidated query: fetch profile + module roles together
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    const isSuperAdmin = profile?.is_super_admin === true;

    // Admin route - requires super admin
    if (isAdminRoute && !isSuperAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
    }

    // Module route - check module access (skip if super admin)
    if (targetModule && !isAdminRoute && !isSuperAdmin) {
      const { data: moduleRoles } = await supabase
        .from('user_module_roles')
        .select('module, role, is_active')
        .eq('user_id', user.id)
        .eq('module', targetModule)
        .eq('is_active', true);

      const hasModuleAccess = moduleRoles && moduleRoles.length > 0;

      if (!hasModuleAccess) {
        const url = request.nextUrl.clone();
        url.pathname = '/unauthorized';
        url.searchParams.set('module', targetModule);
        return NextResponse.redirect(url);
      }
    }
  }

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
