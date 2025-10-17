import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withCors, preflight } from '@/lib/cors';
import { validateDiscountSchema } from '@/lib/zod-schemas';

export async function OPTIONS() {
  return preflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateDiscountSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400, headers: withCors() }
      );
    }

    const { code, subtotalMinor } = validation.data;

    const discount = await prisma.discount.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!discount || !discount.active) {
      return NextResponse.json(
        { valid: false, error: 'Invalid discount code' },
        { headers: withCors() }
      );
    }

    // Check date validity
    const now = new Date();
    if (discount.startsAt && discount.startsAt > now) {
      return NextResponse.json(
        { valid: false, error: 'Discount not yet active' },
        { headers: withCors() }
      );
    }
    if (discount.endsAt && discount.endsAt < now) {
      return NextResponse.json(
        { valid: false, error: 'Discount has expired' },
        { headers: withCors() }
      );
    }

    // Check minimum subtotal
    if (discount.minSubtotalMinor && subtotalMinor < discount.minSubtotalMinor) {
      return NextResponse.json(
        { 
          valid: false, 
          error: `Minimum order of ₹${(discount.minSubtotalMinor / 100).toFixed(2)} required` 
        },
        { headers: withCors() }
      );
    }

    // Calculate discount amount
    let discountMinor = 0;
    if (discount.type === 'percent') {
      discountMinor = Math.floor((subtotalMinor * discount.value) / 100);
    } else {
      discountMinor = discount.value;
    }

    return NextResponse.json(
      { 
        valid: true, 
        discount: {
          code: discount.code,
          type: discount.type,
          value: discount.value,
          discountMinor,
        }
      },
      { headers: withCors() }
    );
  } catch (error) {
    console.error('Error validating discount:', error);
    return NextResponse.json(
      { error: 'Failed to validate discount' },
      { status: 500, headers: withCors() }
    );
  }
}

