import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateEmail, type GenerateEmailOptions } from '@/lib/ai/generateEmail';
import { validateJsonResponse } from '@/lib/ai/json';
import { generateSqlFromNL } from '@/lib/ai/generateSql';
import { runReadOnlySql } from '@/lib/db/runSql';
import { nlToGa4 } from '@/lib/ga4/nlToGa4';
import { runGa4Report } from '@/lib/ga4/client';

/**
 * API endpoint for AI marketing assistant
 * Handles chat requests and routes to appropriate handlers
 */

const AssistantRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  intent: z.enum(['generate_email', 'create_flow', 'query_metrics']),
  source: z.enum(['sql', 'ga4']).optional(),
  context: z
    .object({
      email_type: z.string().optional(),
      event: z.string().optional(),
      customer_segment: z.string().optional(),
      product_info: z.string().optional(),
    })
    .optional(),
});

function inferMetricsSource(message: string, explicit?: 'sql' | 'ga4'): 'sql' | 'ga4' {
  if (explicit === 'sql' || explicit === 'ga4') {
    return explicit;
  }

  const text = message.toLowerCase();

  // Strong GA4 signals – traffic / acquisition language
  const ga4Keywords = [
    'session',
    'sessions',
    'users',
    'active users',
    'traffic',
    'pageviews',
    'page views',
    'landing page',
    'source / medium',
    'source/medium',
    'source medium',
    'utm',
    'ga4',
    'google analytics',
    'analytics',
    'country',
    'countries',
    'city',
    'cities',
  ];

  if (ga4Keywords.some((kw) => text.includes(kw))) {
    return 'ga4';
  }

  // Everything else defaults to SQL (store DB)
  return 'sql';
}

function sanitizeMetricsResult(result: {
  columns: Array<{ name: string; type: string }>;
  rows: Array<Record<string, unknown>>;
}) {
  const isSensitive = (name: string) => {
    const lower = name.toLowerCase();
    return lower === 'customer_id' || lower === 'customerid' || lower.includes('customer') && lower.endsWith('_id');
  };

  const filteredColumns = result.columns.filter((column) => !isSensitive(column.name));
  const filteredRows = result.rows.map((row) => {
    const entries = Object.entries(row).filter(([key]) => !isSensitive(key));
    return Object.fromEntries(entries);
  });

  return {
    columns: filteredColumns,
    rows: filteredRows,
  };
}

/**
 * Create a marketing flow from user request
 */
async function createFlow(message: string, context?: any): Promise<any> {
  // For now, return a basic flow structure
  // In a full implementation, this would use AI to parse the flow requirements
  return {
    name: 'Auto-generated Flow',
    description: message,
    trigger: {
      event: context?.event || 'order_placed',
      conditions: {},
    },
    steps: [
      {
        type: 'send_email',
        config: {},
      },
    ],
    active: false, // Require manual activation
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, intent, context, source } = validateJsonResponse(
      body,
      AssistantRequestSchema
    );

    // Route to appropriate handler
    switch (intent) {
      case 'generate_email': {
        const options: GenerateEmailOptions = {
          intent: 'generate_email',
          context: context || {},
          userMessage: message,
        };

        const result = await generateEmail(options);

        return NextResponse.json({
          intent: 'generate_email',
          success: true,
          data: {
            subject: result.subject,
            manifest: result.manifest,
          },
        });
      }

      case 'create_flow': {
        return NextResponse.json(
          {
            intent: 'create_flow',
            success: false,
            error: 'Flow creation has moved to /api/flows/generate. Please update the client to use the new endpoint.',
          },
          { status: 501 }
        );
      }

      case 'query_metrics': {
        const metricsSource = inferMetricsSource(message, source);

        if (metricsSource === 'ga4') {
          const plan = nlToGa4(message);
          const ga4Response = await runGa4Report(plan.request);

          const dimensionHeaders = ga4Response.dimensionHeaders ?? [];
          const metricHeaders = ga4Response.metricHeaders ?? [];
          const rows = ga4Response.rows ?? [];

          const columns = [
            ...dimensionHeaders.map((d) => ({ name: d.name })),
            ...metricHeaders.map((m) => ({ name: m.name, type: 'number' as const })),
          ];

          const mappedRows = rows.map((row) => {
            const record: Record<string, unknown> = {};

            dimensionHeaders.forEach((d, idx) => {
              record[d.name] = row.dimensionValues?.[idx]?.value ?? null;
            });

            metricHeaders.forEach((m, idx) => {
              const raw = row.metricValues?.[idx]?.value;
              if (raw === undefined) {
                record[m.name] = null;
                return;
              }
              const numeric = Number(raw);
              record[m.name] = Number.isFinite(numeric) ? numeric : raw;
            });

            return record;
          });

          return NextResponse.json({
            intent: 'query_metrics',
            success: true,
            data: {
              metric: plan.metric,
              visualization: plan.visualization ?? 'table',
              // Store GA4 request JSON in sql field for debugging / reproducibility
              sql: JSON.stringify(plan.request),
              params: [],
              columns,
              rows: mappedRows,
            },
          });
        } else {
          const plan = await generateSqlFromNL(message);
          const result = await runReadOnlySql(plan.sql, plan.params);
          const safeResult = sanitizeMetricsResult(result);

          return NextResponse.json({
            intent: 'query_metrics',
            success: true,
            data: {
              metric: plan.metric,
              visualization: plan.visualization ?? 'table',
              sql: plan.sql,
              params: plan.params,
              columns: safeResult.columns,
              rows: safeResult.rows,
            },
          });
        }
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Intent not recognized. Valid intents are generate_email, create_flow, query_metrics.',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('AI Assistant error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

