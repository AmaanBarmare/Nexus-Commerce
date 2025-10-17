import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withCors, preflight } from '@/lib/cors';
import { getCartId } from '@/lib/util';
import { applyDiscountSchema } from '@/lib/zod-schemas';

export async function OPTIONS() {
  return preflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = applyDiscountSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400, headers: withCors() }
      );
    }

    const { code } = validation.data;
    const cartId = getCartId(request);

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404, headers: withCors() }
      );
    }

    // Validate discount code
    const discount = await prisma.discount.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!discount || !discount.active) {
      return NextResponse.json(
        { error: 'Invalid discount code' },
        { status: 400, headers: withCors() }
      );
    }

    // Check date validity
    const now = new Date();
    if (discount.startsAt && discount.startsAt > now) {
      return NextResponse.json(
        { error: 'Discount not yet active' },
        { status: 400, headers: withCors() }
      );
    }
    if (discount.endsAt && discount.endsAt < now) {
      return NextResponse.json(
        { error: 'Discount has expired' },
        { status: 400, headers: withCors() }
      );
    }

    // Check usage limit
    if (discount.usageLimit && discount.timesUsed >= discount.usageLimit) {
      return NextResponse.json(
        { error: 'Discount usage limit reached' },
        { status: 400, headers: withCors() }
      );
    }

    // Apply discount to cart
    await prisma.cart.update({
      where: { id: cartId },
      data: { discountCode: discount.code },
    });

    return NextResponse.json(
      { success: true, discount: { code: discount.code, type: discount.type, value: discount.value } },
      { headers: withCors() }
    );
  } catch (error) {
    console.error('Error applying discount:', error);
    return NextResponse.json(
      { error: 'Failed to apply discount' },
      { status: 500, headers: withCors() }
    );
  }
}

