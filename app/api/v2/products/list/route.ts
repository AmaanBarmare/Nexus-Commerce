import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withCors, preflight } from '@/lib/cors';

export async function OPTIONS() {
  return preflight();
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { status: 'active' },
      include: {
        variants: {
          where: { inventoryQty: { gt: 0 } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      { products },
      { headers: withCors() }
    );
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500, headers: withCors() }
    );
  }
}

