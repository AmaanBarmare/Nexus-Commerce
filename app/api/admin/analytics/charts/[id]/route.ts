import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await (prisma as any).analyticsChart.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Chart not found' },
        { status: 404 }
      );
    }

    console.error('Failed to delete analytics chart', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete analytics chart' },
      { status: 500 }
    );
  }
}


