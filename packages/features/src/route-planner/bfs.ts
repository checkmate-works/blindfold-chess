import { getPossibleMoves } from "./moves";
import type { RoutePlannerPieceType } from "./types";

/**
 * Find the shortest path for a piece from `start` to `end` using BFS.
 *
 * @returns The path as an array of squares including both `start` and `end`,
 *          or `null` if no path exists (e.g., bishop between different-color squares).
 *          The path length includes the start square, so a 1-move route has length 2.
 */
export function findShortestPath(
  piece: RoutePlannerPieceType,
  start: string,
  end: string,
): string[] | null {
  if (start === end) return [start];

  const parent = new Map<string, string>();
  const queue: string[] = [start];
  let head = 0;
  parent.set(start, "");

  while (head < queue.length) {
    const current = queue[head++];

    if (current === end) {
      // Reconstruct path from parent map
      const path: string[] = [];
      let node: string | undefined = end;
      while (node !== undefined && node !== "") {
        path.push(node);
        node = parent.get(node);
      }
      path.reverse();
      return path;
    }

    const moves = getPossibleMoves(piece, current);
    for (const move of moves) {
      if (!parent.has(move)) {
        parent.set(move, current);
        queue.push(move);
      }
    }
  }

  return null;
}
