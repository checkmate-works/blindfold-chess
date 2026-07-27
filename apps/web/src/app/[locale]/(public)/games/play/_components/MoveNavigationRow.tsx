'use client';

import type { ReactNode } from 'react';

import { FlipBoardButton } from '@/app/_components';

import { MoveNavigationControls } from './MoveNavigationControls';

/**
 * Height policy for the strip. Boards place it directly under the board, where
 * `aspectRatio: 8/1` makes it exactly one rank tall — a continuation of the
 * board rather than a separate bar. On a phone that ratio resolves to ~47px,
 * shorter than the touch-sized stepper, so below `sm` the strip is sized by
 * its content instead.
 *
 * Exported for the loading skeleton, which has to reserve the same height
 * without rendering any controls. Everything else should render the row.
 */
export const MOVE_NAV_ROW_CLASS = 'min-h-14 sm:min-h-0 sm:aspect-[8/1]';

/**
 * Shared geometry for the secondary buttons that sit after the divider. They
 * match the stepper's 56px touch height on mobile so the strip reads as one
 * control, and shrink to the compact 36px square from `sm` up. `shrink-0`
 * because the stepper is `w-full` below `sm` and would otherwise squeeze them.
 */
export const MOVE_NAV_SIDE_BUTTON_CLASS =
  'w-11 h-14 shrink-0 flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-muted disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground sm:w-9 sm:h-9';

type Props = {
  // All four handlers must be passed together; omitting them renders the row
  // with its side controls only (a board that can be flipped but not stepped).
  onNavigateToStart?: () => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  onNavigateToEnd?: () => void;
  isPreviousDisabled?: boolean;
  isNextDisabled?: boolean;
  /** Board-flip control, rendered after the divider. Label is the tooltip. */
  flip?: { onClick: () => void; label: string };
  /** Any further control after the divider (e.g. delete-from-here in the
   *  repertoire builder). Style it with {@link MOVE_NAV_SIDE_BUTTON_CLASS}. */
  trailingAction?: ReactNode;
  /** Row-level extras — `bg-card`, a `border-t`, and so on. */
  className?: string;
};

/**
 * The control strip under a board: the « ‹ › » stepper, then — separated by a
 * vertical rule — whatever secondary controls that surface has (flip, delete).
 *
 * @design One row component, not a class constant
 *
 * This started as an exported class name that eight call sites pasted onto
 * their own `<div>`, each re-deciding where the flip button went: two pinned
 * it to the right edge with `absolute` plus a matching `pr-11` reservation,
 * one put it inline behind a divider, one mirrored a delete button with an
 * invisible spacer to keep the stepper centred. Same intent, four layouts,
 * and the divider — which is what tells a reader that flip is not part of the
 * stepper — existed in exactly one of them. Owning the whole row here makes
 * that arrangement a single decision, and the secondary controls inherit the
 * stepper's touch sizing for free.
 */
export function MoveNavigationRow({
  onNavigateToStart,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateToEnd,
  isPreviousDisabled = false,
  isNextDisabled = false,
  flip,
  trailingAction,
  className = '',
}: Props) {
  const showStepper =
    onNavigateToStart !== undefined &&
    onNavigatePrevious !== undefined &&
    onNavigateNext !== undefined &&
    onNavigateToEnd !== undefined;
  const sideControls = flip !== undefined || trailingAction !== undefined;

  return (
    <div className={`relative flex items-center justify-center ${MOVE_NAV_ROW_CLASS} ${className}`}>
      {showStepper && (
        <MoveNavigationControls
          onNavigateToStart={onNavigateToStart}
          onNavigatePrevious={onNavigatePrevious}
          onNavigateNext={onNavigateNext}
          onNavigateToEnd={onNavigateToEnd}
          isPreviousDisabled={isPreviousDisabled}
          isNextDisabled={isNextDisabled}
        />
      )}
      {showStepper && sideControls && (
        <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-border" />
      )}
      {flip && (
        <FlipBoardButton
          onClick={flip.onClick}
          title={flip.label}
          className={MOVE_NAV_SIDE_BUTTON_CLASS}
        />
      )}
      {trailingAction}
    </div>
  );
}
