import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';
import { createDiscountSchema } from '@/lib/zod-schemas';

/**
 * Admin-only endpoint to update a discount code by ID
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check admin auth using Supabase
    const isAdmin = await isAdminUser();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Discount ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const data = createDiscountSchema.parse(body);

    // Update discount
    const updatedDiscount = await prisma.discount.update({
      where: { id: id },
      data: {
        // Code cannot be updated for an existing discount (it's the unique identifier)
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

    return NextResponse.json(updatedDiscount, { status: 200 });
  } catch (error: any) {
    console.error('Error updating discount:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update discount' }, { status: 500 });
  }
}
