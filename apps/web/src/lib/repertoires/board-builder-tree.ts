import type { MoveTreeNode } from '@blindfold-chess/features/chess-core';
import {
  executeMove,
  generatePgnFromTree,
  getStartingFen,
  parsePgnTree,
} from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

/**
 * Pure editing model for authoring a repertoire (型) as a move tree on an
 * interactive board.
 *
 * The tree is the builder's source of truth; it serializes to the same
 * PGN-with-variations string the paste-a-PGN flow submits, so the server
 * pipeline (`validateRepertoireImport` → `enumerateLines`) is shared verbatim.
 * Node shape is a superset of chess-core's {@link MoveTreeNode} (adds the
 * from/to squares for the board's last-move highlight), so a tree of
 * {@link BuilderNode}s is directly serializable by `generatePgnFromTree`.
 *
 * A *cursor* into the tree is a path of child indices from the root
 * (`[]` = the starting position). All operations are immutable — they return
 * new nodes along the touched path and share the rest, so React state can
 * hold `{ children, path }` directly.
 */
export type BuilderNode = {
  san: AlgebraicNotation;
  /** FEN of the position AFTER this move (mirrors MoveTreeNode). */
  fen: string;
  /** Source / destination squares, for the board's last-move highlight. */
  from: string;
  to: string;
  children: BuilderNode[];
};

/** Child-index path from the root; `[]` addresses the starting position. */
export type BuilderPath = number[];

export function nodeAtPath(children: BuilderNode[], path: BuilderPath): BuilderNode | null {
  let node: BuilderNode | null = null;
  let level = children;
  for (const index of path) {
    node = level[index] ?? null;
    if (!node) return null;
    level = node.children;
  }
  return node;
}

export function fenAtPath(children: BuilderNode[], path: BuilderPath, rootFen: string): string {
  return nodeAtPath(children, path)?.fen ?? rootFen;
}

/** Immutably replace the child list of the node at `path` (root when empty). */
function withChildrenAt(
  children: BuilderNode[],
  path: BuilderPath,
  nextChildren: BuilderNode[]
): BuilderNode[] {
  if (path.length === 0) return nextChildren;
  const [head, ...rest] = path;
  const node = children[head];
  if (!node) return children;
  const updated = { ...node, children: withChildrenAt(node.children, rest, nextChildren) };
  return children.map((c, i) => (i === head ? updated : c));
}

export type PlayMoveResult = { children: BuilderNode[]; path: BuilderPath };

/**
 * Play `san` from the position the cursor addresses.
 *
 * If a child with the same (normalized) SAN already exists there, the cursor
 * just steps into it — replaying a known move never duplicates a node. A new
 * move is appended as a sibling: at a position that already has continuations
 * this is exactly how an alternative line (variation) is born.
 *
 * Returns `null` for an illegal move (the interactive board only emits legal
 * SANs, so this is defensive).
 */
export function playMoveAtPath(
  children: BuilderNode[],
  path: BuilderPath,
  rootFen: string,
  san: string
): PlayMoveResult | null {
  const fen = fenAtPath(children, path, rootFen);
  const result = executeMove(fen, san);
  if (!result) return null;

  const siblings = path.length === 0 ? children : (nodeAtPath(children, path)?.children ?? []);
  const existing = siblings.findIndex((c) => c.san === result.moveResult.san);
  if (existing >= 0) {
    return { children, path: [...path, existing] };
  }

  const node: BuilderNode = {
    san: result.moveResult.san as AlgebraicNotation,
    fen: result.fen,
    from: result.moveResult.from,
    to: result.moveResult.to,
    children: [],
  };
  return {
    children: withChildrenAt(children, path, [...siblings, node]),
    path: [...path, siblings.length],
  };
}

/**
 * Delete the node the cursor addresses (with its whole subtree) and move the
 * cursor to its parent. A no-op at the root position.
 */
export function deleteAtPath(children: BuilderNode[], path: BuilderPath): PlayMoveResult {
  if (path.length === 0) return { children, path };
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  const siblings =
    parentPath.length === 0 ? children : (nodeAtPath(children, parentPath)?.children ?? []);
  return {
    children: withChildrenAt(
      children,
      parentPath,
      siblings.filter((_, i) => i !== index)
    ),
    path: parentPath,
  };
}

/**
 * Parse an existing PGN into a builder tree, so switching the import form from
 * paste mode to board mode carries the pasted moves over. Re-derives each
 * node's from/to squares (chess-core's parsed tree doesn't carry them).
 * Returns `null` when the text doesn't parse or starts from a non-standard
 * position (the board builder only authors standard-start repertoires today).
 */
export function builderTreeFromPgn(pgn: string): BuilderNode[] | null {
  let parsed: ReturnType<typeof parsePgnTree>;
  try {
    parsed = parsePgnTree(pgn);
  } catch {
    return null;
  }
  if (parsed.startingFen !== getStartingFen()) return null;

  const convert = (nodes: MoveTreeNode[], beforeFen: string): BuilderNode[] | null => {
    const out: BuilderNode[] = [];
    for (const node of nodes) {
      const result = executeMove(beforeFen, node.san);
      if (!result) return null;
      const children = convert(node.children, node.fen);
      if (!children) return null;
      out.push({
        san: node.san,
        fen: node.fen,
        from: result.moveResult.from,
        to: result.moveResult.to,
        children,
      });
    }
    return out;
  };

  return convert(parsed.children, parsed.startingFen);
}

/** Serialize the built tree to the PGN string the import pipeline accepts. */
export function builderTreeToPgn(children: BuilderNode[], rootFen: string): string {
  if (children.length === 0) return '';
  return generatePgnFromTree({ startingFen: rootFen, children });
}

/**
 * Flat token stream for rendering the move list: moves (each carrying its
 * cursor path and a PGN-style label) interleaved with `(` / `)` markers around
 * variations — the same RAV order `generatePgnFromTree` emits, so what the
 * author sees reads exactly like the PGN being built.
 */
export type MoveListToken =
  | { type: 'move'; san: string; label: string; path: BuilderPath }
  | { type: 'open' }
  | { type: 'close' };

function moveLabel(san: string, beforeFen: string, needsNumber: boolean): string {
  const fields = beforeFen.split(' ');
  const turn = fields[1];
  const fullmove = fields[5] ?? '1';
  if (turn === 'w') return `${fullmove}. ${san}`;
  if (needsNumber) return `${fullmove}... ${san}`;
  return san;
}

export function flattenBuilderTree(children: BuilderNode[], rootFen: string): MoveListToken[] {
  const tokens: MoveListToken[] = [];

  const walkLine = (
    siblings: BuilderNode[],
    beforeFen: string,
    basePath: BuilderPath,
    opensLine: boolean
  ): void => {
    let nodes = siblings;
    let fen = beforeFen;
    let path = basePath;
    let needsNumber = opensLine;

    while (nodes.length > 0) {
      const [main, ...variations] = nodes;
      const mainPath = [...path, 0];
      tokens.push({
        type: 'move',
        san: main.san,
        label: moveLabel(main.san, fen, needsNumber),
        path: mainPath,
      });
      variations.forEach((variation, i) => {
        tokens.push({ type: 'open' });
        const variationPath = [...path, i + 1];
        tokens.push({
          type: 'move',
          san: variation.san,
          label: moveLabel(variation.san, fen, true),
          path: variationPath,
        });
        walkLine(variation.children, variation.fen, variationPath, false);
        tokens.push({ type: 'close' });
      });
      needsNumber = variations.length > 0;
      fen = main.fen;
      path = mainPath;
      nodes = main.children;
    }
  };

  walkLine(children, rootFen, [], true);
  return tokens;
}
