import { checkIpRateLimit } from '@/lib/rate-limit-ip';

const CONTACT_CONFIG = { maxRequests: 3, windowMs: 60_000 };

export function checkRateLimit(ip: string): { allowed: boolean } {
  return checkIpRateLimit(ip, 'contact', CONTACT_CONFIG);
}
