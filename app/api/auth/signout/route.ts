import { createSupabaseServerClient } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  
  // Sign out the user
  await supabase.auth.signOut();
  
  // Get the origin from the request headers
  const origin = request.headers.get('origin') || 'http://localhost:3000';
  
  // Create a response that clears cookies and redirects
  const response = NextResponse.redirect(new URL('/admin', origin));
  
  // Clear the admin email cookie that the middleware checks
  response.cookies.delete('alyra-admin-email');
  
  // Clear any Supabase authentication cookies
  response.cookies.delete('sb-access-token');
  response.cookies.delete('sb-refresh-token');
  response.cookies.delete('supabase-auth-token');
  
  return response;
}
