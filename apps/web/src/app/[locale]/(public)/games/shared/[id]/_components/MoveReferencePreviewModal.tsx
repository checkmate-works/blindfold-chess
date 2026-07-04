'use client';

import { useEffect, useMemo } from 'react';

import { ChessBoard } from '@/app/_components';
import { getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import { MoveNavigationControls } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationControls';
import { useMoveNavigation } from '@/app/[locale]/(public)/games/play/_hooks';
import { computeMoveNumber } from '@/app/[locale]/(public)/practice/(free-play)/recall/_lib/compute-move-number';
import { Modal } from '@/app/[locale]/_components/Modal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** The raw matched text (e.g. "8. Bd3 Bb7 9. O-O") — shown as the modal title verbatim. */
  raw: string;
  /** Verified-legal candidate moves for the referenced sequence. */
  sans: string[];
  /** Position immediately before the first move in `sans`. */
  baseFen: string;
  /** 0-based ply `sans[0]` would occupy in the game's own move list. */
  basePly: number;
  startsAsBlack: boolean;
  startMoveNumber: number;
  playerColor: Side;
};

/**
 * Previews a comment's PGN-style move reference: the position right before
 * the referenced move(s), steppable forward through each suggested move.
 * Navigation is scoped to just this branch (`sans`), not the whole game —
 * `useMoveNavigation`'s position range is [-2 .. sans.length - 1] here.
 */
export function MoveReferencePreviewModal({
  isOpen,
  onClose,
  raw,
  sans,
  baseFen,
  basePly,
  startsAsBlack,
  startMoveNumber,
  playerColor,
}: Props) {
  const nav = useMoveNavigation({ moves: sans as AlgebraicNotation[], startingFen: baseFen });

  useEffect(() => {
    if (isOpen) nav.navigateToPosition(sans.length - 1);
    // Only re-run when the modal is (re)opened for a (possibly new) reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, raw]);

  const stepLabels = useMemo(
    () =>
      sans.map((san, i) => {
        const { moveNumber, isWhiteMove } = computeMoveNumber(
          basePly + i,
          startsAsBlack,
          startMoveNumber
        );
        return isWhiteMove ? `${moveNumber}. ${san}` : `${moveNumber}... ${san}`;
      }),
    [sans, basePly, startsAsBlack, startMoveNumber]
  );

  const effectivePosition =
    nav.currentPosition === -1
      ? sans.length - 1
      : nav.currentPosition === -2
        ? -1
        : nav.currentPosition;

  const fen = nav.displayFen ?? nav.latestFen;
  const lastMove =
    nav.currentPosition === -2
      ? null
      : getLastMoveDetails(
          nav.currentPosition === -1 ? sans : sans.slice(0, nav.currentPosition + 1),
          baseFen
        );

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={raw} maxWidth="max-w-lg">
      <div className="space-y-3">
        <ChessBoard fen={fen} flipped={playerColor === 'black'} lastMove={lastMove} rounded />

        <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm">
          {stepLabels.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => nav.navigateToPosition(i)}
              className={
                i === effectivePosition
                  ? 'font-semibold text-primary'
                  : 'text-muted-foreground hover:text-foreground transition-colors'
              }
            >
              {label}
            </button>
          ))}
        </div>

        <MoveNavigationControls
          onNavigateToStart={nav.navigateToStart}
          onNavigatePrevious={nav.navigatePrevious}
          onNavigateNext={nav.navigateNext}
          onNavigateToEnd={nav.navigateToEnd}
          isPreviousDisabled={nav.currentPosition === -2}
          isNextDisabled={
            nav.currentPosition === -1 ||
            (sans.length > 0 && nav.currentPosition === sans.length - 1)
          }
        />
      </div>
    </Modal>
  );
}
