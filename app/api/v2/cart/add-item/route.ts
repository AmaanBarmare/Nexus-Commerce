import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withCors, preflight } from '@/lib/cors';
import { getCartId, createCartCookie } from '@/lib/util';
import { cartItemSchema } from '@/lib/zod-schemas';

export async function OPTIONS() {
  return preflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = cartItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400, headers: withCors() }
      );
    }

    const { variantId, qty } = validation.data;

    // Get or create cart
    let cartId = getCartId(request);
    let cart;

    if (cartId) {
      cart = await prisma.cart.findUnique({ where: { id: cartId } });
    }

    if (!cart) {
      cart = await prisma.cart.create({ data: {} });
      cartId = cart.id;
    }

    // Get variant details
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404, headers: withCors() }
      );
    }

    // Check inventory
    if (variant.inventoryQty < qty) {
      return NextResponse.json(
        { error: 'Insufficient inventory' },
        { status: 400, headers: withCors() }
      );
    }

    // Upsert cart item
    await prisma.cartItem.upsert({
      where: {
        cartId_variantId: { cartId: cart.id, variantId },
      },
      create: {
        cartId: cart.id,
        productId: variant.productId,
        variantId: variant.id,
        title: variant.product.title,
        variantTitle: variant.title,
        sku: variant.sku,
        unitPriceMinor: variant.priceMinor,
        qty,
      },
      update: {
        qty: { increment: qty },
      },
    });

    const response = NextResponse.json(
      { success: true, cartId: cart.id },
      { headers: withCors() }
    );

    // Set cart cookie if new
    if (cartId === cart.id) {
      response.headers.set('Set-Cookie', createCartCookie(cart.id));
    }

    return response;
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json(
      { error: 'Failed to add item to cart' },
      { status: 500, headers: withCors() }
    );
  }
}

