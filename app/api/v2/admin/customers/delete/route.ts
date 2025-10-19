import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';
import { deleteCustomersSchema } from '@/lib/zod-schemas';

/**
 * Admin-only endpoint to delete multiple customers
 */
export async function DELETE(request: NextRequest) {
  // Check admin auth using Supabase
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = deleteCustomersSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { customerIds } = validation.data;

    // Check if any customers have orders
    const customersWithOrders = await prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        orders: { some: {} }
      },
      select: { id: true, email: true }
    });

    if (customersWithOrders.length > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete customers with existing orders: ${customersWithOrders.map(c => c.email).join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Delete customers (this will also delete associated addresses due to cascade)
    const result = await prisma.customer.deleteMany({
      where: {
        id: { in: customerIds }
      }
    });

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.count 
    });
  } catch (error) {
    console.error('Error deleting customers:', error);
    return NextResponse.json({ error: 'Failed to delete customers' }, { status: 500 });
  }
}
