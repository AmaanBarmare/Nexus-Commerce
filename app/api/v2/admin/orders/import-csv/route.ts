import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';
import { getNextOrderNumber } from '@/lib/order-counter';

function toMinor(value: any): number {
  const n = Number(value);
  if (Number.isNaN(n) || n === null) return 0;
  return Math.round(n * 100);
}

function normalizeEmail(v: any) {
  return String(v || '').trim().toLowerCase();
}

function splitName(full: string) {
  const t = String(full || '').trim();
  if (!t) return { firstName: '', lastName: '' };
  const parts = t.split(/\s+/);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
}

function mapPaymentStatus(financial: string) {
  const v = String(financial || '').toLowerCase();
  if (v.includes('paid')) return 'paid';
  if (v.includes('refund')) return 'refunded';
  return 'unpaid';
}

function mapFulfillmentStatus(fulfillment: string) {
  const v = String(fulfillment || '').toLowerCase();
  // Important: check for "unfulfilled" before "fulfilled" to avoid misclassifying
  if (v.includes('unfulfilled')) return 'unfulfilled';
  if (v.includes('fulfilled')) return 'fulfilled';
  if (v.includes('return')) return 'returned';
  return 'unfulfilled';
}

function inferDeliveryStatus(tags: string, fulfillment: string) {
  const f = String(fulfillment || '').toLowerCase();

  // If the order is unfulfilled, delivery should always be pending
  if (f.includes('unfulfilled')) return 'pending';

  const t = String(tags || '').toLowerCase();
  if (t.includes('delivered')) return 'delivered';
  if (t.includes('shipped')) return 'shipped';

  if (f.includes('fulfilled')) return 'shipped';
  return 'pending';
}

export async function POST(req: NextRequest) {
  const admin = await isAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing CSV file (field name: file)' }, { status: 400 });
    }

    const csvText = await (file as File).text();

    const parsed = Papa.parse<Record<string, any>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors?.length) {
      return NextResponse.json(
        { error: 'CSV parse error', details: parsed.errors.slice(0, 5) },
        { status: 400 }
      );
    }

    const rows = (parsed.data || []).filter((r) => r && Object.keys(r).length > 0);

    // Group rows into orders
    const groups = new Map<string, Record<string, any>[]>();
    for (const r of rows) {
      const key = String(r['Id'] || r['Name'] || '').trim();
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ key: string; message: string }> = [];

    // Process each order group
    for (const [key, groupRows] of groups.entries()) {
      try {
        const first = groupRows[0];

        const name = String(first['Name'] || '');
        const externalId = String(first['Id'] || name).trim();
        if (!externalId) {
          skipped++;
          errors.push({
            key,
            message: 'Missing Id/Name for order group',
          });
          continue;
        }

        const email = normalizeEmail(first['Email']);
        if (!email) {
          skipped++;
          errors.push({ key, message: `Missing Email for order ${name}` });
          continue;
        }

        const shipName = String(first['Shipping Name'] || first['Billing Name'] || '');
        const { firstName, lastName } = splitName(shipName);

        const phone =
          String(first['Phone'] || first['Shipping Phone'] || first['Billing Phone'] || '').trim() ||
          null;

        // Build shipping/billing address JSON in your existing address shape
        const shippingAddress = {
          name: shipName || undefined,
          phone: String(first['Shipping Phone'] || first['Phone'] || '').trim() || undefined,
          line1: String(first['Shipping Address1'] || first['Shipping Street'] || '').trim(),
          line2: String(first['Shipping Address2'] || '').trim() || undefined,
          city: String(first['Shipping City'] || '').trim(),
          state:
            String(first['Shipping Province'] || first['Shipping Province Name'] || '').trim() ||
            undefined,
          postalCode: String(first['Shipping Zip'] || '').trim(),
          country: String(first['Shipping Country'] || 'India').trim(),
        };

        const billingAddress = {
          name: String(first['Billing Name'] || shipName || '').trim() || undefined,
          phone: String(first['Billing Phone'] || first['Phone'] || '').trim() || undefined,
          line1: String(first['Billing Address1'] || first['Billing Street'] || '').trim(),
          line2: String(first['Billing Address2'] || '').trim() || undefined,
          city: String(first['Billing City'] || '').trim(),
          state:
            String(first['Billing Province'] || first['Billing Province Name'] || '').trim() ||
            undefined,
          postalCode: String(first['Billing Zip'] || '').trim(),
          country: String(first['Billing Country'] || first['Shipping Country'] || 'India').trim(),
        };

        const financialStatus = String(first['Financial Status'] || '');

        // Skip orders that are not marked as paid in Shopify
        if (!financialStatus.toLowerCase().includes('paid')) {
          skipped++;
          errors.push({
            key,
            message: `Skipping order ${name} (${externalId}) because Financial Status is "${financialStatus}"`,
          });
          continue;
        }

        const fulfillmentStatus = String(first['Fulfillment Status'] || '');
        const tags = String(first['Tags'] || '');

        const paymentStatus = mapPaymentStatus(financialStatus);
        const fulfillment = mapFulfillmentStatus(fulfillmentStatus);
        // Use the mapped fulfillment status when inferring delivery status
        const deliveryStatus = inferDeliveryStatus(tags, fulfillment);

        const subtotalMinor = toMinor(first['Subtotal']);
        const shippingMinor = toMinor(first['Shipping']);
        const taxMinor = toMinor(first['Taxes']);
        const discountMinor = toMinor(first['Discount Amount']);
        const totalMinor = toMinor(first['Total']);
        const discountCode = String(first['Discount Code'] || '').trim() || null;

        // Create/update customer
        const customer = await prisma.customer.upsert({
          where: { email },
          create: {
            email,
            firstName: firstName || null,
            lastName: lastName || null,
            phone,
            country:
              String(first['Shipping Country'] || first['Billing Country'] || '').trim() || null,
          },
          update: {
            // don’t overwrite good data with blanks
            firstName: firstName ? firstName : undefined,
            lastName: lastName ? lastName : undefined,
            phone: phone ? phone : undefined,
            country:
              String(first['Shipping Country'] || first['Billing Country'] || '').trim() ||
              undefined,
          },
        });

        // Build order items (SKU → AlyraProduct)
        const items: {
          productId: string;
          variantId: string;
          title: string;
          variantTitle: string | null;
          sku: string;
          unitPriceMinor: number;
          qty: number;
          lineTotalMinor: number;
        }[] = [];

        for (const r of groupRows) {
          const sku = String(r['Lineitem sku'] || '').trim();
          const title = String(r['Lineitem name'] || '').trim();
          const qty = parseInt(String(r['Lineitem quantity'] || '0'), 10);

          // Some rows in Shopify exports can be blank “continuation” rows.
          if (!sku || !title || !qty) continue;

          const unitPriceMinor = toMinor(r['Lineitem price']);
          const lineTotalMinor = unitPriceMinor * qty;

          let product = await prisma.alyraProduct.findUnique({ where: { sku } });
          if (!product) {
            // Create placeholder product so we don't lose line items
            product = await prisma.alyraProduct.create({
              data: {
                sku,
                name: title,
                type: 'Refill',
                status: 'Inactive',
                inventory: 0,
                priceMinor: unitPriceMinor,
              },
            });
          }

          items.push({
            productId: product.id,
            // For consistency with manual order creation, use product.id as variantId
            variantId: product.id,
            title,
            variantTitle: null,
            sku,
            unitPriceMinor,
            qty,
            lineTotalMinor,
          });
        }

        if (items.length === 0) {
          skipped++;
          errors.push({ key, message: `No line items found for order ${name}` });
          continue;
        }

        const baseStatus =
          String(first['Cancelled at'] || '').trim()
            ? 'cancelled'
            : paymentStatus === 'refunded'
            ? 'refunded'
            : paymentStatus === 'paid'
            ? 'paid'
            : 'pending';

        // Always create a new order with the next internal order number
        const orderNumber = await getNextOrderNumber();

        await prisma.order.create({
          data: {
            orderNumber,
            customerId: customer.id,
            email,
            currency: String(first['Currency'] || 'INR'),
            paymentStatus,
            fulfillmentStatus: fulfillment,
            deliveryStatus,
            status: baseStatus,
            subtotalMinor,
            discountMinor,
            shippingMinor,
            taxMinor,
            totalMinor,
            discountCode,
            shippingAddress,
            billingAddress,
            notes: String(first['Notes'] || '').trim() || null,
            items: {
              create: items,
            },
          },
        });

        created++;
      } catch (e: any) {
        skipped++;
        errors.push({ key, message: e?.message || 'Unknown error' });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalGroups: groups.size,
        created,
        updated,
        skipped,
        errorCount: errors.length,
      },
      errors: errors.slice(0, 50),
    });
  } catch (error) {
    console.error('Error importing orders CSV:', error);
    return NextResponse.json(
      { error: 'Failed to import orders CSV', details: (error as Error).message },
      { status: 500 }
    );
  }
}

