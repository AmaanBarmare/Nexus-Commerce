/**
 * Send email using Resend API
 * 
 * @see https://resend.com/docs/api-reference/emails/send-email
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  
  if (!key) {
    console.warn('RESEND_API_KEY not configured, skipping email');
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Alyra <contact@alyra.in>',
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('Resend API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email send failed:', error);
    return false;
  }
}

/**
 * Generate order confirmation email HTML
 */
export function generateOrderConfirmationEmail(order: {
  orderNumber: number;
  email: string;
  totalMinor: number;
  items: Array<{ title: string; variantTitle?: string | null; qty: number; unitPriceMinor: number }>;
  shippingAddress?: any;
}): string {
  const orderNumberStr = String(order.orderNumber).padStart(5, '0');
  const totalFormatted = `₹${(order.totalMinor / 100).toFixed(2)}`;

  const itemsHtml = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">
            ${item.title}${item.variantTitle ? ` - ${item.variantTitle}` : ''}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">
            ${item.qty}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
            ₹${(item.unitPriceMinor / 100).toFixed(2)}
          </td>
        </tr>
      `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation #${orderNumberStr}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">
          Order Confirmation
        </h1>
        
        <p>Thank you for your order!</p>
        
        <div style="background: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <strong>Order #${orderNumberStr}</strong><br>
          <span style="color: #666;">Total: ${totalFormatted}</span>
        </div>

        <h2 style="font-size: 18px; margin-top: 30px;">Order Items</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
              <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <p style="margin-top: 30px;">
          We'll send you a shipping confirmation email as soon as your order ships.
        </p>

        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          If you have any questions, please contact us at <a href="mailto:contact@alyra.in">contact@alyra.in</a>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} Alyra. All rights reserved.
        </p>
      </body>
    </html>
  `;
}

