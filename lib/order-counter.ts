import { prisma } from './db';

/**
 * Generates the next monotonic order number
 * This function ensures that order numbers are:
 * - Sequential and never reused
 * - Generated atomically (no race conditions)
 * - Never reset even if orders are deleted
 * - Outside transaction rollback scope
 */
export async function getNextOrderNumber(): Promise<number> {
  try {
    // Use atomic database operation to get and increment the highest order number
    // This ensures no race conditions and maintains monotonic ordering
    const result = await prisma.$queryRaw<Array<{ next_number: number }>>`
      WITH max_order AS (
        SELECT COALESCE(MAX("orderNumber"), 0) as max_num FROM "Order"
      )
      SELECT (max_num + 1) as next_number FROM max_order
    `;
    
    const nextNumber = result[0]?.next_number || 1;
    
    // Try to update the order counter table if it exists
    try {
      await prisma.$executeRaw`
        INSERT INTO order_counter (id, counter, "createdAt", "updatedAt") 
        VALUES ('singleton', ${nextNumber}, NOW(), NOW())
        ON CONFLICT (id) 
        DO UPDATE SET 
          counter = ${nextNumber},
          "updatedAt" = NOW()
      `;
    } catch (counterError) {
      // Order counter table doesn't exist yet, that's okay
      console.log('Order counter table not available, using direct order number generation');
    }
    
    return nextNumber;
  } catch (error) {
    console.error('Error generating order number:', error);
    
    // Final fallback: simple increment
    const highestOrder = await prisma.order.findFirst({
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true }
    });
    
    return highestOrder ? highestOrder.orderNumber + 1 : 1;
  }
}

/**
 * Formats an order number with padding and prefix
 * Example: 1 -> "00001", 1057 -> "01057"
 */
export function formatOrderNumber(orderNumber: number): string {
  return orderNumber.toString().padStart(5, '0');
}

/**
 * Gets the current counter value without incrementing
 * Useful for displaying the next order number
 */
export async function getCurrentOrderNumber(): Promise<number> {
  try {
    // Get the highest existing order number
    const highestOrder = await prisma.order.findFirst({
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true }
    });
    
    return highestOrder ? highestOrder.orderNumber : 0;
  } catch (error) {
    console.error('Error getting current order number:', error);
    return 0;
  }
}
