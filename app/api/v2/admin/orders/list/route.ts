import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';

/**
 * Admin-only endpoint to list orders with pagination and filters
 */
export async function GET(request: NextRequest) {
  // Check admin auth using Supabase
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    // Date range preset: today | yesterday | 7days | 30days | 90days | all
    // (back-compat: showAll=true behaves like range=all)
    const range = searchParams.get('showAll') === 'true'
      ? 'all'
      : (searchParams.get('range') || '30days');

    const skip = (page - 1) * limit;

    // Build filters
    const where: any = {};
    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      // Explicit start/end dates take precedence over the preset
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    } else if (range !== 'all') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      let end: Date | null = null;

      switch (range) {
        case 'today':
          // start already at today 00:00
          break;
        case 'yesterday':
          end = new Date(start.getTime() - 1); // end of yesterday (23:59:59.999)
          start.setDate(start.getDate() - 1);
          break;
        case '7days':
          start.setDate(start.getDate() - 7);
          break;
        case '90days':
          start.setDate(start.getDate() - 90);
          break;
        case '30days':
        default:
          start.setDate(start.getDate() - 30);
          break;
      }

      where.createdAt = { gte: start };
      if (end) where.createdAt.lte = end;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          customer: {
            select: { email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

