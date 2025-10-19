import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';

/**
 * Admin-only endpoint to delete an Alyra product
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin auth using Supabase
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const productId = params.id;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await prisma.alyraProduct.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Delete the product
    await prisma.alyraProduct.delete({
      where: { id: productId },
    });

    return NextResponse.json({ 
      message: 'Product deleted successfully',
      deletedProduct: {
        id: existingProduct.id,
        name: existingProduct.name,
        sku: existingProduct.sku
      }
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}

/**
 * Admin-only endpoint to update an Alyra product
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin auth using Supabase
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const productId = params.id;
    const body = await request.json();

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await prisma.alyraProduct.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Update the product
    const updateData: any = {
      name: body.name,
      sku: body.sku,
      type: body.type,
      status: body.status,
      inventory: body.inventory,
    };

    // Only include priceMinor if it's provided
    if (body.priceMinor !== undefined) {
      updateData.priceMinor = body.priceMinor;
    }

    const updatedProduct = await prisma.alyraProduct.update({
      where: { id: productId },
      data: updateData,
    });

    return NextResponse.json({ 
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}