import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withCors, preflight } from '@/lib/cors';
import { getCartId } from '@/lib/util';
import { updateCartItemSchema } from '@/lib/zod-schemas';

export async function OPTIONS() {
  return preflight();
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = updateCartItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400, headers: withCors() }
      );
    }

    const { variantId, qty } = validation.data;
    const cartId = getCartId(request);

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404, headers: withCors() }
      );
    }

    // If qty is 0, delete the item
    if (qty === 0) {
      await prisma.cartItem.deleteMany({
        where: { cartId, variantId },
      });
    } else {
      // Check inventory
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant || variant.inventoryQty < qty) {
        return NextResponse.json(
          { error: 'Insufficient inventory' },
          { status: 400, headers: withCors() }
        );
      }

      await prisma.cartItem.updateMany({
        where: { cartId, variantId },
        data: { qty },
      });
    }

    return NextResponse.json(
      { success: true },
      { headers: withCors() }
    );
  } catch (error) {
    console.error('Error updating cart item:', error);
    return NextResponse.json(
      { error: 'Failed to update cart item' },
      { status: 500, headers: withCors() }
    );
  }
}

