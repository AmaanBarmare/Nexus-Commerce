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
 * Check if the current user is authenticated (any authenticated user can access admin)
 */
export async function isAdminUser(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Any authenticated user can access admin dashboard
  return !!user;
}

