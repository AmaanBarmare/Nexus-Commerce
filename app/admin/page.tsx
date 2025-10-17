'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';

/**
 * Admin Login Page
 * 
 * Supabase Setup Instructions:
 * 1. Create a project at https://supabase.com
 * 2. Go to Settings > API to find your project URL and anon key
 * 3. Enable Email Auth in Authentication > Providers
 * 4. Add users in Authentication > Users with email and password
 * 5. Any authenticated user can access the admin dashboard
 * 6. Set environment variables:
 *    - NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
 *    - NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      setMessage('');
      
      // Give Supabase a moment to set the session, then redirect
      setTimeout(() => {
        window.location.replace('/admin/overview');
      }, 2000);
    } catch (error: any) {
      setMessage(error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card className="w-full max-w-lg">
        <CardHeader className="space-y-2 pb-6">
          <CardTitle className="text-3xl font-bold text-center">Alyra Admin</CardTitle>
          <CardDescription className="text-center text-base">
            Enter your email and password to sign in
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@alyra.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" className="text-base font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 text-base"
              />
            </div>

            <Button type="submit" className="w-full h-12 text-base font-medium" disabled={isLoading || isSuccess}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  Success!
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            {isSuccess && (
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600 animate-pulse" />
                </div>
                <p className="text-green-600 font-medium">Login successful!</p>
                <p className="text-sm text-gray-600">Redirecting to dashboard...</p>
              </div>
            )}

            {message && !isSuccess && (
              <p className="text-sm text-center text-red-600">
                {message}
              </p>
            )}
          </form>

        </CardContent>
        </Card>
      </div>
    </div>
  );
}

