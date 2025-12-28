import { z } from 'zod';

/**
 * Strict GA4 allowlist schema to keep AI-generated queries safe and predictable.
 */

export const ga4DimensionSchema = z.enum([
  'country',
  'city',
  'date',
  'source',
  'medium',
  'sessionSource',
  'sessionMedium',
  'pagePath',
]);

export const ga4MetricSchema = z.enum([
  'sessions',
  'activeUsers',
  'eventCount',
  'totalUsers',
  'purchaseRevenue',
  'transactions',
]);

export const ga4DateRangePresetSchema = z.enum([
  'last_7_days',
  'last_30_days',
  'yesterday',
  'custom',
]);

export const ga4DateRangeSchema = z.object({
  preset: ga4DateRangePresetSchema.default('last_30_days'),
  /**
   * Only used when preset === 'custom'
   * Format: YYYY-MM-DD (GA4 API format)
   */
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const ga4EventNameSchema = z.enum(['purchase', 'begin_checkout']);

export const ga4EventFilterSchema = z
  .object({
    equals: ga4EventNameSchema.optional(),
    in: z.array(ga4EventNameSchema).optional(),
  })
  .refine(
    (val) => !!(val.equals || (val.in && val.in.length > 0)),
    { message: 'Invalid GA4 event filter' }
  );

export const ga4ReportRequestSchema = z.object({
  dateRange: ga4DateRangeSchema,
  dimensions: z.array(ga4DimensionSchema).max(5).default([]),
  metrics: z.array(ga4MetricSchema).min(1).max(5),
  limit: z.number().int().min(1).max(50).default(10),
  orderBy: z
    .object({
      field: z.string(),
      desc: z.boolean().default(false),
    })
    .optional(),
  /**
   * Optional event filter - narrowed to a very small set of allowed events.
   */
  eventFilter: ga4EventFilterSchema.optional(),
});

export type Ga4DimensionName = z.infer<typeof ga4DimensionSchema>;
export type Ga4MetricName = z.infer<typeof ga4MetricSchema>;
export type Ga4DateRangePreset = z.infer<typeof ga4DateRangePresetSchema>;
export type Ga4ReportRequest = z.infer<typeof ga4ReportRequestSchema>;


