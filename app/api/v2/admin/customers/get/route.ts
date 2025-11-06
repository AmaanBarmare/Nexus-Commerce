import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';

/**
 * Admin-only endpoint to get a single customer with all their orders
 */
export async function GET(request: NextRequest) {
  // Check admin auth using Supabase
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('id');

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
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

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Calculate total spent and order count
    const totalSpent = customer.orders.reduce((sum, order) => {
      return sum + order.totalMinor;
    }, 0);

    const orderCount = customer.orders.length;

    return NextResponse.json({
      customer: {
        ...customer,
        totalSpent,
        orderCount,
      },
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

