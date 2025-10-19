import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';

/**
 * Admin-only endpoint to delete a discount code by ID
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    console.log('Attempting to delete discount with ID:', id);

    // First check if discount exists
    const existingDiscount = await prisma.discount.findUnique({
      where: { id: id },
    });

    if (!existingDiscount) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }

    // Delete discount
    await prisma.discount.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json({ message: 'Discount deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting discount:', error);
    return NextResponse.json({ error: 'Failed to delete discount' }, { status: 500 });
  }
}
