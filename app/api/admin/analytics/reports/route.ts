import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';

const ColumnSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
});

const SaveReportSchema = z.object({
  name: z.string().min(1).max(120),
  metric: z.string().min(1),
  visualization: z.enum(['table', 'timeseries', 'bar']).default('table'),
  columns: z.array(ColumnSchema).min(1),
  rows: z.array(z.record(z.any())).min(1),
  sql: z.string().optional(),
  params: z.array(z.any()).optional(),
});

const SENSITIVE_COLUMN_PATTERN = /(customer.*_id|customerid|id$)/i;

function removeSensitiveColumns<T extends { columns: any[]; rows: Record<string, unknown>[] }>(report: T) {
  const allowedColumns = report.columns.filter(
    (column) => !SENSITIVE_COLUMN_PATTERN.test(column.name)
  );
  const allowedColumnSet = new Set(allowedColumns.map((column) => column.name));

  const sanitizedRows = report.rows.map((row) => {
    const sanitizedEntries = Object.entries(row).filter(([key]) => allowedColumnSet.has(key));
    return Object.fromEntries(sanitizedEntries);
  });

  return {
    ...report,
    columns: allowedColumns,
    rows: sanitizedRows,
  };
}

export async function GET() {
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const reports = await (prisma as any).analyticsReport.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Failed to fetch analytics reports', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics reports',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = SaveReportSchema.parse(body);

    const sanitized = removeSensitiveColumns(parsed);

    const created = await (prisma as any).analyticsReport.create({
      data: {
        name: sanitized.name,
        metric: sanitized.metric,
        visualization: sanitized.visualization,
        columns: sanitized.columns,
        rows: sanitized.rows,
        sql: sanitized.sql,
        params: sanitized.params ?? [],
      },
    });

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (error) {
    console.error('Failed to save analytics report', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to save analytics report' },
      { status: 500 }
    );
  }
}


