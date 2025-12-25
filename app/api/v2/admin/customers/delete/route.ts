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

    const { customerIds, deleteOrders } = validation.data;

    // Check if any customers have orders
    const customersWithOrders = await prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        orders: { some: {} }
      },
      select: { 
        id: true, 
        email: true,
        orders: {
          select: { id: true }
        }
      }
    });

    // If deleteOrders is false and customers have orders, return error with info
    if (customersWithOrders.length > 0 && !deleteOrders) {
      const orderCounts = customersWithOrders.map(customer => ({
        email: customer.email,
        orderCount: customer.orders.length
      }));

      return NextResponse.json(
        { 
          error: `Cannot delete customers with existing orders`,
          customersWithOrders: orderCounts,
          suggestion: 'Set deleteOrders to true to delete orders first, or delete orders manually before deleting customers.'
        },
        { status: 400 }
      );
    }

    // If deleteOrders is true, delete all orders for these customers first
    let ordersDeleted = 0;
    if (deleteOrders && customersWithOrders.length > 0) {
      const orderIds = customersWithOrders.flatMap(customer => 
        customer.orders.map(order => order.id)
      );
      
      if (orderIds.length > 0) {
        const deleteResult = await prisma.order.deleteMany({
          where: {
            id: { in: orderIds }
          }
        });
        ordersDeleted = deleteResult.count;
      }
    }

    // Delete customers (this will also delete associated addresses due to cascade)
    // If orders weren't deleted, they will have customerId set to null via DB constraint (ON DELETE SET NULL)
    const result = await prisma.customer.deleteMany({
      where: {
        id: { in: customerIds }
      }
    });

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.count,
      ordersDeleted: ordersDeleted
    });
  } catch (error) {
    console.error('Error deleting customers:', error);
    return NextResponse.json({ error: 'Failed to delete customers' }, { status: 500 });
  }
}
