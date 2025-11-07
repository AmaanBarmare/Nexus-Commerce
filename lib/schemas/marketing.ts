import { z } from 'zod';

/**
 * Marketing automation schemas
 * Defines structure for flows, templates, and email blocks
 */

/**
 * Flow trigger specification
 */
export const FlowTriggerSchema = z.object({
  event: z.enum([
    'order_placed',
    'order_fulfilled',
    'order_delivered',
    'customer_registered',
    'subscription_created',
    'manual',
  ]),
  conditions: z
    .object({
      minOrderValue: z.number().optional(),
      productIds: z.array(z.string()).optional(),
      customerSegment: z.string().optional(),
    })
    .optional(),
});

/**
 * Flow step action
 */
export const FlowStepSchema = z.object({
  type: z.enum(['send_email', 'update_customer', 'create_discount', 'query_metric']),
  config: z.record(z.any()), // Flexible config per action type
  delay: z.number().optional(), // Delay in seconds
});

/**
 * Complete flow specification
 */
export const FlowSpecSchema = z.object({
  trigger: FlowTriggerSchema,
  steps: z.array(FlowStepSchema),
  conditions: z
    .object({
      enabled: z.boolean().default(true),
      schedule: z.string().optional(),
    })
    .optional(),
});

const PLACEHOLDER_REGEX = /^\{\{[a-zA-Z0-9_.-]+\}\}$/;

const urlOrPlaceholder = z.string().refine((value) => {
  if (!value) {
    return false;
  }

  if (PLACEHOLDER_REGEX.test(value)) {
    return true;
  }

  try {
    const url = new URL(value);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol);
  } catch {
    return false;
  }
}, {
  message: 'Must be a valid URL or liquid placeholder ({{placeholder}})',
});

/**
 * Email block types
 */
export const EmailHeadingBlockSchema = z.object({
  type: z.literal('heading'),
  text: z.string(),
  level: z.enum(['h1', 'h2', 'h3']).default('h2'),
  align: z.enum(['left', 'center', 'right']).default('left'),
});

export const EmailTextBlockSchema = z.object({
  type: z.literal('text'),
  content: z.string(),
  align: z.enum(['left', 'center', 'right']).default('left'),
});

export const EmailCTABlockSchema = z.object({
  type: z.literal('cta'),
  text: z.string(),
  url: urlOrPlaceholder,
  style: z.enum(['primary', 'secondary', 'outline']).default('primary'),
});

export const EmailDividerBlockSchema = z.object({
  type: z.literal('divider'),
  spacing: z.number().default(20),
});

export const EmailFooterBlockSchema = z.object({
  type: z.literal('footer'),
  content: z.string().optional(),
  unsubscribeUrl: urlOrPlaceholder.optional(),
});

export const EmailBlockSchema = z.discriminatedUnion('type', [
  EmailHeadingBlockSchema,
  EmailTextBlockSchema,
  EmailCTABlockSchema,
  EmailDividerBlockSchema,
  EmailFooterBlockSchema,
]);

/**
 * Design system theme
 */
export const EmailThemeSchema = z.object({
  colors: z.object({
    primary: z.string().default('#000000'),
    secondary: z.string().default('#666666'),
    background: z.string().default('#ffffff'),
    text: z.string().default('#333333'),
    link: z.string().default('#000000'),
  }),
  fonts: z.object({
    heading: z.string().default('Arial, sans-serif'),
    body: z.string().default('Arial, sans-serif'),
  }),
  spacing: z.object({
    section: z.number().default(30),
    block: z.number().default(20),
  }),
});

/**
 * Complete email template manifest
 */
export const TemplateManifestSchema = z.object({
  design_system: z.object({
    theme: EmailThemeSchema,
    version: z.string().default('v1'),
  }),
  blocks: z.array(EmailBlockSchema),
});

/**
 * Type exports for TypeScript
 */
export type FlowTrigger = z.infer<typeof FlowTriggerSchema>;
export type FlowStep = z.infer<typeof FlowStepSchema>;
export type FlowSpec = z.infer<typeof FlowSpecSchema>;
export type EmailBlock = z.infer<typeof EmailBlockSchema>;
export type EmailTheme = z.infer<typeof EmailThemeSchema>;
export type TemplateManifest = z.infer<typeof TemplateManifestSchema>;

