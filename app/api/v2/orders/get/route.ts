import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withCors, preflight } from '@/lib/cors';

export async function OPTIONS() {
  return preflight();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('id');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400, headers: withCors() }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404, headers: withCors() }
      );
    }

    return NextResponse.json(
      { order },
      { headers: withCors() }
    );
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500, headers: withCors() }
    );
  }
}

