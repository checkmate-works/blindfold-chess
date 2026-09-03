import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RepertoireImportInput } from './validation';

const mockAuthenticateAndGuard = vi.fn();
const mockUserHasProfile = vi.fn(async () => true);
const mockValidateRepertoireImport = vi.fn();
const mockTxInsertReturning = vi.fn();
const mockRevalidateTag = vi.fn();

vi.mock('@/lib/auth', () => ({
  authenticateAndGuard: (...args: unknown[]) => mockAuthenticateAndGuard(...args),
  // Composed rather than stubbed flat, exactly as the real helper composes it:
  // the plain guard first, then the `profiles` lookup.
  authenticateGuardAndRequireProfile: async (...args: unknown[]) => {
    const guardResult = await mockAuthenticateAndGuard(...args);
    if ('error' in guardResult) return guardResult;
    return (await mockUserHasProfile()) ? guardResult : { error: 'profileRequired' };
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

vi.mock('./validation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./validation')>();
  return {
    ...actual,
    validateRepertoireImport: (...args: unknown[]) => mockValidateRepertoireImport(...args),
  };
});

vi.mock('./queries', () => ({
  assertRepertoireOwner: vi.fn(),
}));

vi.mock('@/lib/points', () => ({
  chargeRepertoireVisibility: vi.fn(),
  clawbackPointsForPost: vi.fn(),
}));

vi.mock('@/lib/db/list-query', () => ({
  countRows: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) }),
    transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        insert: () => ({
          values: () => ({ returning: () => mockTxInsertReturning() }),
        }),
      }),
  },
  chessOpenings: {},
  repertoireAnnotations: {},
  repertoireChapters: {},
  repertoireLines: {},
  repertoireOpenings: {},
  repertoires: {},
}));

const TEST_USER_ID = 'user-00000000-0000-0000-0000-000000000001';

const baseInput: RepertoireImportInput = {
  name: 'Italian Game',
  side: 'white',
  phase: 'opening',
  pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
};

describe('createRepertoireEntry', () => {
  beforeEach(() => {
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockValidateRepertoireImport.mockReturnValue({ ok: false, error: 'invalidPgn' });
  });

  it('propagates signInRequired from the guard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { createRepertoireEntry } = await import('./mutations');
    const result = await createRepertoireEntry(baseInput);

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockValidateRepertoireImport).not.toHaveBeenCalled();
  });

  it('rejects a provisional author with profileRequired before the course lands', async () => {
    mockUserHasProfile.mockResolvedValueOnce(false);

    const { createRepertoireEntry } = await import('./mutations');
    const result = await createRepertoireEntry(baseInput);

    // A course is listed publicly under its author's name, so it must not be
    // written by a user with no profile row to name them. The rejection lands
    // before validation, so nothing about the import is even parsed.
    expect(result).toEqual({ error: 'profileRequired' });
    expect(mockValidateRepertoireImport).not.toHaveBeenCalled();
    expect(mockTxInsertReturning).not.toHaveBeenCalled();
  });

  it('reaches validation once the author has a profile', async () => {
    const { createRepertoireEntry } = await import('./mutations');
    const result = await createRepertoireEntry(baseInput);

    expect(result).toEqual({ error: 'invalidPgn' });
    expect(mockValidateRepertoireImport).toHaveBeenCalledWith(baseInput);
  });
});
