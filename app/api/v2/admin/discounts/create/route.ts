import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { createDiscountSchema } from '@/lib/zod-schemas';

/**
 * Admin-only endpoint to create or update discount codes
 */
export async function POST(request: NextRequest) {
  // Check admin auth
  const cookieStore = await cookies();
  const adminEmail = cookieStore.get('alyra-admin-email')?.value;
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

  if (!adminEmail || !adminEmails.includes(adminEmail.toLowerCase())) {
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

    return NextResponse.json({ success: true, discount });
  } catch (error) {
    console.error('Error creating discount:', error);
    return NextResponse.json({ error: 'Failed to create discount' }, { status: 500 });
  }
}

