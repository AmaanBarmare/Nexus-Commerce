import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { updateProductSchema } from '@/lib/zod-schemas';

/**
 * Admin-only endpoint to update product or variant details
 */
export async function PATCH(request: NextRequest) {
  // Check admin auth
  const cookieStore = await cookies();
  const adminEmail = cookieStore.get('alyra-admin-email')?.value;
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

  if (!adminEmail || !adminEmails.includes(adminEmail.toLowerCase())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = updateProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { productId, variantId, ...updates } = validation.data;

    if (variantId) {
      // Update variant
      const variant = await prisma.productVariant.update({
        where: { id: variantId },
        data: {
          ...(updates.title && { title: updates.title }),
          ...(updates.priceMinor !== undefined && { priceMinor: updates.priceMinor }),
          ...(updates.compareAtMinor !== undefined && { compareAtMinor: updates.compareAtMinor }),
          ...(updates.inventoryQty !== undefined && { inventoryQty: updates.inventoryQty }),
        },
      });

      return NextResponse.json({ success: true, variant });
    } else if (productId) {
      // Update product
      const product = await prisma.product.update({
        where: { id: productId },
        data: {
          ...(updates.title && { title: updates.title }),
          ...(updates.description !== undefined && { description: updates.description }),
          ...(updates.status && { status: updates.status }),
        },
      });

      return NextResponse.json({ success: true, product });
    } else {
      return NextResponse.json(
        { error: 'Either productId or variantId is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

