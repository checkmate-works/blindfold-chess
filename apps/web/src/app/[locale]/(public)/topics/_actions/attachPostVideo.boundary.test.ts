import { beforeEach, describe, expect, it, vi } from 'vitest';

import { attachPostVideo } from './attachPostVideo';

/**
 * Boundary / SQLSTATE pins for `attachPostVideo`.
 *
 * The Coder suite covers:
 *   - happy path
 *   - reason → error key mapping (per-reason test for every
 *     `YouTubeUrlReason`)
 *   - 23505 / 23514 / 22001 mappings
 *   - extractPgErrorCode walks `err.cause`
 *
 * This file pins the *boundary rows* that are easy to regress:
 *   - 511 / 512 / 513 char input length on either side of the action's
 *     `SOURCE_URL_MAX_LENGTH = 512` cap, evaluated AFTER trim
 *     (Lessons §10 — trim divergence guard)
 *   - non-mapped SQLSTATEs (23503 FK, 25000 transaction, undefined)
 *     fall through to throw rather than masquerading as a mapped error
 *   - non-Error throwables fall through (extractPgErrorCode returns
 *     undefined for non-Error values)
 *   - ZWSP-padded raw input survives action-level trim and is rejected
 *     at the parser, NOT at the DB CHECK (validator OK / DB CHECK
 *     reject divergence guard)
 */

const mockGetUser = vi.fn();
const mockSelectWhere = vi.fn();
const mockInsertValues = vi.fn();
const mockInsertReturning = vi.fn();
const mockIsUserBanned = vi.fn();
const mockCheckRateLimit = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => {
          mockSelectWhere(...args);
          return {
            limit: () =>
              mockSelectWhere.mock.results[mockSelectWhere.mock.calls.length - 1]?.value ?? [],
          };
        },
      }),
    }),
    insert: () => ({
      values: (...args: unknown[]) => {
        mockInsertValues(...args);
        return {
          returning: () => mockInsertReturning(),
        };
      },
    }),
  },
  postVideoAttachments: {
    id: 'id',
    postId: 'post_id',
    provider: 'provider',
    providerVideoId: 'provider_video_id',
    sourceUrl: 'source_url',
    title: 'title',
    thumbnailUrl: 'thumbnail_url',
    createdAt: 'created_at',
  },
  topicPosts: {
    id: 'id',
    userId: 'user_id',
    deletedAt: 'deleted_at',
  },
}));

vi.mock('@/lib/moderation/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  RATE_LIMITS: {
    attachPostVideo: { action: 'attach_post_video', maxAttempts: 10, windowMs: 3_600_000 },
  },
}));

const userId = 'user-00000000-0000-0000-0000-000000000001';
const postId = '00000000-0000-0000-0000-00000000aaaa';
const VALID_ID = 'VALIDID0001';
const VALID_URL = `https://www.youtube.com/watch?v=${VALID_ID}`;

beforeEach(() => {
  mockGetUser.mockResolvedValue({ data: { user: { id: userId } } });
  mockIsUserBanned.mockResolvedValue(false);
  mockCheckRateLimit.mockResolvedValue({ allowed: true });
  mockSelectWhere.mockReturnValue([{ id: postId, userId, deletedAt: null }]);
  mockInsertReturning.mockResolvedValue([
    {
      id: 'attach-id',
      provider: 'youtube',
      providerVideoId: VALID_ID,
      sourceUrl: VALID_URL,
      title: null,
      thumbnailUrl: null,
      createdAt: new Date('2026-05-04T08:00:00Z'),
    },
  ]);
});

describe('attachPostVideo — input length boundary (511 / 512 / 513 after trim)', () => {
  // The action's pre-check is `rawUrl.length > SOURCE_URL_MAX_LENGTH`
  // where the cap is 512 and `rawUrl` is the trimmed input. So:
  //   - trimmed length 512 → must be allowed past the pre-check
  //   - trimmed length 513 → must be rejected with `inputTooLong`
  //   - trimmed length 511 → must be allowed past the pre-check
  //
  // Crucially, the pre-check must evaluate the TRIMMED length, not the
  // raw length — Lessons §10 (#74 by way of #75). This guard is the
  // anti-divergence pin between the action's length check and the
  // parser's own length cap (also 512).

  function buildUrlOfLength(target: number): string {
    const prefix = `https://www.youtube.com/watch?v=${VALID_ID}&pad=`;
    const padding = 'a'.repeat(target - prefix.length);
    const url = prefix + padding;
    if (url.length !== target) {
      throw new Error(`builder bug: expected ${target}, got ${url.length}`);
    }
    return url;
  }

  it('accepts a trimmed URL of exactly 511 chars', async () => {
    const url = buildUrlOfLength(511);
    const r = await attachPostVideo({ postId, url });
    expect(r).toMatchObject({ success: true });
  });

  it('accepts a trimmed URL of exactly 512 chars (boundary inclusive)', async () => {
    const url = buildUrlOfLength(512);
    const r = await attachPostVideo({ postId, url });
    expect(r).toMatchObject({ success: true });
  });

  it('rejects a trimmed URL of exactly 513 chars with inputTooLong (boundary exclusive)', async () => {
    const url = buildUrlOfLength(513);
    const r = await attachPostVideo({ postId, url });
    expect(r).toEqual({ error: 'postVideoAttachment.error.inputTooLong' });
  });

  it('evaluates the length pre-check on the TRIMMED value (Lessons §10)', async () => {
    // Build a URL of exactly 512 chars, then pad with 200 surrounding
    // spaces (so raw length = 712 > cap, but trimmed length = 512
    // which is at the boundary inclusive). The pre-check must NOT
    // surface inputTooLong — that would be the regression where the
    // action measures raw length but the parser measures trimmed
    // length, and pastes from a copy/paste-with-whitespace would fail
    // even when the actual URL fits.
    const url = buildUrlOfLength(512);
    const padded = `${' '.repeat(100)}${url}${' '.repeat(100)}`;
    expect(padded.length).toBe(712);
    const r = await attachPostVideo({ postId, url: padded });
    expect(r).toMatchObject({ success: true });
  });
});

describe('attachPostVideo — trim divergence guard (Lessons §10)', () => {
  it('passes the trimmed URL (NOT the raw input) into the INSERT', async () => {
    await attachPostVideo({ postId, url: `   ${VALID_URL}   ` });
    // The INSERT must receive the canonicalized URL. If the action
    // sent the raw input, the DB CHECK on `source_url` (anchored
    // `^https://`) would reject because of the leading spaces — a
    // validator-OK / DB-CHECK-reject divergence (Lessons §10).
    expect(mockInsertValues).toHaveBeenCalledWith({
      postId,
      provider: 'youtube',
      providerVideoId: VALID_ID,
      sourceUrl: VALID_URL,
    });
  });

  it('rejects ZWSP-padded raw input via the parser, NOT via the DB CHECK', async () => {
    // `String.prototype.trim()` does NOT strip U+200B (Lessons §10
    // explicit pin). So a ZWSP-padded raw URL survives action-level
    // trim and reaches the parser, which surfaces a parser reason
    // (host_not_allowed because the host name now contains an extra
    // codepoint, or invalid_url because WHATWG fails to parse). The
    // test pins that the failure surface is one of the parser
    // reasons, NOT a DB error key (alreadyAttached / invalidVideoStructure
    // / tooLong) — that would be evidence of a divergence where the
    // validator says OK but the DB CHECK rejects.
    const ZWSP = '​';
    const url = `${ZWSP}${VALID_URL}${ZWSP}`;
    const r = await attachPostVideo({ postId, url });

    // Must NOT be success (a divergence regression would let this OK).
    expect(r).not.toMatchObject({ success: true });

    // Must be a parser reason mapping (validator-side rejection),
    // not a DB-side rejection. The DB-side keys would surface only
    // if the action skipped or failed the parser.
    if ('error' in r) {
      const PARSER_KEYS = new Set([
        'postVideoAttachment.error.invalidUrl',
        'postVideoAttachment.error.hostNotAllowed',
        'postVideoAttachment.error.invalidId',
        'postVideoAttachment.error.pathnameNotSupported',
      ]);
      const DB_KEYS = new Set([
        'postVideoAttachment.error.invalidVideoStructure',
        'postVideoAttachment.error.alreadyAttached',
        'postVideoAttachment.error.tooLong',
      ]);
      expect(DB_KEYS.has(r.error)).toBe(false);
      expect(PARSER_KEYS.has(r.error)).toBe(true);
    }

    // Belt-and-braces: the INSERT must NOT have been called, because
    // the parser must reject before reaching the INSERT. If this fires,
    // the action is sending invalid data through to the DB.
    expect(mockInsertValues).not.toHaveBeenCalled();
  });
});

describe('attachPostVideo — SQLSTATE branch coverage (non-mapped codes)', () => {
  it('rethrows on 23503 (FK violation) — not silently mapped', async () => {
    const err = Object.assign(new Error('foreign key violation'), { code: '23503' });
    mockInsertReturning.mockRejectedValueOnce(err);

    await expect(attachPostVideo({ postId, url: VALID_URL })).rejects.toThrow(
      'foreign key violation'
    );
  });

  it('rethrows on 25000 (invalid transaction state) — not silently mapped', async () => {
    const err = Object.assign(new Error('invalid txn state'), { code: '25000' });
    mockInsertReturning.mockRejectedValueOnce(err);

    await expect(attachPostVideo({ postId, url: VALID_URL })).rejects.toThrow('invalid txn state');
  });

  it('rethrows on a wholly unknown SQLSTATE (08000 connection exception)', async () => {
    const err = Object.assign(new Error('conn exception'), { code: '08000' });
    mockInsertReturning.mockRejectedValueOnce(err);

    await expect(attachPostVideo({ postId, url: VALID_URL })).rejects.toThrow('conn exception');
  });

  it('rethrows when the thrown value is not an Error (extractPgErrorCode returns undefined)', async () => {
    const notAnError = { code: '23505', message: 'looks like a PG error but is plain object' };
    mockInsertReturning.mockRejectedValueOnce(notAnError);

    await expect(attachPostVideo({ postId, url: VALID_URL })).rejects.toEqual(notAnError);
  });

  it('extracts SQLSTATE 23514 from err.cause when wrapped (Lessons §11)', async () => {
    // The Coder suite already pins this for 23505. Adding 23514 here
    // because that branch is also business-critical (CHECK violation
    // mapping is the divergence-detection signal).
    const cause = Object.assign(new Error('underlying check'), { code: '23514' });
    const wrapper = new Error('wrapper');
    (wrapper as Error & { cause?: unknown }).cause = cause;
    mockInsertReturning.mockRejectedValueOnce(wrapper);

    const r = await attachPostVideo({ postId, url: VALID_URL });
    expect(r).toEqual({ error: 'postVideoAttachment.error.invalidVideoStructure' });
  });

  it('extracts SQLSTATE 22001 from err.cause when wrapped', async () => {
    const cause = Object.assign(new Error('truncation'), { code: '22001' });
    const wrapper = new Error('wrapper');
    (wrapper as Error & { cause?: unknown }).cause = cause;
    mockInsertReturning.mockRejectedValueOnce(wrapper);

    const r = await attachPostVideo({ postId, url: VALID_URL });
    expect(r).toEqual({ error: 'postVideoAttachment.error.tooLong' });
  });
});

describe('attachPostVideo — non-string raw input', () => {
  it('treats a non-string `url` as empty (urlRequired)', async () => {
    // The action's first line is `typeof rawUrlInput === 'string'
    // ? rawUrlInput.trim() : ''` — a defensive belt against a caller
    // that violates the type. Pin the surface so the defense cannot
    // be removed without test failure.
    const r = await attachPostVideo({
      postId,
      // intentional contract violation for defense-in-depth pin
      url: undefined as unknown as string,
    });
    expect(r).toEqual({ error: 'postVideoAttachment.error.urlRequired' });
  });

  it('treats `null` `url` as empty (urlRequired)', async () => {
    const r = await attachPostVideo({
      postId,
      url: null as unknown as string,
    });
    expect(r).toEqual({ error: 'postVideoAttachment.error.urlRequired' });
  });
});
