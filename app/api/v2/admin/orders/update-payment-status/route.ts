import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';
import { z } from 'zod';

const updatePaymentStatusSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  paymentStatus: z.enum(['unpaid', 'paid', 'refunded']),
});

/**
 * Admin-only endpoint to update order payment status
 */
export async function POST(request: NextRequest) {
  // Check admin auth using Supabase
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = updatePaymentStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { orderId, paymentStatus } = validation.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update order payment status and main status
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: paymentStatus,
        // Update main status based on payment status
        status: paymentStatus === 'paid' ? 'paid' : paymentStatus === 'refunded' ? 'refunded' : order.status,
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
    console.error('Error updating payment status:', error);
    return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 });
  }
}

