import type {
  GameForMatch,
  LineMatchResult,
  LineMatchStatus,
  MoveTreeNode,
  PgnTree,
} from '@blindfold-chess/features/chess-core';
import { matchGameToLine, parsePgnTree, toPositionKey } from '@blindfold-chess/features/chess-core';

/**
 * match: compare a finished game against ONE repertoire's stored lines
 * and report how far the game stayed "on kata".
 *
 * A repertoire is persisted as flat `repertoire_lines` rows (one PGN per
 * root-to-leaf path). Matching each line separately would mis-report the
 * expected moves at a branch point — the game would look like a deviation from
 * line A even though it simply switched to line B, and the "expected" list
 * would name only one branch. So the lines are re-merged into one tree per
 * root position first, and the game is matched against the merged tree(s).
 *
 * Provisional product rules (prototype — revisit deliberately):
 * - Lines whose PGN fails to parse are silently skipped.
 * - When a repertoire has lines from several root positions (mixed `[FEN]`
 *   headers), the best applicable result wins: deeper `followedPlies` first,
 *   then `in-book` > `gap` > `deviation` (a gap is the opponent's doing, so it
 *   outranks the player's own deviation).
 * - Returns null when no root position was ever reached in the game
 *   ("not-applicable" — this repertoire has nothing to say about the game).
 */

const STATUS_RANK: Record<LineMatchStatus, number> = {
  'in-book': 3,
  gap: 2,
  deviation: 1,
  'not-applicable': 0,
};

/**
 * Only merges same-parent siblings by position key, not arbitrary nodes
 * across the tree — so a transposition that diverges and later reconverges
 * (two lines reaching the same position via different move orders) stays as
 * two separate subtrees. A game that transposes in from one line's move
 * order and plays the other's continuation reports as a `deviation` here,
 * with `expected` naming only the branch it walked in from. Deliberately not
 * fixed: absorbing that needs a position-key-based merge across the whole
 * tree (a graph, with cycle handling — UGC input can reach the same position
 * via a null-effect move pair), which is a bigger, separately-decided change
 * (checkmate-works/blindfold-chess#100).
 */
function mergeChildren(target: MoveTreeNode[], source: MoveTreeNode[]): void {
  for (const node of source) {
    const existing = target.find((t) => toPositionKey(t.fen) === toPositionKey(node.fen));
    if (existing) {
      mergeChildren(existing.children, node.children);
    } else {
      target.push(node);
    }
  }
}

/**
 * Merge line trees that share a root position into one tree per root, keyed by
 * position (first four FEN fields) so clock-only differences don't split
 * roots. Input trees are consumed — their nodes are grafted into the output.
 */
export function mergeLineTrees(trees: PgnTree[]): PgnTree[] {
  const byRoot = new Map<string, PgnTree>();
  for (const tree of trees) {
    const key = toPositionKey(tree.startingFen);
    const existing = byRoot.get(key);
    if (existing) {
      mergeChildren(existing.children, tree.children);
    } else {
      byRoot.set(key, { startingFen: tree.startingFen, children: [...tree.children] });
    }
  }
  return [...byRoot.values()];
}

function isBetter(a: LineMatchResult, b: LineMatchResult): boolean {
  if (a.followedPlies !== b.followedPlies) return a.followedPlies > b.followedPlies;
  return STATUS_RANK[a.status] > STATUS_RANK[b.status];
}

/**
 * Whether a matched kata is worth surfacing in the check UI: the game must
 * have followed the kata for at least one ply past where it entered the tree.
 * A result whose divergence lands immediately at entry (`followedPlies === 0`)
 * means the very first move the kata prepares — the player's own opening
 * choice, or (for a kata prepared against a specific reply) the opponent's
 * first move — already isn't what happened. That reads as "this kata doesn't
 * apply to this game" rather than a deviation worth reporting, so such
 * results are filtered out before reaching the picker.
 */
export function isRepertoireApplicableFromFirstMove(result: LineMatchResult): boolean {
  if (result.status === 'not-applicable') return false;
  return result.status === 'in-book' || result.followedPlies > 0;
}

/**
 * Match a game against one repertoire's line PGNs. Returns the best applicable
 * {@link LineMatchResult}, or null when the repertoire does not apply to this
 * game at all.
 */
export function matchGameToRepertoire(
  game: GameForMatch,
  linePgns: string[]
): LineMatchResult | null {
  const trees: PgnTree[] = [];
  for (const pgn of linePgns) {
    try {
      trees.push(parsePgnTree(pgn));
    } catch {
      // A corrupt line must not take the whole kata check down with it.
    }
  }

  let best: LineMatchResult | null = null;
  for (const tree of mergeLineTrees(trees)) {
    const result = matchGameToLine(game, tree);
    if (result.status === 'not-applicable') continue;
    if (!best || isBetter(result, best)) best = result;
  }
  return best;
}
