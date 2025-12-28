import type { VisualizationType } from '@/lib/analytics/types';

import {
  ga4ReportRequestSchema,
  type Ga4DateRangePreset,
  type Ga4ReportRequest,
} from './schema';

export type Ga4QueryPlan = {
  metric: string;
  visualization: VisualizationType;
  request: Ga4ReportRequest;
};

function normalise(text: string): string {
  return text.toLowerCase().trim();
}

function detectDatePreset(message: string): Ga4DateRangePreset {
  const lower = normalise(message);

  if (lower.includes('yesterday')) {
    return 'yesterday';
  }

  if (lower.includes('last 7 days') || lower.includes('past 7 days') || lower.includes('last week')) {
    return 'last_7_days';
  }

  if (
    lower.includes('last 30 days') ||
    lower.includes('past 30 days') ||
    lower.includes('last month')
  ) {
    return 'last_30_days';
  }

  // Fallback to default preset, which will be resolved using GA4_DEFAULT_DATE_RANGE_DAYS
  return 'last_30_days';
}

function detectLimit(message: string, defaultLimit: number): number {
  const lower = normalise(message);
  const match = lower.match(/top\s+(\d{1,3})/);
  if (!match) return defaultLimit;

  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) return defaultLimit;

  return Math.max(1, Math.min(50, Math.floor(parsed)));
}

function slugForPreset(preset: Ga4DateRangePreset): string {
  switch (preset) {
    case 'last_7_days':
      return 'last_7_days';
    case 'last_30_days':
      return 'last_30_days';
    case 'yesterday':
      return 'yesterday';
    case 'custom':
    default:
      return 'custom';
  }
}

/**
 * Very small, rule-based NL → GA4 query planner.
 *
 * Intentionally conservative and restricted to a handful of known-good patterns.
 */
export function nlToGa4(message: string): Ga4QueryPlan {
  const lower = normalise(message);
  const preset = detectDatePreset(lower);

  // 1) "Top N countries ..." -> country + sessions
  const hasCountryWord = /\bcountr(y|ies)\b/.test(lower);
  if (hasCountryWord) {
    const limit = detectLimit(lower, 5);
    const request: Ga4ReportRequest = {
      dateRange: { preset },
      dimensions: ['country'],
      metrics: ['sessions'],
      limit,
      orderBy: {
        field: 'sessions',
        desc: true,
      },
    };

    const validated = ga4ReportRequestSchema.parse(request);
    return {
      metric: `ga4:top_countries_${slugForPreset(preset)}`,
      visualization: 'bar',
      request: validated,
    };
  }

  // 2) "sessions by source/medium ..." -> sessionSource + sessionMedium + sessions
  if (lower.includes('source') && lower.includes('medium') && lower.includes('session')) {
    const request: Ga4ReportRequest = {
      dateRange: { preset },
      dimensions: ['sessionSource', 'sessionMedium'],
      metrics: ['sessions'],
      limit: 50,
      orderBy: {
        field: 'sessions',
        desc: true,
      },
    };

    const validated = ga4ReportRequestSchema.parse(request);
    return {
      metric: `ga4:sessions_by_source_medium_${slugForPreset(preset)}`,
      visualization: 'bar',
      request: validated,
    };
  }

  // 3) "Revenue and purchases yesterday" (or similar) -> purchaseRevenue + transactions
  if (lower.includes('revenue') && (lower.includes('purchase') || lower.includes('transaction'))) {
    const effectivePreset: Ga4DateRangePreset = lower.includes('yesterday')
      ? 'yesterday'
      : preset;

    const request: Ga4ReportRequest = {
      dateRange: { preset: effectivePreset },
      dimensions: [],
      metrics: ['purchaseRevenue', 'transactions'],
      limit: 50,
      eventFilter: {
        equals: 'purchase',
      },
    };

    const validated = ga4ReportRequestSchema.parse(request);
    return {
      metric: `ga4:revenue_and_purchases_${slugForPreset(effectivePreset)}`,
      visualization: 'table',
      request: validated,
    };
  }

  // 4) Fallback: simple sessions over a period, no dimensions
  const fallbackRequest: Ga4ReportRequest = {
    dateRange: { preset },
    dimensions: [],
    metrics: ['sessions'],
    limit: 50,
  };

  const validatedFallback = ga4ReportRequestSchema.parse(fallbackRequest);
  return {
    metric: `ga4:sessions_${slugForPreset(preset)}`,
    visualization: 'table',
    request: validatedFallback,
  };
}


