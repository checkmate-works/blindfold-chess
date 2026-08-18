import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkRateLimit } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

import { updateProfile } from './updateProfile';

const mockGetUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockWhere = vi.fn().mockResolvedValue(undefined);
// Resolves the "previous profile" row read before the update. Defaults to an
// empty result (no prior row); individual tests override with mockResolvedValueOnce.
const mockSelectWhere = vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]);

vi.mock('@/lib/users/activity-log');

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

vi.mock('@/lib/moderation/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  RATE_LIMITS: {
    updateProfile: { action: 'update_profile', maxAttempts: 5, windowMs: 600_000 },
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: mockSelectWhere,
      }),
    }),
    update: () => ({
      set: () => ({
        where: mockWhere,
      }),
    }),
  },
  profiles: {
    id: 'id',
    displayName: 'display_name',
    bio: 'bio',
    country: 'country',
    flair: 'flair',
    fideId: 'fide_id',
    chesscomUsername: 'chesscom_username',
    lichessUsername: 'lichess_username',
    xUsername: 'x_username',
    instagramUsername: 'instagram_username',
    youtubeHandle: 'youtube_handle',
    updatedAt: 'updated_at',
  },
}));

vi.mock('@/lib/content/lame-name', () => ({
  isLameName: (name: string) => name === 'badname',
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';

describe('updateProfile', () => {
  describe('authentication', () => {
    it('should return signInRequired when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await updateProfile({ displayName: 'Test' });

      expect(result).toEqual({ error: 'signInRequired' });
      expect(mockWhere).not.toHaveBeenCalled();
    });
  });

  describe('ban enforcement', () => {
    it('should return banned when user is banned', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(true);

      const result = await updateProfile({ displayName: 'Test' });

      expect(result).toEqual({ error: 'banned' });
      expect(mockWhere).not.toHaveBeenCalled();
    });

    it('should proceed when user is not banned', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);

      const result = await updateProfile({ displayName: 'ValidName' });

      expect(result).toEqual({ success: true });
    });
  });

  describe('rate limit enforcement', () => {
    it('should return rateLimited when rate limit is exceeded', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ error: 'rateLimited' } as never);

      const result = await updateProfile({ displayName: 'ValidName' });

      expect(result).toEqual({ error: 'rateLimited' });
      expect(mockWhere).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
    });

    // [description, input (merged over a valid displayName), expected error]
    const rejectedCases: [string, Record<string, string>, string][] = [
      [
        'displayName missing',
        { displayName: undefined as unknown as string },
        'display_name_required',
      ],
      ['displayName is whitespace-only', { displayName: '   ' }, 'display_name_required'],
      [
        'displayName exceeds 50 characters',
        { displayName: 'a'.repeat(51) },
        'display_name_too_long',
      ],
      ['displayName is inappropriate', { displayName: 'badname' }, 'display_name_inappropriate'],
      ['bio exceeds 500 characters', { bio: 'a'.repeat(501) }, 'bio_too_long'],
      ['country code is not two letters', { country: 'USA' }, 'invalid_country'],
      ['fideId contains non-digit characters', { fideId: '123abc' }, 'fide_id_invalid_format'],
      ['fideId contains path traversal', { fideId: '../etc' }, 'fide_id_invalid_format'],
      ['fideId contains null byte', { fideId: '123\x0045' }, 'fide_id_invalid_format'],
      ['fideId contains Unicode digits', { fideId: '１２３４' }, 'fide_id_invalid_format'],
      ['fideId exceeds 50 characters', { fideId: '1'.repeat(51) }, 'fide_id_too_long'],
      [
        'chesscomUsername contains special characters',
        { chesscomUsername: 'user@name!' },
        'chesscom_username_invalid_format',
      ],
      [
        'chesscomUsername contains path traversal',
        { chesscomUsername: '../etc' },
        'chesscom_username_invalid_format',
      ],
      [
        'chesscomUsername contains URL-encoded path traversal',
        { chesscomUsername: '..%2Fetc' },
        'chesscom_username_invalid_format',
      ],
      [
        'chesscomUsername contains URL-encoded null byte',
        { chesscomUsername: 'user%00name' },
        'chesscom_username_invalid_format',
      ],
      [
        'chesscomUsername contains Japanese characters',
        { chesscomUsername: 'ユーザー' },
        'chesscom_username_invalid_format',
      ],
      [
        'chesscomUsername contains dots',
        { chesscomUsername: 'user.name' },
        'chesscom_username_invalid_format',
      ],
      [
        'chesscomUsername contains spaces',
        { chesscomUsername: 'user name' },
        'chesscom_username_invalid_format',
      ],
      [
        'chesscomUsername exceeds 255 characters',
        { chesscomUsername: 'a'.repeat(256) },
        'chesscom_username_too_long',
      ],
      [
        'lichessUsername contains special characters',
        { lichessUsername: 'user name!' },
        'lichess_username_invalid_format',
      ],
      [
        'lichessUsername contains path traversal',
        { lichessUsername: '../etc' },
        'lichess_username_invalid_format',
      ],
      [
        'lichessUsername contains URL-encoded characters',
        { lichessUsername: 'user%20name' },
        'lichess_username_invalid_format',
      ],
      [
        'lichessUsername contains emoji',
        { lichessUsername: 'player♟' },
        'lichess_username_invalid_format',
      ],
      [
        'lichessUsername contains at-sign',
        { lichessUsername: 'user@name' },
        'lichess_username_invalid_format',
      ],
      [
        'lichessUsername exceeds 255 characters',
        { lichessUsername: 'a'.repeat(256) },
        'lichess_username_too_long',
      ],
      ['xUsername contains a period', { xUsername: 'user.name' }, 'x_username_invalid_format'],
      ['xUsername contains a hyphen', { xUsername: 'user-name' }, 'x_username_invalid_format'],
      [
        'xUsername contains Unicode characters',
        { xUsername: 'ユーザー' },
        'x_username_invalid_format',
      ],
      ['xUsername contains null byte', { xUsername: 'user\x00name' }, 'x_username_invalid_format'],
      [
        'xUsername contains URL-encoded characters',
        { xUsername: 'user%20name' },
        'x_username_invalid_format',
      ],
      ['xUsername contains path traversal', { xUsername: '../etc' }, 'x_username_invalid_format'],
      ['xUsername exceeds 15 characters', { xUsername: 'a'.repeat(16) }, 'x_username_too_long'],
      [
        'instagramUsername contains a hyphen',
        { instagramUsername: 'user-name' },
        'instagram_username_invalid_format',
      ],
      [
        'instagramUsername contains invalid characters',
        { instagramUsername: 'user-name!' },
        'instagram_username_invalid_format',
      ],
      [
        'instagramUsername contains emoji',
        { instagramUsername: 'player♟' },
        'instagram_username_invalid_format',
      ],
      [
        'instagramUsername contains null byte',
        { instagramUsername: 'user\x00name' },
        'instagram_username_invalid_format',
      ],
      [
        'instagramUsername contains URL-encoded characters',
        { instagramUsername: 'user%2Fname' },
        'instagram_username_invalid_format',
      ],
      [
        'instagramUsername contains path traversal',
        { instagramUsername: '../etc' },
        'instagram_username_invalid_format',
      ],
      [
        'instagramUsername exceeds 30 characters',
        { instagramUsername: 'a'.repeat(31) },
        'instagram_username_too_long',
      ],
      [
        'youtubeHandle contains invalid characters',
        { youtubeHandle: 'channel@name!' },
        'youtube_handle_invalid_format',
      ],
      [
        'youtubeHandle contains Japanese characters',
        { youtubeHandle: 'チャンネル名' },
        'youtube_handle_invalid_format',
      ],
      [
        'youtubeHandle contains null byte',
        { youtubeHandle: 'user\x00name' },
        'youtube_handle_invalid_format',
      ],
      [
        'youtubeHandle contains URL-encoded characters',
        { youtubeHandle: 'user%00name' },
        'youtube_handle_invalid_format',
      ],
      [
        'youtubeHandle contains path traversal',
        { youtubeHandle: '../etc' },
        'youtube_handle_invalid_format',
      ],
      [
        'youtubeHandle exceeds 30 characters',
        { youtubeHandle: 'a'.repeat(31) },
        'youtube_handle_too_long',
      ],
    ];

    it.each(rejectedCases)('should reject when %s', async (_name, overrides, expectedError) => {
      const result = await updateProfile({ displayName: 'Valid', ...overrides });

      expect(result).toEqual({ error: expectedError });
      expect(mockWhere).not.toHaveBeenCalled();
    });

    // [description, input (merged over a valid displayName)]
    const acceptedCases: [string, Record<string, string>][] = [
      ['fideId with valid digits', { fideId: '12345678' }],
      ['single digit fideId (minimum valid)', { fideId: '1' }],
      ['fideId at exactly 50 characters (max length)', { fideId: '1'.repeat(50) }],
      ['whitespace-only fideId (treated as null)', { fideId: '   ' }],
      ['chesscomUsername with valid characters', { chesscomUsername: 'Player_One-23' }],
      ['chesscomUsername with all valid character types', { chesscomUsername: 'Aa0_-' }],
      ['single character chesscomUsername (minimum valid)', { chesscomUsername: 'a' }],
      [
        'chesscomUsername at exactly 255 characters (max length)',
        { chesscomUsername: 'a'.repeat(255) },
      ],
      ['whitespace-only chesscomUsername (treated as null)', { chesscomUsername: '   ' }],
      ['lichessUsername with valid characters', { lichessUsername: 'Player_One-23' }],
      ['single character lichessUsername (minimum valid)', { lichessUsername: 'Z' }],
      [
        'lichessUsername at exactly 255 characters (max length)',
        { lichessUsername: 'a'.repeat(255) },
      ],
      ['whitespace-only lichessUsername (treated as null)', { lichessUsername: '   ' }],
      ['xUsername with valid characters', { xUsername: 'user_123' }],
      ['single character xUsername (minimum valid)', { xUsername: 'a' }],
      ['xUsername at exactly 15 characters (max length)', { xUsername: 'a'.repeat(15) }],
      ['whitespace-only xUsername (treated as null)', { xUsername: '   ' }],
      [
        'instagramUsername with valid characters including periods',
        { instagramUsername: 'user.name_123' },
      ],
      [
        'instagramUsername with only periods and alphanumerics',
        { instagramUsername: 'chess.player.99' },
      ],
      ['single character instagramUsername (minimum valid)', { instagramUsername: 'a' }],
      [
        'instagramUsername at exactly 30 characters (max length)',
        { instagramUsername: 'a'.repeat(30) },
      ],
      ['whitespace-only instagramUsername (treated as null)', { instagramUsername: '   ' }],
      [
        'youtubeHandle with valid characters including periods and hyphens',
        { youtubeHandle: 'my-channel.name_1' },
      ],
      ['youtubeHandle with both period and hyphen', { youtubeHandle: 'my.channel-name' }],
      ['single character youtubeHandle (minimum valid)', { youtubeHandle: 'a' }],
      ['youtubeHandle at exactly 30 characters (max length)', { youtubeHandle: 'a'.repeat(30) }],
      ['whitespace-only youtubeHandle (treated as null)', { youtubeHandle: '   ' }],
      ['empty SNS account values', { xUsername: '', instagramUsername: '', youtubeHandle: '' }],
      ['empty chess account values', { fideId: '', chesscomUsername: '', lichessUsername: '' }],
      [
        'all three SNS fields with valid values simultaneously',
        {
          xUsername: 'chess_player',
          instagramUsername: 'chess.player_1',
          youtubeHandle: 'chess-player.yt',
        },
      ],
      ['displayName at exactly 50 characters (max length)', { displayName: 'a'.repeat(50) }],
      ['bio at exactly 500 characters (max length)', { bio: 'a'.repeat(500) }],
      [
        'all fields together (chess + SNS)',
        {
          displayName: 'GrandMaster',
          bio: 'FIDE rated player',
          country: 'JP',
          fideId: '12345678',
          chesscomUsername: 'gm_player',
          lichessUsername: 'gm-player',
          xUsername: 'gm_chess',
          instagramUsername: 'gm.chess_player',
          youtubeHandle: 'gm-chess.channel',
        },
      ],
    ];

    it.each(acceptedCases)('should accept %s', async (_name, overrides) => {
      const result = await updateProfile({ displayName: 'Valid', ...overrides });

      expect(result).toEqual({ success: true });
    });

    it('should accept a bare displayName with all optional fields undefined', async () => {
      const result = await updateProfile({ displayName: 'Valid' });

      expect(result).toEqual({ success: true });
    });
  });

  describe('successful update', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
    });

    it('should update profile and return success', async () => {
      const result = await updateProfile({
        displayName: 'Chess Player',
        bio: 'I love chess',
        country: 'us',
      });

      expect(result).toEqual({ success: true });
      expect(mockWhere).toHaveBeenCalled();
    });

    it('should log update_profile with the overwritten (from) and new (to) values', async () => {
      mockSelectWhere.mockResolvedValueOnce([
        {
          displayName: 'Old Name',
          bio: null,
          country: null,
          flair: null,
          fideId: null,
          chesscomUsername: null,
          lichessUsername: null,
          xUsername: null,
          instagramUsername: null,
          youtubeHandle: null,
        },
      ]);
      await updateProfile({ displayName: 'Chess Player' });

      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'update_profile',
        targetType: 'user',
        targetId: testUserId,
        metadata: { changes: { displayName: { from: 'Old Name', to: 'Chess Player' } } },
      });
    });

    it('should log only the fields that actually changed', async () => {
      mockSelectWhere.mockResolvedValueOnce([
        {
          displayName: 'Same Name',
          bio: 'old bio',
          country: 'JP',
          flair: null,
          fideId: null,
          chesscomUsername: null,
          lichessUsername: null,
          xUsername: null,
          instagramUsername: null,
          youtubeHandle: null,
        },
      ]);
      // displayName + country unchanged; only bio changes.
      await updateProfile({ displayName: 'Same Name', bio: 'new bio', country: 'jp' });

      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'update_profile',
        targetType: 'user',
        targetId: testUserId,
        metadata: { changes: { bio: { from: 'old bio', to: 'new bio' } } },
      });
    });

    it('should not log when no fields changed', async () => {
      mockSelectWhere.mockResolvedValueOnce([
        {
          displayName: 'Chess Player',
          bio: null,
          country: null,
          flair: null,
          fideId: null,
          chesscomUsername: null,
          lichessUsername: null,
          xUsername: null,
          instagramUsername: null,
          youtubeHandle: null,
        },
      ]);
      await updateProfile({ displayName: 'Chess Player' });

      expect(logActivityEvent).not.toHaveBeenCalled();
    });

    it('should not log activity event when the guard rejects', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      await updateProfile({ displayName: 'Test' });

      expect(logActivityEvent).not.toHaveBeenCalled();
    });
  });
});
