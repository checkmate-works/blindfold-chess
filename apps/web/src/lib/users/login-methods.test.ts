import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockExecute = vi.fn();
const mockUpdateUserById = vi.fn();
const mockCaptureError = vi.fn();

vi.mock('@/lib/db', () => ({
  db: { execute: (...args: unknown[]) => mockExecute(...args) },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { admin: { updateUserById: mockUpdateUserById } },
  }),
}));

vi.mock('@/lib/sentry/capture-error', () => ({
  captureError: (...args: unknown[]) => mockCaptureError(...args),
}));

const { ensureEmailIdentity, getAccountLoginState } = await import('./login-methods');

const userId = 'user-00000000-0000-0000-0000-000000000001';

describe('getAccountLoginState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps the auth rows and drops identities of unknown providers', async () => {
    mockExecute.mockResolvedValue([
      {
        email: 'me@example.com',
        has_password: true,
        pending_email: 'new@example.com',
        identities: [
          { id: 'id-google', provider: 'google', email: 'a@gmail.com' },
          { id: 'id-github', provider: 'github', email: 'x@github.com' },
          { id: 'id-email', provider: 'email', email: null },
        ],
      },
    ]);

    const state = await getAccountLoginState(userId);

    expect(state).toEqual({
      email: 'me@example.com',
      hasPassword: true,
      pendingEmail: 'new@example.com',
      identities: [
        { id: 'id-google', provider: 'google', email: 'a@gmail.com' },
        { id: 'id-email', provider: 'email', email: undefined },
      ],
    });
  });

  it('reads an empty pending change and a missing email as undefined', async () => {
    mockExecute.mockResolvedValue([
      { email: null, has_password: false, pending_email: null, identities: [] },
    ]);

    const state = await getAccountLoginState(userId);

    expect(state.email).toBeUndefined();
    expect(state.pendingEmail).toBeUndefined();
    expect(state.hasPassword).toBe(false);
    expect(state.identities).toEqual([]);
  });
});

describe('ensureEmailIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateUserById.mockResolvedValue({ error: null });
  });

  it('does nothing when an email identity already exists', async () => {
    await ensureEmailIdentity(userId, 'me@example.com', [{ provider: 'email' }]);

    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });

  it('re-confirms the same address through the Admin API when the identity is missing', async () => {
    await ensureEmailIdentity(userId, 'me@example.com', [{ provider: 'google' }]);

    expect(mockUpdateUserById).toHaveBeenCalledWith(userId, {
      email: 'me@example.com',
      email_confirm: true,
    });
    expect(mockCaptureError).not.toHaveBeenCalled();
  });

  it('reports and swallows an Admin API failure', async () => {
    const error = { message: 'boom' };
    mockUpdateUserById.mockResolvedValue({ error });

    await expect(
      ensureEmailIdentity(userId, 'me@example.com', [{ provider: 'google' }])
    ).resolves.toBeUndefined();

    expect(mockCaptureError).toHaveBeenCalledWith(error, expect.stringContaining('email identity'));
  });
});
