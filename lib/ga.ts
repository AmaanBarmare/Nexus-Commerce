/**
 * Send a purchase event to Google Analytics 4 via Measurement Protocol
 * 
 * @see https://developers.google.com/analytics/devguides/collection/protocol/ga4
 */
export async function sendGaPurchase({
  measurementId,
  apiSecret,
  clientId,
  userId,
  order,
}: {
  measurementId: string;
  apiSecret: string;
  clientId: string;
  userId?: string;
  order: {
    orderNumber: number;
    currency: string;
    totalMinor: number;
    taxMinor: number;
    shippingMinor: number;
    discountCode?: string | null;
    items: Array<{
      sku: string;
      title: string;
      qty: number;
      unitPriceMinor: number;
    }>;
  };
}): Promise<boolean> {
  try {
    const payload = {
      client_id: clientId || `anon.${order.orderNumber}`,
      user_id: userId,
      events: [
        {
          name: 'purchase',
          params: {
            transaction_id: String(order.orderNumber),
            value: order.totalMinor / 100,
            currency: order.currency || 'INR',
            tax: order.taxMinor / 100,
            shipping: order.shippingMinor / 100,
            coupon: order.discountCode || undefined,
            items: order.items.map((i) => ({
              item_id: i.sku,
              item_name: i.title,
              quantity: i.qty,
              price: i.unitPriceMinor / 100,
            })),
          },
        },
      ],
    };

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (error) {
    console.error('GA4 purchase tracking failed:', error);
    return false;
  }
}

