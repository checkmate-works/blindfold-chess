import { describe, expect, it, vi } from 'vitest';

const mockSelectFromWhere = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockSelectFromWhere(),
        }),
      }),
    }),
  },
  profiles: { id: 'id', bannedAt: 'banned_at' },
}));

// Import after mocks are set up
const { isUserBanned } = await import('./ban');

describe('isUserBanned', () => {
  it('should return true when user has bannedAt set', async () => {
    mockSelectFromWhere.mockResolvedValue([{ bannedAt: new Date() }]);

    const result = await isUserBanned('user-id');
    expect(result).toBe(true);
  });

  it('should return false when user has no bannedAt', async () => {
    mockSelectFromWhere.mockResolvedValue([{ bannedAt: null }]);

    const result = await isUserBanned('user-id');
    expect(result).toBe(false);
  });

  it('should return false when user profile not found', async () => {
    mockSelectFromWhere.mockResolvedValue([]);

    const result = await isUserBanned('non-existent-id');
    expect(result).toBe(false);
  });

  it('should return false when bannedAt is undefined', async () => {
    mockSelectFromWhere.mockResolvedValue([{ bannedAt: undefined }]);

    const result = await isUserBanned('user-id');
    expect(result).toBe(false);
  });

  it('should return true for any truthy Date value', async () => {
    mockSelectFromWhere.mockResolvedValue([{ bannedAt: new Date('2024-01-01T00:00:00Z') }]);

    const result = await isUserBanned('user-id');
    expect(result).toBe(true);
  });
});
