import { z } from 'zod';

import { openai, GENERATION_MODEL } from './client';
import { createStructuredOutputConfig, validateJsonResponse } from './json';

const SQL_GENERATION_MODEL = process.env.OPENAI_SQL_MODEL || GENERATION_MODEL;

export const SqlPlanSchema = z.object({
  metric: z.string().min(1),
  sql: z.string().min(1),
  params: z
    .array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .default([]),
  visualization: z.enum(['table', 'timeseries', 'bar']).optional(),
  usedTables: z.array(z.string()).default([]),
  usedColumns: z.array(z.string()).default([]),
});

type SqlPlan = z.infer<typeof SqlPlanSchema>;

const TABLE_CANONICAL_MAP: Record<string, string> = {
  order: 'order',
  orders: 'order',
  '"order"': 'order',
  orderitem: 'orderitem',
  orderitems: 'orderitem',
  'order_item': 'orderitem',
  'order_items': 'orderitem',
  '"orderitem"': 'orderitem',
  alyraproduct: 'alyraproduct',
  alyraproducts: 'alyraproduct',
  product: 'alyraproduct',
  products: 'alyraproduct',
  customer: 'customer',
  customers: 'customer',
  '"customer"': 'customer',
};

const ALLOWED_TABLES = new Set(['order', 'orderitem', 'alyraproduct', 'customer']);

const ALLOWED_COLUMNS = new Set([
  // Order
  'order.id',
  'order.ordernumber',
  'order.customerid',
  'order.email',
  'order.status',
  'order.paymentstatus',
  'order.fulfillmentstatus',
  'order.deliverystatus',
  'order.currency',
  'order.subtotalminor',
  'order.discountminor',
  'order.shippingminor',
  'order.taxminor',
  'order.totalminor',
  'order.discountcode',
  'order.paymentref',
  'order.razorpayorderid',
  'order.shippingaddress',
  'order.billingaddress',
  'order.createdat',
  'order.updatedat',
  'order.notes',
  // OrderItem
  'orderitem.id',
  'orderitem.orderid',
  'orderitem.productid',
  'orderitem.variantid',
  'orderitem.title',
  'orderitem.varianttitle',
  'orderitem.sku',
  'orderitem.unitpriceminor',
  'orderitem.qty',
  'orderitem.linetotalminor',
  // AlyraProduct
  'alyraproduct.id',
  'alyraproduct.name',
  'alyraproduct.sku',
  'alyraproduct.type',
  'alyraproduct.status',
  'alyraproduct.inventory',
  'alyraproduct.priceminor',
  'alyraproduct.createdat',
  'alyraproduct.updatedat',
  // Customer
  'customer.id',
  'customer.email',
  'customer.firstname',
  'customer.lastname',
  'customer.phone',
  'customer.acceptsemail',
  'customer.createdat',
  'customer.updatedat',
]);

function normalizeIdentifier(value: string): string {
  const cleaned = value.replace(/"/g, '').trim().toLowerCase();
  const parts = cleaned.split('.');

  if (parts.length === 1) {
    return TABLE_CANONICAL_MAP[cleaned] ?? cleaned;
  }

  const [tablePart, columnPart] = parts;
  const canonicalTable = TABLE_CANONICAL_MAP[tablePart] ?? tablePart;

  return `${canonicalTable}.${columnPart}`;
}

function ensureSelectOnly(sql: string) {
  const text = sql.trim().toLowerCase();
  if (!text.startsWith('select')) {
    throw new Error('Only SELECT statements are allowed.');
  }
  if (text.startsWith('with ')) {
    throw new Error('Common table expressions are not allowed.');
  }
  if (text.includes(';')) {
    throw new Error('Multiple statements are not allowed.');
  }
  const banned = [
    'insert ',
    'update ',
    'delete ',
    'drop ',
    'alter ',
    'create ',
    'truncate ',
    'grant ',
    'revoke ',
    'execute ',
    'vacuum ',
  ];
  if (banned.some((keyword) => text.includes(keyword))) {
    throw new Error('SQL contains disallowed operations.');
  }
}

function ensureAllowedTables(plan: SqlPlan) {
  const referencedTables = extractTablesFromSql(plan.sql);
  const tablesToValidate = new Set<string>([
    ...plan.usedTables.map(normalizeIdentifier),
    ...referencedTables,
  ]);

  tablesToValidate.forEach((table) => {
    if (!ALLOWED_TABLES.has(table)) {
      throw new Error(`Table not allowed: ${table}`);
    }
  });
}

function ensureAllowedColumns(plan: SqlPlan) {
  const referencedColumns = extractColumnsFromSql(plan.sql);
  const columnsToValidate = new Set<string>([
    ...plan.usedColumns.map(normalizeIdentifier),
    ...referencedColumns,
  ]);

  columnsToValidate.forEach((column) => {
    if (!ALLOWED_COLUMNS.has(column)) {
      throw new Error(`Column not allowed: ${column}`);
    }
  });
}

const TABLE_REGEX = /\bfrom\s+"?([A-Za-z0-9_]+)"?/g;
const JOIN_REGEX = /\bjoin\s+"?([A-Za-z0-9_]+)"?/g;

function extractTablesFromSql(sql: string): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  const lower = sql.toLowerCase();

  TABLE_REGEX.lastIndex = 0;
  while ((match = TABLE_REGEX.exec(lower)) !== null) {
    matches.push(normalizeIdentifier(match[1]));
  }

  JOIN_REGEX.lastIndex = 0;
  while ((match = JOIN_REGEX.exec(lower)) !== null) {
    matches.push(normalizeIdentifier(match[1]));
  }

  return matches;
}

const COLUMN_WITH_TABLE_REGEX =
  /\b([A-Za-z0-9_]+)\s*\.\s*"?(?:([A-Za-z0-9_]+))"?/g;

function extractColumnsFromSql(sql: string): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  COLUMN_WITH_TABLE_REGEX.lastIndex = 0;

  while ((match = COLUMN_WITH_TABLE_REGEX.exec(sql)) !== null) {
    const tableAliasOrName = match[1];
    const columnName = match[2];
    if (!columnName) {
      continue;
    }

    // Skip numeric literals accidentally captured
    if (!Number.isNaN(Number(columnName))) {
      continue;
    }

    const tableName = resolveTableFromAlias(sql, tableAliasOrName);
    if (!tableName) {
      continue;
    }

    matches.push(
      `${normalizeIdentifier(tableName)}.${normalizeIdentifier(columnName)}`
    );
  }

  return matches;
}

const ALIAS_REGEX =
  /\bfrom\s+"?([A-Za-z0-9_]+)"?\s+as\s+([A-Za-z0-9_]+)/gi;
const ALIAS_REGEX_SHORT =
  /\bfrom\s+"?([A-Za-z0-9_]+)"?\s+([A-Za-z0-9_]+)/gi;
const JOIN_ALIAS_REGEX =
  /\bjoin\s+"?([A-Za-z0-9_]+)"?\s+as\s+([A-Za-z0-9_]+)/gi;
const JOIN_ALIAS_REGEX_SHORT =
  /\bjoin\s+"?([A-Za-z0-9_]+)"?\s+([A-Za-z0-9_]+)/gi;

function resolveTableFromAlias(sql: string, alias: string): string | null {
  const candidates: Array<RegExp> = [
    ALIAS_REGEX,
    ALIAS_REGEX_SHORT,
    JOIN_ALIAS_REGEX,
    JOIN_ALIAS_REGEX_SHORT,
  ];

  for (const regex of candidates) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(sql)) !== null) {
      const table = match[1];
      const aliasName = match[2];

      if (normalizeIdentifier(aliasName) === normalizeIdentifier(alias)) {
        return table;
      }
    }
  }

  // If alias is actually a table name
  return alias;
}

function ensureLimit(plan: SqlPlan): SqlPlan {
  const lower = plan.sql.toLowerCase();

  if (/\blimit\b/.test(lower)) {
    return plan;
  }

  const isCountOnly =
    !lower.includes('select *') && /\bcount\s*\(/.test(lower) && !lower.includes('group by');

  if (isCountOnly) {
    return plan;
  }

  return {
    ...plan,
    sql: `${plan.sql}\nLIMIT 500`,
  };
}

export async function generateSqlFromNL(nlQuery: string): Promise<SqlPlan> {
  const systemPrompt = `
You generate safe, single-statement Postgres SELECT queries for analytics.

Constraints:
- Output one SELECT statement only (no semicolons, no CTE chains longer than 1).
- Use only the whitelisted schema described below.
- Always parameterise user-provided values with $1, $2, … (no string interpolation).
- Return JSON that matches the "SqlPlanSchema".
- Provide clear snake_case aliases for aggregates.
- Only include columns that directly answer the user’s question; avoid adding extra counts, IDs, or metrics unless the user explicitly asks for them.
- For customer-focused answers, include a combined full name (COALESCE("Customer"."firstName",'') || ' ' || COALESCE("Customer"."lastName",'')) and email by default. Only return separate name parts or IDs if the user clearly asks.
- Prefer joining via aliases like "Order" AS o.
- Default to LIMIT 500 unless the query is an explicit COUNT-only metric.

Whitelisted schema (Postgres, quoted identifiers):
- "Order"(id, orderNumber, customerId, email, status, paymentStatus, fulfillmentStatus, deliveryStatus, currency, subtotalMinor, discountMinor, shippingMinor, taxMinor, totalMinor, discountCode, paymentRef, razorpayOrderId, shippingAddress, billingAddress, createdAt, updatedAt, notes)
- "OrderItem"(id, orderId, productId, variantId, title, variantTitle, sku, unitPriceMinor, qty, lineTotalMinor)
- "AlyraProduct"(id, name, sku, type, status, inventory, priceMinor, createdAt, updatedAt)
- "Customer"(id, email, firstName, lastName, phone, acceptsEmail, createdAt, updatedAt)

Hints:
- Paid orders => "Order"."paymentStatus" = 'paid'::"PaymentStatus"
- When comparing enums (paymentStatus, fulfillmentStatus, deliveryStatus), cast string literals like 'paid'::"PaymentStatus" or 'fulfilled'::"FulfillmentStatus"
- Revenue => SUM(oi."qty" * oi."unitPriceMinor") / 100 AS revenue
- Units sold => SUM(oi."qty")
- Join keys: "Order"."id" = "OrderItem"."orderId"; "OrderItem"."productId" = "AlyraProduct"."id"; "Order"."customerId" = "Customer"."id"
- Time windows use "Order"."createdAt" unless otherwise specified.
- Sell-through rate => units_sold / NULLIF(units_sold + "AlyraProduct"."inventory", 0)
- Text search => LOWER(alias."name") LIKE LOWER($1)
- Prefer returning customer first and last names when helpful (COALESCE("Customer"."firstName", 'Unknown') AS customer_name).
- When unsure, ask for clarification via metric field description.
  `.trim();

  const userPrompt = `Question: ${nlQuery}`;

  const structuredConfig = createStructuredOutputConfig(SqlPlanSchema, 'sql_plan');

  const completion = await openai.chat.completions.create({
    model: SQL_GENERATION_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    ...structuredConfig,
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error('AI did not return any content.');
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse AI JSON response: ${error}`);
  }

  const plan = validateJsonResponse(parsedJson, SqlPlanSchema) as SqlPlan;

  ensureSelectOnly(plan.sql);
  ensureAllowedTables(plan);
  ensureAllowedColumns(plan);

  const castedSql = applyEnumCasts(plan.sql);

  return ensureLimit({
    ...plan,
    sql: castedSql,
  });
}

function applyEnumCasts(sql: string): string {
  let updated = sql;

  updated = updated.replace(/("paymentStatus"\s*=\s*)'([^']+)'/gi, '$1\'$2\'::"PaymentStatus"');
  updated = updated.replace(
    /("fulfillmentStatus"\s*=\s*)'([^']+)'/gi,
    '$1\'$2\'::"FulfillmentStatus"'
  );
  updated = updated.replace(/("deliveryStatus"\s*=\s*)'([^']+)'/gi, '$1\'$2\'::"DeliveryStatus"');

  updated = updated.replace(
    /("paymentStatus"\s+IN\s*\()([^)]*)(\))/gi,
    (_match: string, prefix: string, list: string, suffix: string) =>
      `${prefix}${castListEntries(list, '"PaymentStatus"')}${suffix}`
  );
  updated = updated.replace(
    /("fulfillmentStatus"\s+IN\s*\()([^)]*)(\))/gi,
    (_match: string, prefix: string, list: string, suffix: string) =>
      `${prefix}${castListEntries(list, '"FulfillmentStatus"')}${suffix}`
  );
  updated = updated.replace(
    /("deliveryStatus"\s+IN\s*\()([^)]*)(\))/gi,
    (_match: string, prefix: string, list: string, suffix: string) =>
      `${prefix}${castListEntries(list, '"DeliveryStatus"')}${suffix}`
  );

  return updated;
}

function castListEntries(list: string, enumName: string): string {
  return list
    .split(',')
    .map((entry) => {
      const trimmed = entry.trim();
      if (/::/.test(trimmed)) {
        return trimmed;
      }
      if (/^'[^']+'$/.test(trimmed)) {
        return `${trimmed}::${enumName}`;
      }
      return trimmed;
    })
    .join(', ');
}


