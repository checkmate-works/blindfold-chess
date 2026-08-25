import { revalidateTag } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { profileCacheTag } from '@/lib/cache-tags';
import { whereThenReturning } from '@/lib/db/__test-support__/query-chain';
import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';
import { isUserBanned as mockIsUserBanned } from '@/lib/moderation/__mocks__/ban';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

import { saveOnboardingProfile } from './saveOnboardingProfile';

const mockSet = vi.fn<(values: unknown) => void>();
const mockWhere = vi.fn<() => unknown[]>().mockReturnValue([{ username: 'tester' }]);

vi.mock('@/lib/supabase/server');

vi.mock('@/lib/moderation/ban');

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    update: () => ({
      set: (values: unknown) => {
        mockSet(values);
        return { where: whereThenReturning(mockWhere) };
      },
    }),
  },
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';

describe('saveOnboardingProfile', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
  });

  describe('authentication', () => {
    it('should return signInRequired when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await saveOnboardingProfile({ country: 'JP', bio: '' });

      expect(result).toEqual({ ok: false, error: 'signInRequired' });
      expect(mockWhere).not.toHaveBeenCalled();
    });

    it('should return banned when user is banned', async () => {
      mockIsUserBanned.mockResolvedValue(true);

      const result = await saveOnboardingProfile({ country: 'JP', bio: '' });

      expect(result).toEqual({ ok: false, error: 'banned' });
      expect(mockWhere).not.toHaveBeenCalled();
    });
  });

  describe('country validation', () => {
    it('should reject a country code that is not two letters', async () => {
      const result = await saveOnboardingProfile({ country: 'USA', bio: '' });

      expect(result).toEqual({ ok: false, error: 'invalidCountry' });
      expect(mockWhere).not.toHaveBeenCalled();
    });

    // "ZZ" is well-formed but unassigned in ISO 3166-1, so a bare two-letter
    // check accepts it. This action is the trust boundary — the onboarding
    // form's country <select> can be bypassed by invoking the action directly
    // — and a stored "ZZ" then fails silently: a broken flag on the public
    // profile, and an ad country comparison that never matches.
    it('should reject a two-letter code that is not a real ISO 3166-1 country', async () => {
      const result = await saveOnboardingProfile({ country: 'ZZ', bio: '' });

      expect(result).toEqual({ ok: false, error: 'invalidCountry' });
      expect(mockWhere).not.toHaveBeenCalled();
    });

    it('should accept a lowercase real code by uppercasing it before the check', async () => {
      const result = await saveOnboardingProfile({ country: 'jp', bio: '' });

      expect(result).toEqual({ ok: true });
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ country: 'JP' }));
    });

    it('should store null for an empty country', async () => {
      const result = await saveOnboardingProfile({ country: '   ', bio: '' });

      expect(result).toEqual({ ok: true });
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ country: null }));
    });
  });

  describe('bio validation', () => {
    it('should reject a bio longer than 500 characters', async () => {
      const result = await saveOnboardingProfile({ country: '', bio: 'a'.repeat(501) });

      expect(result).toEqual({ ok: false, error: 'bioTooLong' });
      expect(mockWhere).not.toHaveBeenCalled();
    });
  });

  describe('successful save', () => {
    it('should persist both columns and expire the public profile cache', async () => {
      const result = await saveOnboardingProfile({ country: 'JP', bio: 'I love chess' });

      expect(result).toEqual({ ok: true });
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ country: 'JP', bio: 'I love chess' })
      );
      expect(revalidateTag).toHaveBeenCalledWith(profileCacheTag('tester'), { expire: 0 });
    });
  });
});
