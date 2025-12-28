import crypto from 'crypto';

import {
  ga4ReportRequestSchema,
  type Ga4DateRangePreset,
  type Ga4ReportRequest,
} from './schema';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GA4_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

type CachedToken = {
  accessToken: string;
  expiresAt: number; // ms timestamp
};

let cachedToken: CachedToken | null = null;

function base64url(input: Buffer | string): string {
  const buffer = typeof input === 'string' ? Buffer.from(input) : input;
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

async function createJwtAssertion(): Promise<string> {
  const clientEmail = getEnv('GOOGLE_CLIENT_EMAIL');
  const rawPrivateKey = getEnv('GOOGLE_PRIVATE_KEY');
  // Support escaped newlines in env file
  const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: GA4_SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: now,
    exp: now + 3600, // 1 hour
  };

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();

  const signature = signer.sign(privateKey);
  const encodedSignature = base64url(signature);

  return `${unsignedToken}.${encodedSignature}`;
}

function getDefaultRangeDays(): number {
  const raw = process.env.GA4_DEFAULT_DATE_RANGE_DAYS;
  if (!raw) return 30;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 30;
  return Math.floor(parsed);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveDateRange(
  preset: Ga4DateRangePreset,
  startDate?: string,
  endDate?: string
): { startDate: string; endDate: string } {
  if (preset === 'custom' && startDate && endDate) {
    return { startDate, endDate };
  }

  const today = new Date();

  if (preset === 'yesterday') {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const formatted = formatDate(yesterday);
    return { startDate: formatted, endDate: formatted };
  }

  let days: number;
  if (preset === 'last_7_days') {
    days = 7;
  } else if (preset === 'last_30_days') {
    days = 30;
  } else {
    days = getDefaultRangeDays();
  }

  const end = today;
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

export async function getGa4AccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.accessToken;
  }

  const assertion = await createJwtAssertion();

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  }).toString();

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to obtain GA4 access token: ${res.status} ${text}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };

  const expiresInSeconds = typeof json.expires_in === 'number' ? json.expires_in : 3600;
  const expiresAt = Date.now() + (expiresInSeconds - 300) * 1000; // refresh ~5 mins early

  cachedToken = {
    accessToken: json.access_token,
    expiresAt,
  };

  return json.access_token;
}

export type Ga4RunReportRequest = Ga4ReportRequest;

export type Ga4RunReportResponse = {
  dimensionHeaders?: Array<{ name: string }>;
  metricHeaders?: Array<{ name: string; type?: string }>;
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
};

export async function runGa4Report(request: Ga4RunReportRequest): Promise<Ga4RunReportResponse> {
  const parsed = ga4ReportRequestSchema.parse(request);
  const propertyId = getEnv('GA4_PROPERTY_ID');

  const { dateRange, ...rest } = parsed;
  const { startDate, endDate } = resolveDateRange(
    dateRange.preset,
    dateRange.startDate,
    dateRange.endDate
  );

  const body: any = {
    dateRanges: [{ startDate, endDate }],
    dimensions: rest.dimensions.map((name) => ({ name })),
    metrics: rest.metrics.map((name) => ({ name })),
    limit: rest.limit,
  };

  if (rest.orderBy) {
    body.orderBys = [
      {
        metric: { metricName: rest.orderBy.field },
        desc: rest.orderBy.desc,
      },
    ];
  }

  if (rest.eventFilter) {
    const filters: any[] = [];

    if (rest.eventFilter.equals) {
      filters.push({
        fieldName: 'eventName',
        stringFilter: {
          matchType: 'EXACT',
          value: rest.eventFilter.equals,
        },
      });
    }

    if (rest.eventFilter.in && rest.eventFilter.in.length > 0) {
      filters.push({
        fieldName: 'eventName',
        inListFilter: {
          values: rest.eventFilter.in,
        },
      });
    }

    if (filters.length === 1) {
      body.dimensionFilter = { filter: filters[0] };
    } else if (filters.length > 1) {
      body.dimensionFilter = { andGroup: { filters } };
    }
  }

  const token = await getGa4AccessToken();

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 runReport failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<Ga4RunReportResponse>;
}


