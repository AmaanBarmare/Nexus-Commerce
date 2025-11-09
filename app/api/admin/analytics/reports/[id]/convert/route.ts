import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { inferChartFromReport } from '@/lib/analytics/charting';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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
