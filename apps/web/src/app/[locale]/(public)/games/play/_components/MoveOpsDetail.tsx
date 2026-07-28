'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { MoveOperationLog } from '@/lib/games/saved-game-types';

import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';

import { buildOpsRows, hasOps } from '../_lib/move-ops-alignment';
import { OpsRowsList } from './OpsRowsList';

/**
 * One move's aid-usage block: peek / undo / hint counts and — most notably —
 * the exact SAN texts of any illegal-move attempts rejected at this move
 * (`MoveOperationLog.invalidAttempts`), so a reviewer landing on a position
 * (e.g. via a `#47` deep link) sees *which* move was tried, not just a count.
 *
 * Self-hiding: renders `null` when the log is absent or carries no non-zero
 * counter (the common case), so callers can drop it in unconditionally. Shared
 * verbatim by the published game's per-move panel ({@link ReviewMovePositionPanel})
 * and the local result screen, so a rejected board move looks identical in both.
 *
 * `title` is optional: pass it when the block stands on its own (the local
 * result screen, which has no surrounding move-title chrome); omit it when the
 * caller already renders its own heading above the block (the shared panel).
 */
export function MoveOpsDetail({
  title,
  moveOperationLog,
  onAttemptSelect,
  selectedAttemptIndex,
  isAttemptSelectable,
}: {
  title?: string;
  moveOperationLog: MoveOperationLog | null;
  /**
   * Opt-in, relayed to {@link OpsRowsList}: lets a caller with a board on
   * screen turn each rejected-move chip into a button that points at it.
   * Omitted on the local result screen and in live play, where the chips
   * are read-only.
   */
  onAttemptSelect?: (attemptIndex: number) => void;
  selectedAttemptIndex?: number | null;
  isAttemptSelectable?: (attemptIndex: number) => boolean;
}) {
  const t = useTranslations('play');
  const rows =
    moveOperationLog && hasOps(moveOperationLog)
      ? buildOpsRows(moveOperationLog, {
          peek: t('operationLog.columnPeek'),
          undo: t('operationLog.columnUndo'),
          hints: t('operationLog.columnMovePeek'),
          invalid: t('operationLog.columnInvalid'),
        })
      : [];

  if (rows.length === 0) return null;

  const opsBlock = (
    <div className="rounded-md border border-border bg-card overflow-hidden text-sm">
      <OpsRowsList
        rows={rows}
        onAttemptSelect={onAttemptSelect}
        selectedAttemptIndex={selectedAttemptIndex}
        isAttemptSelectable={isAttemptSelectable}
      />
    </div>
  );

  if (!title) return opsBlock;

  return (
    <div className="space-y-4">
      <SectionTitle>{title}</SectionTitle>
      {opsBlock}
    </div>
  );
}
