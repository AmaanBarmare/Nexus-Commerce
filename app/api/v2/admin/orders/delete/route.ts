import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';

/**
 * Admin-only endpoint to delete orders
 */
export async function DELETE(request: NextRequest) {
  // Check admin auth using Supabase
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orderIds } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'Order IDs array is required' },
        { status: 400 }
      );
    }

    // Verify all orders exist
    const existingOrders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });

    if (existingOrders.length !== orderIds.length) {
      return NextResponse.json(
        { error: 'One or more orders not found' },
        { status: 404 }
      );
    }

    // Delete orders (OrderItems will be cascade deleted)
    await prisma.order.deleteMany({
      where: {
        id: { in: orderIds },
      },
    });

    return NextResponse.json({
      message: `Successfully deleted ${orderIds.length} order(s)`,
      deletedOrders: existingOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
      })),
    });
  } catch (error) {
    console.error('Error deleting orders:', error);
    return NextResponse.json(
      { error: 'Failed to delete orders' },
      { status: 500 }
    );
  }
}

