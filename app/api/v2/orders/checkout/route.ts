import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withCors, preflight } from '@/lib/cors';
import { getCartId } from '@/lib/util';
import { checkoutSchema } from '@/lib/zod-schemas';
import { getNextOrderNumber } from '@/lib/order-counter';

export async function OPTIONS() {
  return preflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = checkoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400, headers: withCors() }
      );
    }

    const { email, shippingAddress, billingAddress, clientId } = validation.data;
    const cartId = getCartId(request);

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404, headers: withCors() }
      );
    }

    // Get cart with items
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            cart: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400, headers: withCors() }
      );
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Verify inventory and lock variants
      for (const item of cart.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: { inventoryQty: true },
        });

        if (!variant || variant.inventoryQty < item.qty) {
          throw new Error(`Insufficient inventory for ${item.title}`);
        }
      }

      // Calculate totals
      let subtotalMinor = 0;
      for (const item of cart.items) {
        subtotalMinor += item.unitPriceMinor * item.qty;
      }

      let discountMinor = 0;
      if (cart.discountCode) {
        const discount = await tx.discount.findUnique({
          where: { code: cart.discountCode },
        });

        if (discount && discount.active) {
          if (discount.type === 'percent') {
            discountMinor = Math.floor((subtotalMinor * discount.value) / 100);
          } else {
            discountMinor = discount.value;
          }

          // Increment usage counter
          await tx.discount.update({
            where: { id: discount.id },
            data: { timesUsed: { increment: 1 } },
          });
        }
      }

      const shippingMinor = 0; // Free shipping
      const taxMinor = 0; // No tax for now
      const totalMinor = subtotalMinor - discountMinor + shippingMinor + taxMinor;

      // Get next monotonic order number
      const orderNumber = await getNextOrderNumber();

      // Find or create customer
      let customer = await tx.customer.findUnique({
        where: { email },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: { email },
        });
      }

      // Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          email,
          currency: 'INR',
          subtotalMinor,
          discountMinor,
          shippingMinor,
          taxMinor,
          totalMinor,
          discountCode: cart.discountCode,
          shippingAddress,
          billingAddress: billingAddress || shippingAddress,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              title: item.title,
              variantTitle: item.variantTitle,
              sku: item.sku,
              unitPriceMinor: item.unitPriceMinor,
              qty: item.qty,
              lineTotalMinor: item.unitPriceMinor * item.qty,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Decrement inventory
      for (const item of cart.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { inventoryQty: { decrement: item.qty } },
        });
      }

      // Create Razorpay order
      const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
      const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!razorpayKeyId || !razorpayKeySecret) {
        throw new Error('Razorpay credentials not configured');
      }

      const orderNumberStr = String(orderNumber).padStart(5, '0');
      const razorpayOrderData = {
        amount: totalMinor, // amount in paise
        currency: 'INR',
        receipt: `ALYRA-${orderNumberStr}`,
        notes: {
          order_id: order.id,
          order_number: orderNumber,
        },
      };

      const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')}`,
        },
        body: JSON.stringify(razorpayOrderData),
      });

      if (!razorpayResponse.ok) {
        const errorText = await razorpayResponse.text();
        console.error('Razorpay error:', errorText);
        throw new Error('Failed to create Razorpay order');
      }

      const razorpayOrder = await razorpayResponse.json();

      // Update order with Razorpay order ID
      await tx.order.update({
        where: { id: order.id },
        data: { razorpayOrderId: razorpayOrder.id },
      });

      // Clear cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return {
        orderId: order.id,
        orderNumber,
        amountMinor: totalMinor,
        currency: 'INR',
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId,
        clientId: clientId || `anon.${orderNumber}`,
      };
    });

    return NextResponse.json(result, { headers: withCors() });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Checkout failed' },
      { status: 500, headers: withCors() }
    );
  }
}

