import { enumerateLines, getStartingFen, parsePgnTree } from '@blindfold-chess/features/chess-core';
import { describe, expect, it } from 'vitest';

import type { BuilderNode, BuilderPath } from './board-builder-tree';
import {
  builderTreeFromPgn,
  builderTreeToPgn,
  deleteAtPath,
  fenAtPath,
  flattenBuilderTree,
  nodeAtPath,
  playMoveAtPath,
} from './board-builder-tree';

const ROOT = getStartingFen();

/** Play a SAN sequence from the current cursor, asserting every move lands. */
function play(
  children: BuilderNode[],
  path: BuilderPath,
  sans: string[]
): { children: BuilderNode[]; path: BuilderPath } {
  let state = { children, path };
  for (const san of sans) {
    const next = playMoveAtPath(state.children, state.path, ROOT, san);
    if (!next) throw new Error(`illegal move in test: ${san}`);
    state = next;
  }
  return state;
}

describe('playMoveAtPath', () => {
  it('appends moves along a line and advances the cursor', () => {
    const state = play([], [], ['e4', 'e5', 'Nf3']);
    expect(state.path).toEqual([0, 0, 0]);
    expect(nodeAtPath(state.children, state.path)?.san).toBe('Nf3');
    expect(fenAtPath(state.children, state.path, ROOT)).toContain(' b ');
  });

  it('rejects an illegal move', () => {
    expect(playMoveAtPath([], [], ROOT, 'e5')).toBeNull();
  });

  it('steps into an existing child instead of duplicating it', () => {
    const line = play([], [], ['e4', 'e5']);
    const replayed = play(line.children, [], ['e4']);
    expect(replayed.children).toBe(line.children);
    expect(replayed.path).toEqual([0]);
  });

  it('normalizes SAN when matching an existing child', () => {
    // "Nf3" typed without a suffix should match a stored "Nf3" even when the
    // engine adds check/mate glyphs — both sides store engine-normalized SAN.
    const line = play([], [], ['e4', 'e5', 'Nf3']);
    const replayed = play(line.children, [0, 0], ['Nf3']);
    expect(replayed.children).toBe(line.children);
    expect(replayed.path).toEqual([0, 0, 0]);
  });

  it('creates a variation when a different move is played mid-line', () => {
    const main = play([], [], ['e4', 'e5', 'Nf3']);
    // Go back to the position after 1. e4 and play a different black reply.
    const branched = play(main.children, [0], ['c5']);
    expect(branched.path).toEqual([0, 1]);
    const e4 = branched.children[0];
    expect(e4.children.map((c) => c.san)).toEqual(['e5', 'c5']);
    // The original continuation under e5 is untouched.
    expect(nodeAtPath(branched.children, [0, 0, 0])?.san).toBe('Nf3');
  });

  it('records from/to squares for the board highlight', () => {
    const state = play([], [], ['e4']);
    const e4 = nodeAtPath(state.children, state.path)!;
    expect(e4.from).toBe('e2');
    expect(e4.to).toBe('e4');
  });
});

describe('deleteAtPath', () => {
  it('removes the addressed subtree and moves the cursor to the parent', () => {
    const state = play([], [], ['e4', 'e5', 'Nf3', 'Nc6']);
    const cut = deleteAtPath(state.children, [0, 0, 0]);
    expect(cut.path).toEqual([0, 0]);
    expect(nodeAtPath(cut.children, [0, 0])?.children).toEqual([]);
  });

  it('removes a variation without touching its siblings', () => {
    const main = play([], [], ['e4', 'e5']);
    const branched = play(main.children, [0], ['c5']);
    const cut = deleteAtPath(branched.children, [0, 1]);
    expect(cut.children[0].children.map((c) => c.san)).toEqual(['e5']);
  });

  it('is a no-op at the root', () => {
    const state = play([], [], ['e4']);
    const cut = deleteAtPath(state.children, []);
    expect(cut.children).toBe(state.children);
    expect(cut.path).toEqual([]);
  });
});

describe('builderTreeToPgn', () => {
  it('returns an empty string for an empty tree', () => {
    expect(builderTreeToPgn([], ROOT)).toBe('');
  });

  it('serializes a built tree to a PGN the import pipeline decomposes back', () => {
    // Build: 1. e4 e5 (1... c5 2. Nf3) 2. Nf3 — main line + one variation.
    const main = play([], [], ['e4', 'e5', 'Nf3']);
    const branched = play(main.children, [0], ['c5', 'Nf3']);

    const pgn = builderTreeToPgn(branched.children, ROOT);
    expect(pgn).toBe('1. e4 e5 (1... c5 2. Nf3) 2. Nf3');

    const lines = enumerateLines(parsePgnTree(pgn));
    expect(lines).toHaveLength(2);
    expect(lines).toContainEqual(['e4', 'e5', 'Nf3']);
    expect(lines).toContainEqual(['e4', 'c5', 'Nf3']);
  });
});

describe('builderTreeFromPgn', () => {
  it('imports a pasted PGN with variations, re-deriving from/to squares', () => {
    const children = builderTreeFromPgn('1. e4 e5 (1... c5 2. Nf3) 2. Nf3')!;
    expect(children).not.toBeNull();
    expect(children[0].san).toBe('e4');
    expect(children[0].from).toBe('e2');
    expect(children[0].children.map((c) => c.san)).toEqual(['e5', 'c5']);
    // Round trip back to the same PGN.
    expect(builderTreeToPgn(children, ROOT)).toBe('1. e4 e5 (1... c5 2. Nf3) 2. Nf3');
  });

  it('returns null for unparseable text', () => {
    expect(builderTreeFromPgn('not a pgn')).toBeNull();
  });

  it('returns null for a non-standard starting position', () => {
    const fen = '4k3/P7/8/8/8/8/8/4K3 w - - 0 1';
    expect(builderTreeFromPgn(`[SetUp "1"]\n[FEN "${fen}"]\n\n1. a8=Q+`)).toBeNull();
  });
});

describe('flattenBuilderTree', () => {
  it('emits move tokens in PGN reading order with variation markers', () => {
    const main = play([], [], ['e4', 'e5', 'Nf3']);
    const branched = play(main.children, [0], ['c5']);

    const tokens = flattenBuilderTree(branched.children, ROOT);
    expect(
      tokens.map((t) =>
        t.type === 'move'
          ? [t.number, t.san].filter(Boolean).join(' ')
          : t.type === 'open'
            ? '('
            : ')'
      )
    ).toEqual(['1. e4', 'e5', '(', '1... c5', ')', '2. Nf3']);

    // Each move token addresses its node so the list can drive the cursor.
    const c5 = tokens.find((t) => t.type === 'move' && t.san === 'c5');
    expect(c5 && c5.type === 'move' && c5.path).toEqual([0, 1]);
  });
});
