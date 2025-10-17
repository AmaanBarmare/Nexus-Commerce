/**
 * Add CORS headers to allow requests from the Alyra storefront
 */
export function withCors(headers: HeadersInit = {}): HeadersInit {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  return {
    ...headers,
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Cart-Id',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Handle CORS preflight requests
 */
export function preflight() {
  return new Response(null, {
    status: 204,
    headers: withCors(),
  });
}

