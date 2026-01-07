import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { inferChartFromReport } from '@/lib/analytics/charting';
import { isAdminUser } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const report = await (prisma as any).analyticsReport.findUnique({
      where: { id: params.id },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    const suggestion = inferChartFromReport(report);

    if (!suggestion) {
      return NextResponse.json(
        { success: false, error: 'Could not infer a chart from this dataset.' },
        { status: 400 }
      );
    }

    const chart = await (prisma as any).analyticsChart.create({
      data: {
        reportId: report.id,
        name: suggestion.name,
        chartType: suggestion.chartType,
        config: suggestion.config,
      },
    });

    return NextResponse.json({ success: true, data: chart });
  } catch (error) {
    console.error('Failed to convert analytics report to chart', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate chart' },
      { status: 500 }
    );
  }
}
