import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createDiscountSchema } from '@/lib/zod-schemas';
import { isAdminUser } from '@/lib/auth';

/**
 * Admin-only endpoint to create or update discount codes
 */
export async function POST(request: NextRequest) {
  // Check admin auth using Supabase
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = createDiscountSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Upsert discount
    const discount = await prisma.discount.upsert({
      where: { code: data.code },
      create: {
        code: data.code,
        type: data.type,
        scope: data.scope,
        value: data.value,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
        usageLimit: data.usageLimit,
        perCustomer: data.perCustomer,
        minSubtotalMinor: data.minSubtotalMinor,
        active: data.active,
        productDiscounts: data.productIds && data.scope === 'PRODUCT' ? {
          create: data.productIds.map(productId => ({
            productId: productId
          }))
        } : undefined,
      },
      update: {
        type: data.type,
        scope: data.scope,
        value: data.value,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
        usageLimit: data.usageLimit,
        perCustomer: data.perCustomer,
        minSubtotalMinor: data.minSubtotalMinor,
        active: data.active,
      },
    });

    // Handle product associations for PRODUCT scope discounts
    if (data.scope === 'PRODUCT' && data.productIds) {
      // Delete existing product associations
      await prisma.discountProduct.deleteMany({
        where: { discountId: discount.id }
      });
      
      // Create new product associations
      await prisma.discountProduct.createMany({
        data: data.productIds.map(productId => ({
          discountId: discount.id,
          productId: productId
        }))
      });
    }

    return NextResponse.json({ success: true, discount });
  } catch (error) {
    console.error('Error creating discount:', error);
    return NextResponse.json({ error: 'Failed to create discount' }, { status: 500 });
  }
}

