'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { getStartingFen, getTurnFromFen } from '@blindfold-chess/features/chess-core';

import type { BuilderNode, BuilderPath } from '@/lib/repertoires/board-builder-tree';
import {
  builderTreeFromPgn,
  builderTreeToPgn,
  deleteAtPath,
  flattenBuilderTree,
  nodeAtPath,
  playMoveAtPath,
} from '@/lib/repertoires/board-builder-tree';

export type UseRepertoireBoardBuilderOptions = {
  /**
   * PGN already in the form when board mode opens (e.g. pasted in PGN mode
   * first, or a line's stored moves). Parsed once on mount — a `[FEN]` header
   * becomes the board's root position; text that doesn't parse leaves the
   * board at the standard start without touching the form state (nothing is
   * emitted until the author acts).
   */
  initialPgn?: string;
  /**
   * Fired with the serialized PGN after every *authoring* action (playing or
   * deleting a move) — never on mere navigation, so switching modes can't
   * clobber a hand-edited PGN the builder failed to parse.
   */
  onPgnChange: (pgn: string) => void;
  /**
   * Single-line editing (the line edit form): a divergent move mid-line
   * replaces the continuation instead of opening a variation — a stored line
   * holds no branches, so anything else would be silently dropped on save.
   */
  singleLine?: boolean;
};

type BuilderState = { rootFen: string; children: BuilderNode[]; path: BuilderPath };

/**
 * State for authoring a repertoire's move tree on an interactive board: a
 * cursor into the tree (the board shows the cursor position; playing a move
 * advances it, branching where it revisits history) plus navigation along
 * the current line and subtree deletion. Pure tree logic lives in
 * `@/lib/repertoires/board-builder-tree`.
 */
export function useRepertoireBoardBuilder({
  initialPgn,
  onPgnChange,
  singleLine = false,
}: UseRepertoireBoardBuilderOptions) {
  const [state, setState] = useState<BuilderState>(() => {
    const parsed = initialPgn?.trim() ? builderTreeFromPgn(initialPgn) : null;
    return {
      rootFen: parsed?.rootFen ?? getStartingFen(),
      children: parsed?.children ?? [],
      path: [],
    };
  });
  const { rootFen, children, path } = state;

  // Kept in a ref so the action callbacks stay stable across parent renders.
  const onPgnChangeRef = useRef(onPgnChange);
  onPgnChangeRef.current = onPgnChange;

  const currentNode = nodeAtPath(children, path);
  const currentFen = currentNode?.fen ?? rootFen;
  const lastMove = currentNode ? { from: currentNode.from, to: currentNode.to } : null;
  const turn = getTurnFromFen(currentFen);

  const tokens = useMemo(() => flattenBuilderTree(children, rootFen), [children, rootFen]);

  const handleMove = useCallback(
    (san: string) => {
      const result = playMoveAtPath(children, path, rootFen, san, { replace: singleLine });
      if (!result) return;
      setState({ rootFen, children: result.children, path: result.path });
      if (result.children !== children) {
        onPgnChangeRef.current(builderTreeToPgn(result.children, rootFen));
      }
    },
    [children, path, rootFen, singleLine]
  );

  const deleteCurrent = useCallback(() => {
    if (path.length === 0) return;
    const result = deleteAtPath(children, path);
    setState({ rootFen, children: result.children, path: result.path });
    onPgnChangeRef.current(builderTreeToPgn(result.children, rootFen));
  }, [children, path, rootFen]);

  const jumpTo = useCallback((target: BuilderPath) => {
    setState((s) => ({ ...s, path: target }));
  }, []);
  const goToStart = useCallback(() => setState((s) => ({ ...s, path: [] })), []);
  const goBack = useCallback(() => setState((s) => ({ ...s, path: s.path.slice(0, -1) })), []);
  // Forward / end follow the first child (the main continuation), like the
  // game screen's navigation.
  const goForward = useCallback(() => {
    setState((s) => (nodeAtPath(s.children, [...s.path, 0]) ? { ...s, path: [...s.path, 0] } : s));
  }, []);
  const goToEnd = useCallback(() => {
    setState((s) => {
      let cursor = s.path;
      while (nodeAtPath(s.children, [...cursor, 0])) cursor = [...cursor, 0];
      return { ...s, path: cursor };
    });
  }, []);

  return {
    children,
    path,
    tokens,
    currentFen,
    lastMove,
    /** Side to move at the cursor — drives the "White/Black to play" hint. */
    turn,
    isAtStart: path.length === 0,
    hasNext: nodeAtPath(children, [...path, 0]) !== null,
    isEmpty: children.length === 0,
    handleMove,
    deleteCurrent,
    jumpTo,
    goToStart,
    goBack,
    goForward,
    goToEnd,
  };
}
