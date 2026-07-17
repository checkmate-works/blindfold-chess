import { describe, expect, it } from 'vitest';

import { parseCommentMoveReferences } from '@/app/[locale]/(public)/games/shared/[id]/_lib/comment-move-references';

import { BREAKTHROUGH_LINE } from './PawnBreakthroughLine';
import { PAWN_BREAKTHROUGH_FEN } from './pawn-breakthrough-fen';

/**
 * `parseCommentMoveReferences` silently truncates a run at its first illegal
 * move, so a typo in {@link BREAKTHROUGH_LINE} — or an edit to
 * {@link PAWN_BREAKTHROUGH_FEN} that no longer supports it — would not throw.
 * It would just render fewer plies, and the 1kyu guide would quietly stop
 * demonstrating the breakthrough it claims to. These tests pin the whole line
 * as legal from the guide's position.
 */
describe('1kyu guide — pawn breakthrough line', () => {
  const parse = () => parseCommentMoveReferences(BREAKTHROUGH_LINE, [], PAWN_BREAKTHROUGH_FEN);

  it('parses the whole line as a single move reference (no silent truncation)', () => {
    const segments = parse();
    const moveRefs = segments.filter((s) => s.type === 'moveRef');

    expect(moveRefs).toHaveLength(1);
    expect(moveRefs[0]).toMatchObject({
      sans: ['b6', 'axb6', 'c6', 'bxc6', 'a6', 'Kf7', 'a7', 'b5', 'a8=Q'],
      basePly: 0,
      baseFen: PAWN_BREAKTHROUGH_FEN,
    });
  });

  it('leaves no plain-text remainder — the entire string is the reference', () => {
    const segments = parse();

    expect(segments.filter((s) => s.type === 'text' && s.value.trim() !== '')).toEqual([]);
    expect(segments.find((s) => s.type === 'moveRef')?.raw).toBe(BREAKTHROUGH_LINE);
  });

  it('ends on a queen promotion — the point of the pattern', () => {
    const moveRef = parse().find((s) => s.type === 'moveRef');

    expect(moveRef?.sans.at(-1)).toBe('a8=Q');
  });
});
