import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/auth';

function isConfigured(key: string | undefined): boolean {
  return !!key && key.length > 0 && !key.includes('xxx') && !key.includes('<');
}

export default async function SettingsPage() {
  const config = {
    database: isConfigured(process.env.DATABASE_URL),
    supabase:
      isConfigured(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      isConfigured(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    razorpay:
      isConfigured(process.env.RAZORPAY_KEY_ID) &&
      isConfigured(process.env.RAZORPAY_KEY_SECRET),
    razorpayWebhook: isConfigured(process.env.RAZORPAY_WEBHOOK_SECRET),
    ga4:
      isConfigured(process.env.GA4_PROPERTY_ID) &&
      isConfigured(process.env.GOOGLE_CLIENT_EMAIL) &&
      isConfigured(process.env.GOOGLE_PRIVATE_KEY) &&
      isConfigured(process.env.GA4_DEFAULT_DATE_RANGE_DAYS),
    resend: isConfigured(process.env.RESEND_API_KEY),
    cors: isConfigured(process.env.ALLOWED_ORIGIN),
  };

  const supabase = await createSupabaseServerClient();
  const { data: adminAllowlist, error: adminError } = await supabase
    .from('admin_allowlist')
    .select('email, is_active, created_at')
    .order('email', { ascending: true });

  const adminRows =
    adminError || !Array.isArray(adminAllowlist) ? [] : adminAllowlist.filter((row) => !!row.email);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-500 mt-1">Store configuration and environment health</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store Information</CardTitle>
          <CardDescription>Basic store details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">Store Name</div>
            <div>Alyra</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">Support Email</div>
            <div>contact@alyra.in</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">Storefront URL</div>
            <div>https://www.alyra.in</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Health Check</CardTitle>
          <CardDescription>Status of configured services and API keys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <HealthItem
              label="Database (Supabase Postgres)"
              configured={config.database}
              envVars={['DATABASE_URL']}
            />
            <HealthItem
              label="Supabase Authentication"
              configured={config.supabase}
              envVars={['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']}
            />
            <HealthItem
              label="Razorpay Payments"
              configured={config.razorpay}
              envVars={['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']}
            />
            <HealthItem
              label="Razorpay Webhook"
              configured={config.razorpayWebhook}
              envVars={['RAZORPAY_WEBHOOK_SECRET']}
            />
            <HealthItem
              label="Google Analytics 4"
              configured={config.ga4}
              envVars={[
                'GA4_PROPERTY_ID',
                'GOOGLE_CLIENT_EMAIL',
                'GOOGLE_PRIVATE_KEY',
                'GA4_DEFAULT_DATE_RANGE_DAYS',
              ]}
            />
            <HealthItem
              label="Resend Email"
              configured={config.resend}
              envVars={['RESEND_API_KEY']}
            />
            <HealthItem
              label="CORS Configuration"
              configured={config.cors}
              envVars={['ALLOWED_ORIGIN']}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin Access</CardTitle>
          <CardDescription>Users who can access this admin panel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {adminRows.length === 0 && (
              <p className="text-sm text-gray-500">
                Admin access is managed via the <code>admin_allowlist</code> table in Supabase.
                Add rows there to grant admin access.
              </p>
            )}
            {adminRows.map((row) => (
              <div key={row.email} className="flex items-center gap-2">
                <Badge variant={row.is_active ? 'outline' : 'destructive'}>
                  {row.email}
                </Badge>
                {!row.is_active && (
                  <span className="text-xs text-gray-500">(inactive)</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HealthItem({
  label,
  configured,
  envVars,
}: {
  label: string;
  configured: boolean;
  envVars: string[];
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-gray-500 mt-1">
          {envVars.map((v) => (
            <code key={v} className="mr-2 bg-gray-100 px-1 py-0.5 rounded">
              {v}
            </code>
          ))}
        </div>
      </div>
      <div>
        {configured ? (
          <Badge className="bg-green-100 text-green-800">
            <Check className="w-3 h-3 mr-1" />
            Configured
          </Badge>
        ) : (
          <Badge className="bg-red-100 text-red-800">
            <X className="w-3 h-3 mr-1" />
            Not Configured
          </Badge>
        )}
      </div>
    </div>
  );
}

