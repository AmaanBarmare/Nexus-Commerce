import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ga4ReportRequestSchema } from '@/lib/ga4/schema';
import { runGa4Report } from '@/lib/ga4/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ga4ReportRequestSchema.parse(body);

    const ga4Response = await runGa4Report(parsed);

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
      success: true,
      data: {
        columns,
        rows: mappedRows,
      },
    });
  } catch (error) {
    console.error('GA4 report error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid GA4 request', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown GA4 error',
      },
      { status: 500 }
    );
  }
}


