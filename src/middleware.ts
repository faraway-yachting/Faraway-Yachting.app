import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type ModuleName = 'accounting' | 'bookings' | 'inventory' | 'maintenance' | 'customers' | 'hr';

// Timeout utility for middleware (inlined to work in edge runtime)
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId)) as Promise<T>;
}

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

  // Helper to create redirect responses that preserve auth cookies
  // This is critical - if Supabase refreshed tokens during getUser(),
  // those new cookies must be included in the redirect response
  const createRedirect = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  };

  // Get user with error handling and 10-second timeout (safety net)
  let user = null;
  try {
    const { data, error } = await withTimeout(supabase.auth.getUser(), 10000);
    if (!error) {
      user = data.user;
    }
    // If error, user stays null - will redirect to login for protected routes
  } catch (err) {
    // Timeout or network error - treat as unauthenticated
    console.error('Middleware auth error (timeout or network):', err);
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
    return createRedirect(url);
  }

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return createRedirect(url);
  }

  // Get target module for permission check
  const targetModule = getModuleFromPath(pathname);

  // Only fetch user data if needed (admin or module routes)
  const needsPermissionCheck = (isAdminRoute || targetModule) && user;

  if (needsPermissionCheck && user) {
    // Fetch profile with 3-second timeout - if slow, skip permission check and allow access
    // Better to allow access temporarily than to hang forever
    let isSuperAdmin = false;
    try {
      const profilePromise = Promise.resolve(supabase.from('user_profiles').select('is_super_admin').eq('id', user.id).single());
      const profileResult = await withTimeout(profilePromise, 10000);
      isSuperAdmin = (profileResult.data as { is_super_admin?: boolean } | null)?.is_super_admin === true;
    } catch (err) {
      // Timeout or error - skip admin check, proceed with caution
      console.error('Middleware profile check timeout:', err);
    }

    // Admin route - requires super admin
    if (isAdminRoute && !isSuperAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      return createRedirect(url);
    }

    // Module route - check module access (skip if super admin)
    if (targetModule && !isAdminRoute && !isSuperAdmin) {
      let hasModuleAccess = false;
      try {
        const rolesPromise = Promise.resolve(
          supabase.from('user_module_roles')
            .select('module, role, is_active')
            .eq('user_id', user.id)
            .eq('module', targetModule)
            .eq('is_active', true)
        );
        const rolesResult = await withTimeout(rolesPromise, 10000);
        const moduleRoles = rolesResult.data as unknown[] | null;
        hasModuleAccess = moduleRoles != null && moduleRoles.length > 0;
      } catch (err) {
        // Timeout - allow access rather than hang
        console.error('Middleware module check timeout:', err);
        hasModuleAccess = true; // Fail open - AuthProvider will do proper check
      }

      if (!hasModuleAccess) {
        const url = request.nextUrl.clone();
        url.pathname = '/unauthorized';
        url.searchParams.set('module', targetModule);
        return createRedirect(url);
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
