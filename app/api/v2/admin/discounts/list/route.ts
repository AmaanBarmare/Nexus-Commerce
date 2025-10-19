import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';

/**
 * Admin-only endpoint to list all discounts
 */
export async function GET(request: NextRequest) {
  // Check admin auth using Supabase
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const discounts = await prisma.discount.findMany({
      include: {
        productDiscounts: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ discounts });
  } catch (error) {
    console.error('Error fetching discounts:', error);
    return NextResponse.json({ error: 'Failed to fetch discounts' }, { status: 500 });
  }
}
