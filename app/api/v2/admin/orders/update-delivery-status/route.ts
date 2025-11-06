import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';
import { z } from 'zod';

const updateDeliveryStatusSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  deliveryStatus: z.enum(['pending', 'shipped', 'delivered']),
});

/**
 * Admin-only endpoint to update order delivery status
 */
export async function POST(request: NextRequest) {
  // Check admin auth using Supabase
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = updateDeliveryStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { orderId, deliveryStatus } = validation.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update order delivery status
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryStatus: deliveryStatus,
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
    console.error('Error updating delivery status:', error);
    return NextResponse.json({ error: 'Failed to update delivery status' }, { status: 500 });
  }
}
