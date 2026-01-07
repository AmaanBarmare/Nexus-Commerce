import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Create a Supabase server client for use in Server Components, Route Handlers, and Server Actions
 * 
 * Supabase Setup Instructions:
 * 1. Create a project at https://supabase.com
 * 2. Go to Settings > API to find your project URL and anon key
 * 3. Enable Email Auth in Authentication > Providers
 * 4. Configure email templates in Authentication > Email Templates
 * 5. Set environment variables:
 *    - NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
 *    - NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Check if the current user is an admin.
 *
 * Admin rule:
 * - User is authenticated in Supabase
 * - AND their email exists in the `admin_allowlist` table
 * - AND the row has is_active = true
 */
export async function isAdminUser(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error('[isAdminUser] Failed to get user from Supabase:', userError);
      return false;
    }

    if (!user?.email) {
      console.warn('[isAdminUser] No authenticated user found');
      return false;
    }

    const { data: rows, error: allowlistError } = await supabase
      .from('admin_allowlist')
      .select('email, is_active')
      .eq('email', user.email.toLowerCase())
      .eq('is_active', true);

    const allowlistEntry = Array.isArray(rows) ? rows[0] : null;

    if (allowlistError) {
      console.error('[isAdminUser] Failed to query admin_allowlist:', allowlistError);
      return false;
    }

    const isAdmin = !!allowlistEntry?.email && allowlistEntry.is_active === true;
    console.log('[isAdminUser] allowlist result', {
      userEmail: user.email,
      isAdmin,
      rows,
    });

    return isAdmin;
  } catch (error) {
    console.error('[isAdminUser] Unexpected error:', error);
    return false;
  }
}


