/**
 * Pad order number with leading zeros
 * @example padOrderNumber(42) => "00042"
 */
export function padOrderNumber(num: number): string {
  return String(num).padStart(5, '0');
}

/**
 * Format amount in minor units to rupees string
 * @example formatMoney(99900) => "₹999.00"
 */
export function formatMoney(amountMinor: number, currency = 'INR'): string {
  const amount = amountMinor / 100;
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Parse cookie string to get value by name
 */
export function getCookieValue(cookieString: string, name: string): string | undefined {
  const cookies = cookieString.split(';').map(c => c.trim());
  const cookie = cookies.find(c => c.startsWith(`${name}=`));
  return cookie?.split('=')[1];
}

/**
 * Get cart ID from cookie or header
 */
export function getCartId(request: Request): string | null {
  // Try X-Cart-Id header first (for cross-domain requests)
  const headerCartId = request.headers.get('X-Cart-Id');
  if (headerCartId) return headerCartId;

  // Fallback to cookie
  const cookieName = process.env.COOKIE_CART_NAME || 'alyra_cart';
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  return getCookieValue(cookieHeader, cookieName) || null;
}

/**
 * Create Set-Cookie header for cart ID
 */
export function createCartCookie(cartId: string): string {
  const cookieName = process.env.COOKIE_CART_NAME || 'alyra_cart';
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  return `${cookieName}=${cartId}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${maxAge}`;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Generate a random string for client IDs, etc.
 */
export function generateId(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

