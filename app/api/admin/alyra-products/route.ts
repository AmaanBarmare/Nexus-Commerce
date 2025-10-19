import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';

/**
 * GET /api/admin/alyra-products - Fetch all Alyra products
 */
export async function GET() {
  // Check admin auth using Supabase
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const products = await prisma.alyraProduct.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching Alyra products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/alyra-products - Create a new Alyra product
 */
export async function POST(request: NextRequest) {
  // Check admin auth using Supabase
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, sku, type, status, inventory, priceMinor } = body;

    const product = await prisma.alyraProduct.create({
      data: {
        name,
        sku,
        type,
        status,
        inventory: parseInt(inventory) || 0,
        priceMinor: parseInt(priceMinor) || 0,
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error creating Alyra product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
