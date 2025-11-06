import { z } from 'zod';

/**
 * Shared Zod schemas for API validation
 */

export const addressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  postalCode: z.string()
    .min(1, 'Postal code is required')
    .regex(/^\d{6}$/, 'Postal code must be exactly 6 digits'),
  country: z.string().min(1, 'Country is required').default('India'),
});

export const checkoutSchema = z.object({
  email: z.string().email('Invalid email address'),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  clientId: z.string().optional(), // for GA4 tracking
});

export const cartItemSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required'),
  qty: z.number().int().min(1, 'Quantity must be at least 1'),
});

export const updateCartItemSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required'),
  qty: z.number().int().min(0, 'Quantity must be non-negative'),
});

export const applyDiscountSchema = z.object({
  code: z.string().min(1, 'Discount code is required'),
});

export const validateDiscountSchema = z.object({
  code: z.string().min(1, 'Discount code is required'),
  subtotalMinor: z.number().int().min(0),
});

export const subscriberSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
  source: z.string().optional(),
});

export const fulfillOrderSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  trackingNumber: z.string().optional(),
});

export const createDiscountSchema = z.object({
  code: z.string().min(1, 'Code is required').toUpperCase(),
  type: z.enum(['percent', 'fixed']),
  scope: z.enum(['PRODUCT', 'ORDER']).default('ORDER'),
  value: z.number().int().min(1, 'Value must be positive'),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  usageLimit: z.number().int().positive().optional(),
  perCustomer: z.boolean().default(true),
  minSubtotalMinor: z.number().int().min(0).optional(),
  active: z.boolean().default(true),
  productIds: z.array(z.string()).optional(), // NEW: For product-specific discounts
});

export const updateProductSchema = z.object({
  productId: z.string().optional(),
  variantId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  priceMinor: z.number().int().positive().optional(),
  compareAtMinor: z.number().int().positive().optional(),
  inventoryQty: z.number().int().min(0).optional(),
  status: z.enum(['active', 'draft', 'archived']).optional(),
});

export const createCustomerSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  acceptsEmail: z.boolean().default(false),
});

export const deleteCustomersSchema = z.object({
  customerIds: z.array(z.string()).min(1, 'At least one customer ID is required'),
});

export const createOrderSchema = z.object({
  customerEmail: z.string().email('Invalid email address'),
  customerFirstName: z.string().min(1, 'First name is required'),
  customerLastName: z.string().optional(),
  customerPhone: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, 'Product ID is required'),
    variantId: z.string().min(1, 'Variant ID is required'),
    title: z.string().min(1, 'Title is required'),
    variantTitle: z.string().optional(),
    sku: z.string().min(1, 'SKU is required'),
    unitPriceMinor: z.number().int().min(0, 'Unit price must be non-negative'),
    qty: z.number().int().min(1, 'Quantity must be at least 1'),
    lineTotalMinor: z.number().int().min(0, 'Line total must be non-negative'),
  })).min(1, 'At least one item is required'),
  subtotalMinor: z.number().int().min(0),
  discountMinor: z.number().int().min(0).default(0),
  shippingMinor: z.number().int().min(0).default(0),
  taxMinor: z.number().int().min(0).default(0),
  totalMinor: z.number().int().min(0),
  discountCode: z.string().optional(),
  shippingAddress: addressSchema.optional(),
  billingAddress: addressSchema.optional(),
  paymentStatus: z.enum(['unpaid', 'paid', 'refunded']).default('paid'),
  fulfillmentStatus: z.enum(['unfulfilled', 'fulfilled', 'returned']).default('unfulfilled'),
  deliveryStatus: z.enum(['pending', 'shipped', 'delivered']).default('pending'),
  status: z.enum(['pending', 'paid', 'fulfilled', 'cancelled', 'refunded']).default('paid'),
  notes: z.string().optional(),
});

