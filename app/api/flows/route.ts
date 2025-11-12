import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { FlowStatus, PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const statusParam = request.nextUrl.searchParams.get('status');
  let statusFilter: FlowStatus | undefined;

  if (statusParam) {
    if (statusParam === 'ACTIVE' || statusParam === 'DRAFT' || statusParam === 'DISABLED') {
      statusFilter = statusParam;
    } else {
      return NextResponse.json(
        { error: 'Invalid status filter provided.' },
        { status: 400 }
      );
    }
  }

  const db =
    prisma && (prisma as any).flow
      ? prisma
      : new PrismaClient();

  const flows = await db.flow.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    flows: flows.map((flow) => ({
      ...flow,
      createdAt: flow.createdAt.toISOString(),
      updatedAt: flow.updatedAt.toISOString(),
    })),
  });
}

