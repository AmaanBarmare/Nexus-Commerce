import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';
import { z } from 'zod';

const updateEmailSubscriptionSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  acceptsEmail: z.boolean(),
});

/**
 * Admin-only endpoint to update customer email subscription status
 */
export async function POST(request: NextRequest) {
  // Check admin auth using Supabase
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = updateEmailSubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { customerId, acceptsEmail } = validation.data;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Update customer email subscription status
    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: {
        acceptsEmail: acceptsEmail,
      },
      include: {
        orders: {
          include: {
            items: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        addresses: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Calculate total spent and order count
    const totalSpent = updated.orders.reduce((sum, order) => {
      return sum + order.totalMinor;
    }, 0);

    const orderCount = updated.orders.length;

    return NextResponse.json({
      success: true,
      customer: {
        ...updated,
        totalSpent,
        orderCount,
      },
    });
  } catch (error) {
    console.error('Error updating email subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update email subscription' },
      { status: 500 }
    );
  }
}

