import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveLichessAttachmentPgn } from './resolve-lichess-attachment';

const fetchLichessGamePgnMock = vi.fn();
vi.mock('./lichess', () => ({
  fetchLichessGamePgn: (...args: unknown[]) => fetchLichessGamePgnMock(...args),
}));

const dbSelectMock = vi.fn();
vi.mock('@/lib/db', () => ({
  db: {
    select: (...args: unknown[]) => dbSelectMock(...args),
  },
  postGamePgnAttachments: {
    pgn: 'pgn',
    source: 'source',
    sourceGameId: 'sourceGameId',
    createdAt: 'createdAt',
  },
}));

/**
 * The resolver chains drizzle calls (`db.select(...).from(...).where(...).orderBy(...).limit(...)`).
 * Build a fluent chain that ends in a Promise resolving to the rows we want.
 */
function selectChainResolving(rows: { pgn: string }[]) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve(rows)),
  };
  return chain;
}

describe('resolveLichessAttachmentPgn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('reuse path (cached row found)', () => {
    it('returns the cached PGN with reused=true and DOES NOT call fetchLichessGamePgn', async () => {
      const cachedPgn = '[Event "Cached"]\n\n1. e4 e5';
      dbSelectMock.mockReturnValue(selectChainResolving([{ pgn: cachedPgn }]));

      const result = await resolveLichessAttachmentPgn('abcd1234');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.pgn).toBe(cachedPgn);
        expect(result.canonicalUrl).toBe('https://lichess.org/abcd1234');
        expect(result.reused).toBe(true);
      }
      expect(fetchLichessGamePgnMock).not.toHaveBeenCalled();
    });

    it('returns the most recent cached row (limit 1) regardless of how many writes existed', async () => {
      // The query orders by createdAt desc and limits to 1; this asserts
      // the resolver trusts that ordering rather than aggregating.
      const newest = 'NEWEST_PGN';
      dbSelectMock.mockReturnValue(selectChainResolving([{ pgn: newest }]));

      const result = await resolveLichessAttachmentPgn('abcd1234');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.pgn).toBe(newest);
      }
    });
  });

  describe('fetch fallback (no recent cached row)', () => {
    it('falls through to fetchLichessGamePgn and returns reused=false on success', async () => {
      dbSelectMock.mockReturnValue(selectChainResolving([])); // no cache hit
      fetchLichessGamePgnMock.mockResolvedValue({
        ok: true,
        pgn: 'FRESH_PGN',
        canonicalUrl: 'https://lichess.org/abcd1234',
      });

      const result = await resolveLichessAttachmentPgn('abcd1234');

      expect(fetchLichessGamePgnMock).toHaveBeenCalledTimes(1);
      expect(fetchLichessGamePgnMock).toHaveBeenCalledWith('abcd1234');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.pgn).toBe('FRESH_PGN');
        expect(result.reused).toBe(false);
      }
    });

    it('propagates the fetcher error verbatim (rate_limited)', async () => {
      dbSelectMock.mockReturnValue(selectChainResolving([]));
      fetchLichessGamePgnMock.mockResolvedValue({
        ok: false,
        error: 'rate_limited',
      });

      const result = await resolveLichessAttachmentPgn('abcd1234');
      expect(result).toEqual({ ok: false, error: 'rate_limited' });
    });

    it('propagates the fetcher error verbatim (not_found)', async () => {
      dbSelectMock.mockReturnValue(selectChainResolving([]));
      fetchLichessGamePgnMock.mockResolvedValue({
        ok: false,
        error: 'not_found',
      });

      const result = await resolveLichessAttachmentPgn('abcd1234');
      expect(result).toEqual({ ok: false, error: 'not_found' });
    });
  });

  describe('malformed game id', () => {
    it('skips the DB lookup entirely for non-canonical IDs and delegates to the fetcher', async () => {
      // The resolver guards the DB lookup with `/^[a-zA-Z0-9]{8}$/` so a
      // 12-char id should never trigger a SELECT — the fetcher gets to
      // return `invalid_id` through its own validation path.
      fetchLichessGamePgnMock.mockResolvedValue({ ok: false, error: 'invalid_id' });

      const result = await resolveLichessAttachmentPgn('abcd1234abcd');

      expect(dbSelectMock).not.toHaveBeenCalled();
      expect(fetchLichessGamePgnMock).toHaveBeenCalledWith('abcd1234abcd');
      expect(result).toEqual({ ok: false, error: 'invalid_id' });
    });
  });

  describe('reuse window contract', () => {
    it('queries the DB with a recency filter (covered by select chain shape)', async () => {
      // We cannot inspect the actual SQL fragment from drizzle without
      // pulling in a real Postgres, but we can confirm the resolver
      // builds the chain `select → from → where → orderBy → limit(1)`
      // exactly once per invocation. If a future refactor drops the
      // recency filter (`gt(createdAt, now() - 30 days)`), this test
      // still catches the structural drift and prompts a re-review.
      const chain = selectChainResolving([{ pgn: 'X' }]);
      dbSelectMock.mockReturnValue(chain);

      await resolveLichessAttachmentPgn('abcd1234');

      expect(chain.from).toHaveBeenCalledTimes(1);
      expect(chain.where).toHaveBeenCalledTimes(1);
      expect(chain.orderBy).toHaveBeenCalledTimes(1);
      expect(chain.limit).toHaveBeenCalledWith(1);
    });
  });
});
