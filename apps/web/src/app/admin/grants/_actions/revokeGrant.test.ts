import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireAdmin = vi.fn();
const mockUpdateSetWhere = vi.fn();
const mockUpdateSet = vi.fn();
const mockRevalidateTag = vi.fn();

vi.mock('@/app/admin/_lib/auth', () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    update: () => ({
      set: (data: unknown) => {
        mockUpdateSet(data);
        return {
          where: (...args: unknown[]) => mockUpdateSetWhere(...args),
        };
      },
    }),
  },
  userGrants: {
    id: 'id',
    revokedAt: 'revoked_at',
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

const { revokeGrant } = await import('./revokeGrant');

describe('revokeGrant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unauthorized when user is not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ error: 'unauthorized' });

    const result = await revokeGrant('grant-123');
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return error when grantId is empty', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });

    const result = await revokeGrant('');
    expect(result).toEqual({ error: 'Grant ID is required' });
  });

  it('should return success and update revokedAt when valid', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockUpdateSetWhere.mockResolvedValue(undefined);

    const result = await revokeGrant('grant-123');
    expect(result).toEqual({ success: true });
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        revokedAt: expect.any(Date),
      })
    );
  });

  it('should call revalidateTag on success', async () => {
    mockRequireAdmin.mockResolvedValue({ userId: 'admin-id' });
    mockUpdateSetWhere.mockResolvedValue(undefined);

    await revokeGrant('grant-123');
    expect(mockRevalidateTag).toHaveBeenCalledWith('grant-status', { expire: 60 });
  });
});
