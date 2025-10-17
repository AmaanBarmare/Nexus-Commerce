import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { prisma } from '@/lib/db';
import { withCors } from '@/lib/cors';
import { sendGaPurchase } from '@/lib/ga';
import { sendEmail, generateOrderConfirmationEmail } from '@/lib/resend';

// Use Node.js runtime for raw body access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Razorpay Webhook Handler
 * Verifies signature and processes payment events
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500, headers: withCors() }
      );
    }

    // Get raw body for signature verification
    const body = await request.text();

    // Verify signature
    if (signature) {
      const expectedSignature = createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401, headers: withCors() }
        );
      }
    }

    const event = JSON.parse(body);
    const eventId = event.event || event.id || `${Date.now()}-${Math.random()}`;

    // Check idempotency
    const existing = await prisma.processedEvent.findUnique({
      where: { id: eventId },
    });

    if (existing) {
      console.log('Event already processed:', eventId);
      return new Response(null, { status: 204, headers: withCors() });
    }

    // Handle payment.captured event
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const razorpayOrderId = payment.order_id;

      if (!razorpayOrderId) {
        console.error('No order_id in payment payload');
        return new Response(null, { status: 204, headers: withCors() });
      }

      // Find order by Razorpay order ID
      const order = await prisma.order.findUnique({
        where: { razorpayOrderId },
        include: {
          items: true,
        },
      });

      if (!order) {
        console.error('Order not found for Razorpay order:', razorpayOrderId);
        return new Response(null, { status: 204, headers: withCors() });
      }

      // Update order status
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'paid',
          status: 'paid',
          paymentRef: payment.id,
        },
      });

      // Send GA4 purchase event
      const measurementId = process.env.VITE_GA4_ID;
      const apiSecret = process.env.GA4_API_SECRET;

      if (measurementId && apiSecret) {
        await sendGaPurchase({
          measurementId,
          apiSecret,
          clientId: payment.notes?.client_id || `anon.${order.orderNumber}`,
          userId: order.customerId || undefined,
          order: {
            orderNumber: order.orderNumber,
            currency: order.currency,
            totalMinor: order.totalMinor,
            taxMinor: order.taxMinor,
            shippingMinor: order.shippingMinor,
            discountCode: order.discountCode,
            items: order.items.map((item) => ({
              sku: item.sku,
              title: item.title,
              qty: item.qty,
              unitPriceMinor: item.unitPriceMinor,
            })),
          },
        });
      }

      // Send order confirmation email
      const emailHtml = generateOrderConfirmationEmail({
        orderNumber: order.orderNumber,
        email: order.email,
        totalMinor: order.totalMinor,
        items: order.items,
        shippingAddress: order.shippingAddress,
      });

      await sendEmail({
        to: order.email,
        subject: `Order Confirmation #${String(order.orderNumber).padStart(5, '0')}`,
        html: emailHtml,
      });

      console.log('Order processed successfully:', order.orderNumber);
    }

    // Mark event as processed
    await prisma.processedEvent.create({
      data: { id: eventId },
    });

    return new Response(null, { status: 204, headers: withCors() });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500, headers: withCors() }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: withCors() });
}

