// @vitest-environment jsdom
/**
 * Executable specification of the game-operation audit invariants (issue #95).
 *
 * The behavior-level unit tests live in `use-move-operation-tracker.test.ts`;
 * THIS file pins the system-level laws that make the three-record model
 * trustworthy, so a change that silently breaks the audit story fails here
 * even if every individual behavior still "works":
 *
 * 1. EXACT COUNTS — `totals.X` equals the number of `recordX()` calls over
 *    the game's life, for ANY interleaving of commits, undos, and
 *    restarts-from-position. This is the anti-laundering law: no sequence of
 *    legitimate UI operations can make the counters read lower than what
 *    actually happened.
 * 2. DISPLAY ≤ TRUTH — the per-move log's visible counter sums never exceed
 *    the totals (the display record is a filtered view, never an inflation).
 * 3. SAN CONSERVATION — every rejected move text passed to `recordInvalid`
 *    survives somewhere: in a committed `operationLogs` entry, or in the
 *    `undoneLogs` archive (as the removed entry's `invalidAttempts` or as
 *    `pendingInvalidAttempts`). Holds exactly while under the caps
 *    (20 texts/move, 50 archive records); the caps themselves are covered in
 *    the behavior tests.
 * 4. RESTORE ONLY GROWS — the restore functions merge (totals max-merge,
 *    undoneLogs longer-list) so the mid-session stale-snapshot race (new
 *    game → initial save → URL gains its gameId → restore effect re-applies
 *    the pristine record) can never roll live records back.
 *
 * If you change the tracker's semantics, change this file CONSCIOUSLY — it
 * is the contract the persistence pipeline (`useAutoSave` → localStorage →
 * publish → `games.operation_*` columns) and the 1dan hidden-board
 * evaluator rely on. The model overview lives in
 * `@/lib/games/saved-game-types.ts`.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { sumOperationLogs } from '@/lib/games/operation-totals';
import type { OperationTotals } from '@/lib/games/saved-game-types';

import { useMoveOperationTracker } from './use-move-operation-tracker';

/** Deterministic LCG so the "random" sequences are reproducible per seed. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const INPUT_METHODS = ['text', 'text-autocomplete', 'select', 'button', 'board'] as const;

type SequenceResult = {
  tracker: ReturnType<typeof renderHook<ReturnType<typeof useMoveOperationTracker>, void>>;
  expected: OperationTotals;
  recordedSans: string[];
  trace: string[];
};

/**
 * Drive one random operation sequence through the tracker, mirroring how the
 * real session calls it (undo = handleUndoLog + recordUndo; restart =
 * truncateLogs). Ends with a flushing commit so no in-flight state is left
 * out of the conservation checks. Rates keep each run well under the archive
 * and per-move-text caps, where conservation is exact.
 */
function runSequence(seed: number, opCount: number): SequenceResult {
  const rng = makeRng(seed);
  const tracker = renderHook(() => useMoveOperationTracker());
  const expected: OperationTotals = { peeks: 0, movePeeks: 0, undos: 0, invalidMoves: 0 };
  const recordedSans: string[] = [];
  const trace: string[] = [];
  let sanId = 0;

  for (let i = 0; i < opCount; i++) {
    const roll = rng();
    act(() => {
      const { current } = tracker.result;
      if (roll < 0.15) {
        trace.push('peek');
        current.recordPeek();
        expected.peeks += 1;
      } else if (roll < 0.28) {
        trace.push('movePeek');
        current.recordMovePeek();
        expected.movePeeks += 1;
      } else if (roll < 0.48) {
        const san = `m${sanId++}`;
        trace.push(`invalid:${san}`);
        current.recordInvalid(san);
        expected.invalidMoves += 1;
        recordedSans.push(san);
      } else if (roll < 0.75) {
        const method = INPUT_METHODS[Math.floor(rng() * INPUT_METHODS.length)];
        trace.push(`commit:${method}`);
        current.commitMove(method);
      } else if (roll < 0.9) {
        trace.push('undo');
        current.handleUndoLog();
        current.recordUndo();
        expected.undos += 1;
      } else {
        const count = Math.floor(rng() * (current.logs.length + 1));
        trace.push(`truncate:${count}`);
        current.truncateLogs(count);
      }
    });
  }

  act(() => {
    tracker.result.current.commitMove('text');
  });
  trace.push('commit:text (flush)');
  return { tracker, expected, recordedSans, trace };
}

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

describe('game-operation audit invariants (issue #95)', () => {
  it.each(SEEDS)(
    'seed %i: totals equal the exact operation counts, whatever the undo/restart interleaving',
    (seed) => {
      const { tracker, expected, trace } = runSequence(seed, 25);
      expect(tracker.result.current.totals, trace.join(' → ')).toEqual(expected);
    }
  );

  it.each(SEEDS)('seed %i: the visible per-move sums never exceed the totals', (seed) => {
    const { tracker, trace } = runSequence(seed, 25);
    const visible = sumOperationLogs(tracker.result.current.logs);
    const { totals } = tracker.result.current;
    for (const key of ['peeks', 'movePeeks', 'undos', 'invalidMoves'] as const) {
      expect(visible[key], `${key} — ${trace.join(' → ')}`).toBeLessThanOrEqual(totals[key]);
    }
  });

  it.each(SEEDS)(
    'seed %i: every rejected SAN survives in operationLogs or the undoneLogs archive',
    (seed) => {
      const { tracker, recordedSans, trace } = runSequence(seed, 25);
      const { logs, undoneLogs } = tracker.result.current;
      const surviving = [
        ...logs.flatMap((entry) => entry.invalidAttempts ?? []),
        ...undoneLogs.flatMap((entry) => [
          ...(entry.log?.invalidAttempts ?? []),
          ...(entry.pendingInvalidAttempts ?? []),
        ]),
      ];
      expect([...surviving].sort(), trace.join(' → ')).toEqual([...recordedSans].sort());
    }
  );

  it('restore can only grow the record — a stale snapshot never rolls anything back', () => {
    const { result } = renderHook(() => useMoveOperationTracker());

    act(() => {
      result.current.recordPeek();
      result.current.recordInvalid('Rc8');
      result.current.commitMove('text');
      result.current.handleUndoLog();
      result.current.recordUndo();
    });
    const totalsBefore = result.current.totals;
    const undoneBefore = result.current.undoneLogs;

    // The pristine record saved at mount, re-applied by the restore effect.
    act(() => {
      result.current.restoreTotals({ peeks: 0, movePeeks: 0, undos: 0, invalidMoves: 0 });
      result.current.restoreUndoneLogs([]);
      result.current.setLogsTo([]);
    });

    expect(result.current.totals).toEqual(totalsBefore);
    expect(result.current.undoneLogs).toEqual(undoneBefore);
  });
});
