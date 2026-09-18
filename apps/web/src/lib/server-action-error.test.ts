import * as Sentry from '@sentry/nextjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleAdminActionError, handleServerActionError } from './server-action-error';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

describe('handleServerActionError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('reports the error to Sentry and returns the given error code', () => {
    const error = new Error('boom');

    const result = handleServerActionError(error, '[savePracticeResult]', 'save_failed');

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(result).toEqual({ success: false, error: 'save_failed' });
  });

  it('defaults the error code to unexpected_error', () => {
    expect(handleServerActionError(new Error('boom'), '[getLeaderboard]')).toEqual({
      success: false,
      error: 'unexpected_error',
    });
  });
});

describe('handleAdminActionError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('reports the error to Sentry', () => {
    const error = new Error('transaction rolled back');

    handleAdminActionError(error, '[createGrant]', 'failedToCreateGrant');

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it("returns the caller's message unchanged, with no success key", () => {
    const result = handleAdminActionError(new Error('boom'), '[banUser]', 'failedToBan');

    expect(result).toEqual({ error: 'failedToBan' });
    expect('success' in result).toBe(false);
  });

  it('logs the context alongside the caught value', () => {
    const error = new Error('boom');

    handleAdminActionError(error, '[revokeGrant]', 'failedToRevokeGrant');

    expect(console.error).toHaveBeenCalledWith('[revokeGrant]: unexpected error:', error);
  });

  it('reports a thrown non-Error value rather than collapsing it to a string', () => {
    handleAdminActionError('just a string', '[searchUsers]', 'failedToSearchUsers');

    expect(Sentry.captureException).toHaveBeenCalledWith('just a string');
  });
});
