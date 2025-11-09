import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/auth';
import { prisma } from '@/lib/db';

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function createCsv(columns: Array<{ name: string }>, rows: Array<Record<string, unknown>>): string {
  const header = columns.map((col) => col.name).join(',');
  const data = rows
    .map((row) =>
      columns
        .map((col) => {
          const value = toCsvValue(row[col.name]);
          const needsQuotes = /[",\n]/.test(value);
          const escaped = value.replace(/"/g, '""');
          return needsQuotes ? `"${escaped}"` : escaped;
        })
        .join(',')
    )
    .join('\n');

  return [header, data].filter(Boolean).join('\n');
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const report = await (prisma as any).analyticsReport.findUnique({
      where: { id: params.id },
    });

    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }

    const columns = Array.isArray(report.columns) ? report.columns : [];
    const rows = Array.isArray(report.rows) ? report.rows : [];
    const csv = createCsv(columns, rows);

    let userEmail: string | undefined;
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userEmail = user?.email ?? undefined;
    } catch (error) {
      console.error('Failed to resolve user email for analytics download log', error);
    }

    await (prisma as any).analyticsReportDownload.create({
      data: {
        reportId: report.id,
        userEmail,
      },
    });

    const filename =
      report.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'analytics-report';

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (error) {
    console.error('Failed to export analytics report', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export analytics report',
      },
      { status: 500 }
    );
  }
}


