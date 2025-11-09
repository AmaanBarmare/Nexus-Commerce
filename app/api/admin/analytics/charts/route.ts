import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const charts = await (prisma as any).analyticsChart.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        report: true,
      },
    });

    return NextResponse.json({ success: true, data: charts });
  } catch (error) {
    console.error('Failed to fetch analytics charts', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics charts' },
      { status: 500 }
    );
  }
}
