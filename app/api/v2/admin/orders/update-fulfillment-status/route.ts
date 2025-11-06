import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';
import { z } from 'zod';

const updateFulfillmentStatusSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  fulfillmentStatus: z.enum(['unfulfilled', 'fulfilled', 'returned']),
});

/**
 * Admin-only endpoint to update order fulfillment status
 */
export async function POST(request: NextRequest) {
  // Check admin auth using Supabase
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = updateFulfillmentStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { orderId, fulfillmentStatus } = validation.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update order fulfillment status and main status
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: fulfillmentStatus,
        // Update main status based on fulfillment status
        status: fulfillmentStatus === 'fulfilled' ? 'fulfilled' : fulfillmentStatus === 'returned' ? 'cancelled' : order.status,
      },
      include: {
        items: true,
        customer: true,
      },
    });

    return NextResponse.json({
      success: true,
      order: updated,
    });
  } catch (error) {
    console.error('Error updating fulfillment status:', error);
    return NextResponse.json({ error: 'Failed to update fulfillment status' }, { status: 500 });
  }
}

