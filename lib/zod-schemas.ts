import { z } from 'zod';

/**
 * Shared Zod schemas for API validation
 */

export const addressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  postalCode: z.string().min(1, 'Postal code is required'),
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

