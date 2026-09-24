import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RepertoireImportInput } from './validation';

const mockAuthenticateAndGuard = vi.fn();
const mockUserHasProfile = vi.fn(async () => true);
const mockValidateRepertoireImport = vi.fn();
const mockTxInsertReturning = vi.fn();
const mockChargeRepertoireVisibility = vi.fn();
/** Outcome of each `db.transaction` call, as drizzle would settle it. */
const transactionOutcomes: Array<'committed' | 'rolledBack'> = [];

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
  chargeRepertoireVisibility: (...args: unknown[]) => mockChargeRepertoireVisibility(...args),
  clawbackPointsForPost: vi.fn(),
}));

vi.mock('@/lib/db/list-query', () => ({
  countRows: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) }),
    // Settles like drizzle: the transaction commits whenever the callback
    // resolves — whatever it resolves with — and rolls back only on a throw.
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      try {
        const value = await fn({
          insert: () => ({
            values: () => ({ returning: () => mockTxInsertReturning() }),
          }),
        });
        transactionOutcomes.push('committed');
        return value;
      } catch (error) {
        transactionOutcomes.push('rolledBack');
        throw error;
      }
    },
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

  describe('with a valid import', () => {
    beforeEach(() => {
      transactionOutcomes.length = 0;
      mockTxInsertReturning.mockResolvedValue([{ id: 'repertoire-1' }]);
      mockValidateRepertoireImport.mockReturnValue({
        ok: true,
        data: {
          name: 'Italian Game',
          side: 'white',
          phase: 'opening',
          description: '',
          visibility: 'followers_only',
          startingFen: null,
          lines: [{ pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4', startingFen: null }],
          annotations: [],
        },
      });
    });

    it('rolls the course back when the wallet cannot cover a paid tier', async () => {
      mockChargeRepertoireVisibility.mockResolvedValue({
        ok: false,
        error: 'insufficient_balance',
      });

      const { createRepertoireEntry } = await import('./mutations');
      const result = await createRepertoireEntry({ ...baseInput, visibility: 'followers_only' });

      // The course row and its lines are written before the charge, so a
      // refused charge has to undo them: committing would hand the author a
      // paid-tier course for free while telling them it failed.
      expect(result).toEqual({ error: 'insufficient_balance' });
      expect(transactionOutcomes).toEqual(['rolledBack']);
    });

    it('commits the course once the paid tier is charged', async () => {
      mockChargeRepertoireVisibility.mockResolvedValue({ ok: true, charged: 1 });

      const { createRepertoireEntry } = await import('./mutations');
      const result = await createRepertoireEntry({ ...baseInput, visibility: 'followers_only' });

      expect(result).toEqual({ success: true, id: 'repertoire-1' });
      expect(transactionOutcomes).toEqual(['committed']);
    });
  });

  it('reaches validation once the author has a profile', async () => {
    const { createRepertoireEntry } = await import('./mutations');
    const result = await createRepertoireEntry(baseInput);

    expect(result).toEqual({ error: 'invalidPgn' });
    expect(mockValidateRepertoireImport).toHaveBeenCalledWith(baseInput);
  });
});
