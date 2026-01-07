import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  // Only protect /admin routes (except /admin login page)
  if (!req.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Allow access to /admin login page
  if (req.nextUrl.pathname === '/admin') {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    console.warn('[middleware] No authenticated user found for /admin route');
    const url = req.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  // Enforce admin_allowlist: only users whose email is present and active
  // in the `admin_allowlist` table are allowed to access /admin pages.
  try {
    console.log('[middleware] Authenticated user email:', user.email);

    const { data: rows, error: allowlistError } = await supabase
      .from('admin_allowlist')
      .select('email, is_active')
      .eq('email', user.email.toLowerCase())
      .eq('is_active', true);

    const allowlistEntry = Array.isArray(rows) ? rows[0] : null;

    if (allowlistError || !allowlistEntry?.email || allowlistEntry.is_active !== true) {
      console.warn('[middleware] Admin allowlist check failed', {
        allowlistError,
        rows,
      });
      const url = req.nextUrl.clone();
      url.pathname = '/admin';
      url.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error('[middleware] Failed to verify admin_allowlist:', error);
    const url = req.nextUrl.clone();
    url.pathname = '/admin';
    url.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/admin/:path*'],
};

