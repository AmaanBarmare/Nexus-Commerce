import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth';

/**
 * Establish admin session after Supabase magic link callback
 * This sets a secure cookie if the user's email is in the allowlist
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(request.url);

  // Get the code from the URL (Supabase sends this)
  const code = searchParams.get('code');

  if (code) {
    // Exchange code for session
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(new URL('/admin/login?error=no_user', request.url));
  }

  // Check if email is in admin allowlist
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.redirect(new URL('/admin/login?error=unauthorized', request.url));
  }

  // Set admin cookie
  const response = NextResponse.redirect(new URL('/admin', request.url));
  response.cookies.set('alyra-admin-email', user.email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return response;
}

