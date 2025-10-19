import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';

/**
 * Admin-only endpoint to update order notes
 */
export async function POST(request: NextRequest) {
  // Check admin auth using Supabase
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { orderId, notes } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { notes },
      include: {
        items: true,
        customer: {
          select: { 
            id: true,
            email: true, 
            firstName: true, 
            lastName: true,
            phone: true
          },
        },
      },
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('Error updating order notes:', error);
    return NextResponse.json(
      { error: 'Failed to update order notes' },
      { status: 500 }
    );
  }
}
