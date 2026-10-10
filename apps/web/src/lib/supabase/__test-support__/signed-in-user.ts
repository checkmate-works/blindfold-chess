import { isUserBanned } from '@/lib/moderation/__mocks__/ban';
import { checkRateLimit } from '@/lib/security/__mocks__/rate-limit';
import { getUserMock } from '@/lib/supabase/__mocks__/server';

/**
 * Put a signed-in, unbanned, not-rate-limited user in front of a guarded
 * Server Action — the state every happy-path test starts from.
 *
 * Needs the bare `vi.mock` of `@/lib/supabase/server`, `@/lib/moderation/ban`
 * and `@/lib/security/rate-limit` in the calling file; this drives the spies
 * those `__mocks__` export.
 *
 * The ban and rate-limit mocks already default to "allowed", but setting them
 * again is not redundant: `clearMocks` resets call history between tests, not
 * implementations, so a test that made the user banned would otherwise leak
 * that into every test after it.
 */
export function mockSignedInUser(userId: string): void {
  getUserMock.mockResolvedValue({ data: { user: { id: userId } } });
  isUserBanned.mockResolvedValue(false);
  checkRateLimit.mockResolvedValue({ success: true });
}
