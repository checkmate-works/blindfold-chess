import { headers } from 'next/headers';

/**
 * Extract the client IP address from request headers.
 * Returns the first IP from x-forwarded-for, or null if unavailable.
 */
export async function getClientIp(): Promise<string | null> {
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  if (!forwarded) return null;
  // x-forwarded-for can contain multiple IPs; take the first (client IP)
  return forwarded.split(',')[0].trim() || null;
}
