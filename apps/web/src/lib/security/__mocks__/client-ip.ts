import { vi } from 'vitest';

/**
 * Client IP resolution, fixed to loopback.
 *
 * Opt in with a bare `vi.mock('@/lib/security/client-ip')`. Moderation and
 * rate-limit paths record the caller's IP, so their tests had to stub this;
 * six used exactly this constant. `client-ip.ts` exports one function.
 */
export const getClientIp = vi.fn(async () => '127.0.0.1' as string | null);
