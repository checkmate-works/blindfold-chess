import { beforeEach, describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';
import { DISPLAY_NAME_MAX_LENGTH } from '@/lib/users/profile-limits';

import { setUsername } from './setUsername';

const mockAuthenticateAndGuard = vi.fn();
const mockUserHasProfile = vi.fn();
const mockInsertValues = vi.fn();

vi.mock('@/lib/auth', () => ({
  authenticateAndGuard: (...args: unknown[]) => mockAuthenticateAndGuard(...args),
  userHasProfile: (...args: unknown[]) => mockUserHasProfile(...args),
}));

vi.mock('@/lib/security/rate-limit');

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    insert: () => ({
      values: (...args: unknown[]) => mockInsertValues(...args),
    }),
  },
}));

const TEST_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('setUsername', () => {
  beforeEach(() => {
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockUserHasProfile.mockResolvedValue(false);
    mockInsertValues.mockResolvedValue(undefined);
  });

  it('should create the profile with the chosen display name', async () => {
    const result = await setUsername({ username: 'tester', displayName: 'Tester' });

    expect(result).toEqual({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith({
      id: TEST_USER_ID,
      username: 'tester',
      displayName: 'Tester',
    });
  });

  describe('display name length', () => {
    // This action creates the profile, and it is the trust boundary: the setup
    // form's `maxLength` stops typing, not a request. A display name longer
    // than the limit used to be written straight through to the varchar(255)
    // column, leaving the user with a profile that `/mypage/profile` — which
    // does enforce the limit — rejected on their next save.
    it('should reject a display name longer than the limit', async () => {
      const result = await setUsername({
        username: 'tester',
        displayName: 'a'.repeat(DISPLAY_NAME_MAX_LENGTH + 1),
      });

      expect(result).toEqual({ error: 'display_name_too_long' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should accept a display name exactly at the limit', async () => {
      const displayName = 'a'.repeat(DISPLAY_NAME_MAX_LENGTH);

      const result = await setUsername({ username: 'tester', displayName });

      expect(result).toEqual({ success: true });
      expect(mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ displayName }));
    });

    // The length is measured after trimming, matching what is stored.
    it('should accept a display name that only exceeds the limit before trimming', async () => {
      const result = await setUsername({
        username: 'tester',
        displayName: `  ${'a'.repeat(DISPLAY_NAME_MAX_LENGTH)}  `,
      });

      expect(result).toEqual({ success: true });
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: 'a'.repeat(DISPLAY_NAME_MAX_LENGTH) })
      );
    });

    // An omitted display name falls back to the username, which
    // `validateUsername` caps at 20 characters — so the fallback can never
    // trip the check.
    it('should fall back to the username when no display name is given', async () => {
      const result = await setUsername({ username: 'tester' });

      expect(result).toEqual({ success: true });
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: 'tester' })
      );
    });
  });
});
