import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';
import { getNextOrderNumber } from '@/lib/order-counter';

/**
 * Admin-only endpoint to create orders
 */
export async function POST(request: NextRequest) {
  // Check admin auth using Supabase
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      customerEmail,
      customerFirstName,
      customerLastName,
      customerPhone,
      items,
      subtotalMinor,
      discountMinor = 0,
      shippingMinor = 0,
      taxMinor = 0,
      totalMinor,
      discountCode,
      shippingAddress,
      billingAddress,
      paymentStatus = 'paid',
      fulfillmentStatus = 'unfulfilled',
      status = 'paid'
    } = body;

    // Validate required fields
    if (!customerEmail || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
    }

    // Get next monotonic order number
    const orderNumber = await getNextOrderNumber();

    // Create or find customer
    let customer = await prisma.customer.findUnique({
      where: { email: customerEmail }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: customerEmail,
          firstName: customerFirstName,
          lastName: customerLastName,
          phone: customerPhone,
        }
      });
    }

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        email: customerEmail,
        status,
        paymentStatus,
        fulfillmentStatus,
        currency: 'INR',
        subtotalMinor,
        discountMinor,
        shippingMinor,
        taxMinor,
        totalMinor,
        discountCode,
        shippingAddress,
        billingAddress,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            variantId: item.variantId,
            title: item.title,
            variantTitle: item.variantTitle,
            sku: item.sku,
            unitPriceMinor: item.unitPriceMinor,
            qty: item.qty,
            lineTotalMinor: item.lineTotalMinor,
          }))
        }
      },
      include: {
        items: true,
        customer: true,
      }
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
