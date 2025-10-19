import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';

/**
 * Admin-only endpoint to list all customers with order statistics
 */
export async function GET(request: NextRequest) {
  // Check admin auth using Supabase
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const customers = await prisma.customer.findMany({
      include: {
        orders: {
          select: {
            id: true,
            totalMinor: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate total spent and order count for each customer
    const customersWithStats = customers.map(customer => {
      const totalSpent = customer.orders.reduce((sum, order) => {
        return sum + order.totalMinor;
      }, 0);
      
      const orderCount = customer.orders.length;

      return {
        ...customer,
        totalSpent,
        orderCount,
      };
    });

    return NextResponse.json({ customers: customersWithStats });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
