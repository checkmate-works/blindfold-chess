import { describe, expect, it, vi } from 'vitest';

import type { GameRecord } from '@/lib/db/schema';
import type { PositionEvaluation } from '@/lib/games/analysis/types';

import { generateReview } from './generate-review';
import type { LlmClient } from './llm-client';
import type { AiReviewStore } from './queries';
import type { AiReview, AiReviewContent } from './types';

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
    summary: 'A short but instructive game.',
    momentComments: plies.map((ply) => ({
      ply,
      explanation: 'This weakened the king fatally.',
      lesson: 'Never open the e1-h4 diagonal for nothing.',
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

function llmReturning(...responses: Array<string | Error>): LlmClient & { calls: number } {
  let call = 0;
  const client = {
    model: 'test-model',
    calls: 0,
    async complete() {
      client.calls++;
      const r = responses[Math.min(call++, responses.length - 1)];
      if (r instanceof Error) throw r;
      return r;
    },
  };
  return client;
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
  });

  it('fails with llm_error after both attempts produce invalid output', async () => {
    const store = memoryStore();
    // Second response is schema-invalid: comments on a ply we never provided.
    const llm = llmReturning('garbage', JSON.stringify(validContent([99])));

    const result = await generateReview(baseParams(store, llm));

    expect(result).toEqual({ ok: false, error: 'llm_error' });
    expect(llm.calls).toBe(2);
    expect(store.save).not.toHaveBeenCalled();
  });

  it('fails with llm_error when the provider throws twice', async () => {
    const store = memoryStore();
    const llm = llmReturning(new Error('boom'), new Error('boom'));

    const result = await generateReview(baseParams(store, llm));

    expect(result).toEqual({ ok: false, error: 'llm_error' });
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
});
