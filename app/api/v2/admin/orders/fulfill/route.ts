import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';
import { fulfillOrderSchema } from '@/lib/zod-schemas';

/**
 * Admin-only endpoint to mark order as fulfilled
 */
export async function POST(request: NextRequest) {
  // Check admin auth using Supabase
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = fulfillOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { orderId, trackingNumber } = validation.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update order fulfillment status
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: 'fulfilled',
        status: 'fulfilled',
      },
    });

    // TODO: Send fulfillment email with tracking number if provided

    return NextResponse.json({
      success: true,
      order: updated,
    });
  } catch (error) {
    console.error('Error fulfilling order:', error);
    return NextResponse.json({ error: 'Failed to fulfill order' }, { status: 500 });
  }
}

