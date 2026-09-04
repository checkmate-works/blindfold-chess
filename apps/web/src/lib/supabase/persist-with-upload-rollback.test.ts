import { describe, expect, it, vi } from 'vitest';

import { persistWithUploadRollback } from './persist-with-upload-rollback';

describe('persistWithUploadRollback', () => {
  it('returns the persisted value without rolling back on success', async () => {
    const rollback = vi.fn();

    await expect(
      persistWithUploadRollback({ persist: async () => 'saved', rollback })
    ).resolves.toEqual({ ok: true, value: 'saved' });
    expect(rollback).not.toHaveBeenCalled();
  });

  it('rolls back an uploaded object when persistence fails', async () => {
    const error = new Error('database failed');
    const rollback = vi.fn(async () => ({ error: null }));

    await expect(
      persistWithUploadRollback({
        persist: async () => {
          throw error;
        },
        rollback,
      })
    ).resolves.toEqual({ ok: false, error, rollbackError: null });
    expect(rollback).toHaveBeenCalledOnce();
  });

  it('reports a rollback failure without hiding the persistence error', async () => {
    const error = new Error('database failed');
    const rollbackError = new Error('storage failed');

    await expect(
      persistWithUploadRollback({
        persist: async () => {
          throw error;
        },
        rollback: async () => ({ error: rollbackError }),
      })
    ).resolves.toEqual({ ok: false, error, rollbackError });
  });
});
