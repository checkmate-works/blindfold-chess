'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { EMPTY_BOARD_ANNOTATIONS } from '@/lib/board-annotations/types';
import type { BoardAnnotations } from '@/lib/board-annotations/types';

import { saveShapes } from '../_actions/saveShapes';
import type { LineMove } from './line-moves';

/**
 * How long a stroke sits before it is persisted. Long enough that drawing three
 * arrows in a row costs one write, short enough that leaving the page still
 * lands them (unmount flushes whatever is pending).
 */
const SAVE_DEBOUNCE_MS = 500;

export type ShapeAutosave = {
  /** Current markup for a position — what the board renders. */
  shapesFor: (positionKey: string) => BoardAnnotations;
  /** Record a completed drawing gesture and schedule its write. */
  draw: (positionKey: string, next: BoardAnnotations) => void;
  /** The last write failed; the board still shows the drawing. */
  saveFailed: boolean;
};

/**
 * Keeps a line's board markup — seeded from the server, edited in place by the
 * owner, and written back per stroke rather than staged behind a Save button.
 * The drawing IS the edit, so there is nothing to confirm; the board is the
 * source of truth while the page lives.
 *
 * Writes are debounced per position, not globally: drawing an arrow on one move
 * and immediately stepping to the next must not cancel the first move's pending
 * write. Whatever is still pending at unmount is fired immediately — an
 * un-awaited Server Action survives the unmount, a lost stroke doesn't.
 */
export function useShapeAutosave(repertoireId: string, moves: LineMove[]): ShapeAutosave {
  const [shapesByKey, setShapesByKey] = useState<Record<string, BoardAnnotations>>(() =>
    Object.fromEntries(moves.map((m) => [m.positionKey, m.shapes]))
  );
  const [saveFailed, setSaveFailed] = useState(false);

  const pending = useRef(new Map<string, BoardAnnotations>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const flush = useCallback(
    (positionKey: string) => {
      const shapes = pending.current.get(positionKey);
      const timer = timers.current.get(positionKey);
      if (timer) clearTimeout(timer);
      timers.current.delete(positionKey);
      pending.current.delete(positionKey);
      if (!shapes) return;

      void saveShapes({ repertoireId, positionKey, shapes }).then((result) => {
        setSaveFailed(!result.ok);
      });
    },
    [repertoireId]
  );

  useEffect(() => {
    const timersAtMount = timers.current;
    const pendingAtMount = pending.current;
    return () => {
      for (const timer of timersAtMount.values()) clearTimeout(timer);
      for (const [positionKey, shapes] of pendingAtMount) {
        void saveShapes({ repertoireId, positionKey, shapes });
      }
      timersAtMount.clear();
      pendingAtMount.clear();
    };
  }, [repertoireId]);

  const draw = useCallback(
    (positionKey: string, next: BoardAnnotations) => {
      setShapesByKey((prev) => ({ ...prev, [positionKey]: next }));
      setSaveFailed(false);
      pending.current.set(positionKey, next);

      const existing = timers.current.get(positionKey);
      if (existing) clearTimeout(existing);
      timers.current.set(
        positionKey,
        setTimeout(() => flush(positionKey), SAVE_DEBOUNCE_MS)
      );
    },
    [flush]
  );

  const shapesFor = useCallback(
    (positionKey: string) => shapesByKey[positionKey] ?? EMPTY_BOARD_ANNOTATIONS,
    [shapesByKey]
  );

  return { shapesFor, draw, saveFailed };
}
