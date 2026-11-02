import { err, ok } from '@blindfold-chess/features/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameRecord } from '@/lib/db/schema';
import type { PositionEvaluation } from '@/lib/games/analysis/types';

import { generateReview } from './generate-review';
import type { LlmClient, LlmCompletionRequest, LlmError } from './llm-client';
import type { AiReviewStore } from './queries';
import type { AiReview, AiReviewContent } from './types';

const mockCaptureError = vi.fn();
vi.mock('@/lib/sentry/capture-error', () => ({
  captureError: (...a: unknown[]) => mockCaptureError(...a),
}));

// 1. f3 e5 2. g4 Qh4# — short decisive game with a huge white blunder.
const MOVES = ['f3', 'e5', 'g4', 'Qh4#'];

function fakeGame(overrides: Partial<GameRecord> = {}): GameRecord {
  return {
    id: '01890000-0000-7000-8000-000000000001',
    authorId: null,
    title: 'test',
    description: null,
    moves: MOVES,
    startingFen: null,
    setupPlies: null,
    playerColor: 'black',
    engineConfig: { kind: 'stockfish', skillLevel: 5 },
    operationLogs: null,
    operationTotals: null,
    undoneLogs: null,
    playSettings: null,
    playSettingsLog: null,
    result: 'win',
    engineKind: 'stockfish',
    engineElo: 1200,
    moveCount: MOVES.length,
    cleanRate: null,
    status: 'public',
    deletedAt: null,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    ...overrides,
  } as GameRecord;
}

const EVALS: PositionEvaluation[] = [
  { score: 20 },
  { score: -40 }, // f3: white loses 60
  { score: -30 },
  { score: -900 }, // g4: white blunders 870
  { score: -10000 }, // Qh4#
];

function validContent(plies: number[]): AiReviewContent {
  return {
    summary: ['A short but instructive game.'],
    momentComments: plies.map((ply) => ({
      ply,
      explanation: 'This weakened the king fatally.',
      lesson: 'Never open the e1-h4 diagonal for nothing.',
      principle: 'king_safety_first' as const,
    })),
    strengths: ['You spotted the mating pattern instantly.'],
    weaknesses: ['Early pawn moves in front of the king.'],
    advice: ['Check your king safety before pushing flank pawns.'],
  };
}

function memoryStore(initial: AiReview | null = null): AiReviewStore & { saved: unknown[] } {
  const saved: unknown[] = [];
  let existing = initial;
  return {
    saved,
    find: vi.fn(async () => existing),
    save: vi.fn(async (row) => {
      saved.push(row);
      existing = {
        locale: row.locale,
        content: row.content,
        moments: row.moments,
        summaryStats: row.summaryStats,
        model: row.model,
        createdAt: '2026-08-14T00:00:00.000Z',
      };
      return existing;
    }),
  };
}

/**
 * A fake provider. A `string` response is a successful completion; an
 * {@link LlmError} is a failed one, so a case can choose a retryable failure
 * (server / rate_limited) or a final one (auth / client).
 */
function llmReturning(
  ...responses: Array<string | LlmError>
): LlmClient & { calls: number; requests: LlmCompletionRequest[] } {
  let call = 0;
  const client = {
    model: 'test-model',
    calls: 0,
    requests: [] as LlmCompletionRequest[],
    async complete(request: LlmCompletionRequest) {
      client.calls++;
      client.requests.push(request);
      const r = responses[Math.min(call++, responses.length - 1)];
      return typeof r === 'string' ? ok(r) : err(r);
    },
  };
  return client;
}

/** Asserts the single give-up report a failed generation sends to Sentry. */
function expectGaveUpOnce(reason: string, attempts: number) {
  expect(mockCaptureError).toHaveBeenCalledTimes(1);
  expect(mockCaptureError).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'AI review generation gave up' }),
    '[ai-review] LLM generation failed',
    { tags: { reason, gameId: fakeGame().id }, extra: { attempts } }
  );
}

const baseParams = (store: AiReviewStore, llm: LlmClient) => ({
  game: fakeGame(),
  locale: 'en',
  userId: 'user-1',
  evaluations: EVALS,
  openingName: null,
  llm,
  store,
});

describe('generateReview', () => {
  beforeEach(() => {
    mockCaptureError.mockReset();
    // The paths under test log on purpose; keep the run output readable.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('derives moments server-side and persists the validated review', async () => {
    const store = memoryStore();
    // The blunder ply is 2 (g4, white = opponent of the black player).
    const llm = llmReturning(JSON.stringify(validContent([2])));

    const result = await generateReview(baseParams(store, llm));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.review.model).toBe('test-model');
    expect(result.review.moments.map((m) => m.ply)).toContain(2);
    const blunder = result.review.moments.find((m) => m.ply === 2);
    expect(blunder).toMatchObject({ san: 'g4', color: 'white', judgment: 'blunder' });
    expect(store.save).toHaveBeenCalledTimes(1);
    expect(mockCaptureError).not.toHaveBeenCalled();
  });

  it('prompts without any blindfold context for a game whose conditions are unknown', async () => {
    const store = memoryStore();
    const llm = llmReturning(JSON.stringify(validContent([2])));

    await generateReview(baseParams(store, llm));

    expect(llm.requests[0]?.system).not.toMatch(/blindfold/i);
    expect(llm.requests[0]?.user).not.toMatch(/blindfold/i);
  });

  it('prompts with the blindfold conditions and the aid usage at the moments', async () => {
    const store = memoryStore();
    const llm = llmReturning(JSON.stringify(validContent([2])));

    await generateReview({
      ...baseParams(store, llm),
      game: fakeGame({
        playSettings: {
          boardVisibility: 'never',
          showOwnPieces: true,
          showOpponentPieces: true,
          pieceShapeMode: 'normal',
          pieceColors: 'normal',
          pawnHideMode: 'none',
        },
        // Black's moves are plies 1 and 3; the second one had two rejected
        // attempts, one of them not move-shaped.
        operationLogs: [
          { inputMethod: 'text', peekCount: 0, undoCount: 0, movePeekCount: 0 },
          {
            inputMethod: 'text',
            peekCount: 0,
            undoCount: 0,
            movePeekCount: 0,
            invalidCount: 2,
            invalidAttempts: ['Qh4', 'write a poem'],
          },
        ],
        operationTotals: { peeks: 1, movePeeks: 0, undos: 0, invalidMoves: 2 },
      }),
    });

    const { system, user } = llm.requests[0]!;
    expect(system).toContain('The board was never shown');
    expect(user).toContain('board hidden for the whole game');
    expect(user).toContain('peeks 1, hints 0, takebacks 0, rejected moves 2.');
    expect(user).not.toContain('write a poem');
    // Ply 3 is not a critical moment in this game (black's Qh4# is best), so
    // no per-moment line is emitted for it.
    expect(user).not.toContain('"ply":3');
  });

  it('returns the cached review without calling the LLM', async () => {
    const cached: AiReview = {
      locale: 'ja',
      content: validContent([]),
      moments: [],
      summaryStats: {
        totalPlies: 4,
        playerColor: 'black',
        avgCpLossPlayer: 0,
        judgmentCountsPlayer: { best: 2, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
      },
      model: 'earlier-model',
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    const store = memoryStore(cached);
    const llm = llmReturning(JSON.stringify(validContent([])));

    const result = await generateReview(baseParams(store, llm));

    expect(result).toEqual({ ok: true, review: cached });
    expect(llm.calls).toBe(0);
  });

  it('retries once on invalid LLM output, then succeeds', async () => {
    const store = memoryStore();
    const llm = llmReturning('not json at all', JSON.stringify(validContent([2])));

    const result = await generateReview(baseParams(store, llm));

    expect(result.ok).toBe(true);
    expect(llm.calls).toBe(2);
    expect(mockCaptureError).not.toHaveBeenCalled();
  });

  it('fails with llm_error after both attempts produce invalid output', async () => {
    const store = memoryStore();
    // Second response is schema-invalid: comments on a ply we never provided.
    const llm = llmReturning('garbage', JSON.stringify(validContent([99])));

    const result = await generateReview(baseParams(store, llm));

    expect(result).toEqual({ ok: false, error: 'llm_error' });
    expect(llm.calls).toBe(2);
    expect(store.save).not.toHaveBeenCalled();
    // Tagged with the failure that ended it, not the first one.
    expectGaveUpOnce('invalid_output', 2);
  });

  it('reports a give-up after two non-JSON answers as non_json_output', async () => {
    const store = memoryStore();
    const llm = llmReturning('garbage', 'still garbage');

    const result = await generateReview(baseParams(store, llm));

    expect(result).toEqual({ ok: false, error: 'llm_error' });
    expectGaveUpOnce('non_json_output', 2);
  });

  it('fails with llm_error when the provider fails on both attempts', async () => {
    const store = memoryStore();
    const llm = llmReturning({ kind: 'server', status: 502 }, { kind: 'server', status: 502 });

    const result = await generateReview(baseParams(store, llm));

    expect(result).toEqual({ ok: false, error: 'llm_error' });
    expect(llm.calls).toBe(2);
    // Two failed attempts, one event: an outage stays one event per review.
    expectGaveUpOnce('server', 2);
  });

  it('retries a retryable provider failure and succeeds on the second attempt', async () => {
    const store = memoryStore();
    const llm = llmReturning(
      { kind: 'rate_limited', status: 429 },
      JSON.stringify(validContent([2]))
    );

    const result = await generateReview(baseParams(store, llm));

    expect(result.ok).toBe(true);
    expect(llm.calls).toBe(2);
    expect(mockCaptureError).not.toHaveBeenCalled();
  });

  it.each([
    ['auth', { kind: 'auth', status: 401 } as const],
    ['client', { kind: 'client', status: 400 } as const],
    ['empty_content', { kind: 'empty_content' } as const],
  ])('does not spend a second attempt on a final %s failure', async (_label, error) => {
    const store = memoryStore();
    const llm = llmReturning(error, JSON.stringify(validContent([2])));

    const result = await generateReview(baseParams(store, llm));

    expect(result).toEqual({ ok: false, error: 'llm_error' });
    expect(llm.calls).toBe(1);
    // Reported even though it was never retried: a bad key fails the same
    // way every time, and Sentry is the only place it would surface.
    expectGaveUpOnce(error.kind, 1);
  });

  it('rejects an evaluation payload of the wrong length as invalid_input', async () => {
    const store = memoryStore();
    const llm = llmReturning(JSON.stringify(validContent([2])));

    const result = await generateReview({
      ...baseParams(store, llm),
      evaluations: EVALS.slice(0, 2),
    });

    expect(result).toEqual({ ok: false, error: 'invalid_input' });
    expect(llm.calls).toBe(0);
  });

  it('keeps a wrong-length evaluation payload out of Sentry, since the client chose it', async () => {
    const store = memoryStore();
    const llm = llmReturning(JSON.stringify(validContent([2])));

    await generateReview({ ...baseParams(store, llm), evaluations: EVALS.slice(0, 2) });

    expect(mockCaptureError).not.toHaveBeenCalled();
  });

  it('reports a stored game that no longer replays to Sentry and answers invalid_input', async () => {
    const store = memoryStore();
    const llm = llmReturning(JSON.stringify(validContent([2])));
    const game = fakeGame({ moves: ['f3', 'e5', 'g4', 'not-a-move'] });

    const result = await generateReview({ ...baseParams(store, llm), game });

    expect(result).toEqual({ ok: false, error: 'invalid_input' });
    expect(llm.calls).toBe(0);
    expect(mockCaptureError).toHaveBeenCalledTimes(1);
    expect(mockCaptureError).toHaveBeenCalledWith(
      { kind: 'replay-failed' },
      '[ai-review] could not replay the stored game',
      { tags: { gameId: game.id } }
    );
  });
});
