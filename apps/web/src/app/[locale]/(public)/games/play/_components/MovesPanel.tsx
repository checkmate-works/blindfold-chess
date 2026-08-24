'use client';

import { type ReactNode, useMemo, useState } from 'react';

import { useCopyToClipboard } from '@/_hooks/useCopyToClipboard';
import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';
import {
  FaCheck,
  FaChevronDown,
  FaCopy,
  FaExternalLinkAlt,
  FaInfoCircle,
  FaPlay,
  FaPlusCircle,
} from 'react-icons/fa';

import type { MoveOperationLog } from '@/lib/games/saved-game-types';

import { UI_TIMEOUTS } from '@/app/[locale]/_constants/ui-timeouts';

import { formatPgnToText, moveNavDisabledState } from '../_lib';
import type { FormattedPgn, FormattedPgnMove } from '../_lib';
import {
  getPlayerMoveIndices,
  hasOps,
  logForMovesIndex as logForMovesIndexAligned,
} from '../_lib/move-ops-alignment';
import { MoveNavigationControls } from './MoveNavigationControls';
import { OpsPopover } from './OpsPopover';

/** Everything needed to render and click-to-navigate the move list. */
type MovesPanelMoveListProps = {
  formattedPgn: FormattedPgn;
  currentPosition: number;
  movesLength: number;
  currentFen: string;
  displayFen: string | null;
  startingFen?: string;
};

/** Navigation callbacks for the start/prev/next/end controls and list clicks. */
type MovesPanelNavigationProps = {
  onNavigateToPosition: (position: number) => void;
  onNavigateToStart: () => void;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onNavigateToEnd: () => void;
};

/**
 * Action callbacks and pre-computed URLs for the button cluster below the
 * move list. `lichessAnalysisUrl` is pre-computed by the parent — this panel
 * does not own the FEN→URL concern.
 */
type MovesPanelActionsProps = {
  gameInProgress: boolean;
  lichessAnalysisUrl: string;
  onRestartFromPosition: (position: number) => void;
  onNewGameFromPosition: (position: number) => void;
};

/**
 * Optional per-move operation overlay. When provided, MovesPanel renders a
 * small info icon next to each player move that accumulated any non-zero
 * counter (peek / undo / hint / illegal). Tapping the icon opens a small
 * popover with the breakdown. Player moves with all-zero counters render
 * cleanly without any icon, so the move list stays unscanned-looking until
 * something actually deserves attention.
 */
type MovesPanelOperationsProps = {
  logs: MoveOperationLog[];
  playerSide: Side;
  /**
   * Seeded setup-prefix length ({@link Game.setupPlies}): pre-played moves
   * have no log entry, so alignment skips them. Undefined = no prefix.
   */
  setupPlies?: number;
};

type Props = {
  moveList: MovesPanelMoveListProps;
  navigation: MovesPanelNavigationProps;
  actions: MovesPanelActionsProps;
  operations?: MovesPanelOperationsProps;
  showBackground?: boolean;
  /**
   * Control rendered inside the collapsed header, left of the chevron — the
   * mid-game recall entry lives here. Sitting on the "Moves" header puts the
   * "try to recall it" action exactly where the "just show me the moves"
   * action is, and it stays reachable without expanding the list (expanding
   * IS the answer). A sibling of the toggle button (absolutely positioned),
   * not a child — nested interactive elements are invalid HTML.
   */
  headerAction?: ReactNode;
};

/**
 * Panel component for displaying and navigating through game moves.
 *
 * Features:
 * - Collapsible move list
 * - Click-to-navigate on individual moves
 * - Navigation controls (start, prev, next, end)
 * - Restart/New game from selected position
 * - Analyze on Lichess
 * - Copy PGN/FEN
 */
export function MovesPanel({
  moveList,
  navigation,
  actions,
  operations,
  showBackground = true,
  headerAction,
}: Props) {
  const { formattedPgn, currentPosition, movesLength, currentFen, displayFen, startingFen } =
    moveList;
  const {
    onNavigateToPosition,
    onNavigateToStart,
    onNavigatePrevious,
    onNavigateNext,
    onNavigateToEnd,
  } = navigation;
  const { gameInProgress, lichessAnalysisUrl, onRestartFromPosition, onNewGameFromPosition } =
    actions;

  const t = useTranslations('play');
  const [isMovesVisible, setIsMovesVisible] = useState(false);
  const pgnCopy = useCopyToClipboard(UI_TIMEOUTS.PGN_COPY_DURATION);
  const fenCopy = useCopyToClipboard(UI_TIMEOUTS.FEN_COPY_DURATION);
  // Which player move's ops popover is currently open. Identified by the
  // moves[] index, so the same key works for both white and black moves.
  const [opsOpenForMoveIndex, setOpsOpenForMoveIndex] = useState<number | null>(null);

  // Operation-log alignment (logs[i] ↔ i-th player move) — the shared rule
  // lives in _lib/move-ops-alignment, same as the OperationLogModal table.
  // Recomputed when moves or playerSide change; empty when no operations are
  // wired in.
  const playerMoveIndices = useMemo<number[]>(
    () =>
      operations
        ? getPlayerMoveIndices(
            movesLength,
            startingFen,
            operations.playerSide,
            operations.setupPlies ?? 0
          )
        : [],
    [operations, movesLength, startingFen]
  );

  const logForMovesIndex = (movesIndex: number | undefined): MoveOperationLog | null =>
    operations ? logForMovesIndexAligned(movesIndex, playerMoveIndices, operations.logs) : null;

  const opsLabels = {
    peek: t('operationLog.columnPeek'),
    undo: t('operationLog.columnUndo'),
    hints: t('operationLog.columnMovePeek'),
    invalid: t('operationLog.columnInvalid'),
  };

  const handleCopyPgn = () => {
    pgnCopy.copy(formatPgnToText(formattedPgn, startingFen));
  };

  const handleCopyFen = () => {
    // Use the same FEN that is sent to Lichess: the current position, or the
    // displayed historical position when navigating back.
    const fenToCopy = currentPosition === -1 ? currentFen : displayFen || currentFen;
    fenCopy.copy(fenToCopy);
  };

  const handleAnalyzeOnLichess = () => {
    window.open(lichessAnalysisUrl, '_blank');
  };

  return (
    <div className={showBackground ? 'bg-card rounded-lg' : 'border border-border rounded-lg'}>
      {/* Moves Toggle Header. `headerAction` overlays the empty middle of the
          header row (between the label and the chevron) as an absolutely
          positioned sibling, so the full-width toggle button keeps owning the
          expand/collapse click everywhere else. */}
      <div className="relative">
        <button
          onClick={() => setIsMovesVisible(!isMovesVisible)}
          className={`w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-border/50 focus:ring-inset rounded-t-lg ${!isMovesVisible ? 'rounded-b-lg' : ''}`}
          aria-expanded={isMovesVisible}
        >
          <div className="flex items-center justify-between">
            <span className="text-foreground">{t('moves')}</span>
            <FaChevronDown
              className={`w-5 h-5 text-muted-foreground transform transition-transform duration-200 ${
                isMovesVisible ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>
        {/* right-12 keeps a ≥12px gap to the chevron: the toggle surrounds the
            action on all sides, and a mis-tap there expands the list — i.e.
            reveals the very answer the action exists to avoid. */}
        {headerAction && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2 z-10">{headerAction}</div>
        )}
      </div>

      {/* Moves Content */}
      <div
        className={`transition-all duration-300 ${isMovesVisible ? 'block' : 'hidden'} rounded-b-lg`}
      >
        <div className="p-4 max-h-[70vh] overflow-y-auto font-mono">
          {formattedPgn.length > 0 ? (
            <div className="space-y-0.5">
              {formattedPgn.map((move: FormattedPgnMove) => {
                const whiteIndex = move.whiteMoveIndex;
                const blackIndex = move.blackMoveIndex;
                const isWhiteHighlighted =
                  whiteIndex !== undefined && currentPosition === whiteIndex;
                const isBlackHighlighted =
                  blackIndex !== undefined && currentPosition === blackIndex;
                const whiteLog = logForMovesIndex(whiteIndex);
                const blackLog = logForMovesIndex(blackIndex);
                const showWhiteOps = whiteLog !== null && hasOps(whiteLog);
                const showBlackOps = blackLog !== null && hasOps(blackLog);

                return (
                  <div key={move.moveNumber} className="flex items-center text-sm">
                    <span className="w-10 text-right pr-2 text-muted-foreground">
                      {move.moveNumber}.
                    </span>
                    <div className="flex-1 flex items-center relative">
                      {move.whiteMove ? (
                        <span
                          className={`flex-1 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                            isWhiteHighlighted
                              ? 'bg-foreground/15 font-semibold dark:bg-foreground/10'
                              : 'hover:bg-muted/40'
                          }`}
                          onClick={() =>
                            whiteIndex !== undefined && onNavigateToPosition(whiteIndex)
                          }
                        >
                          {move.whiteMove}
                        </span>
                      ) : (
                        <span className="flex-1 px-2 py-0.5 text-muted-foreground">...</span>
                      )}
                      {showWhiteOps && whiteIndex !== undefined && whiteLog && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpsOpenForMoveIndex((prev) =>
                                prev === whiteIndex ? null : whiteIndex
                              );
                            }}
                            aria-label={t('movesPanel.viewOps')}
                            className="px-1 text-muted-foreground hover:text-foreground"
                          >
                            <FaInfoCircle className="w-3 h-3" />
                          </button>
                          {opsOpenForMoveIndex === whiteIndex && (
                            <OpsPopover
                              log={whiteLog}
                              labels={opsLabels}
                              onClose={() => setOpsOpenForMoveIndex(null)}
                            />
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex-1 flex items-center relative">
                      <span
                        className={`flex-1 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                          isBlackHighlighted
                            ? 'bg-foreground/15 font-semibold dark:bg-foreground/10'
                            : move.blackMove
                              ? 'hover:bg-muted/40'
                              : ''
                        } ${!move.blackMove ? 'pointer-events-none' : ''}`}
                        onClick={() =>
                          move.blackMove &&
                          blackIndex !== undefined &&
                          onNavigateToPosition(blackIndex)
                        }
                      >
                        {move.blackMove || ''}
                      </span>
                      {showBlackOps && blackIndex !== undefined && blackLog && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpsOpenForMoveIndex((prev) =>
                                prev === blackIndex ? null : blackIndex
                              );
                            }}
                            aria-label={t('movesPanel.viewOps')}
                            className="px-1 text-muted-foreground hover:text-foreground"
                          >
                            <FaInfoCircle className="w-3 h-3" />
                          </button>
                          {opsOpenForMoveIndex === blackIndex && (
                            <OpsPopover
                              log={blackLog}
                              labels={opsLabels}
                              onClose={() => setOpsOpenForMoveIndex(null)}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No moves yet</p>
          )}

          {/* Navigation Controls */}
          {movesLength > 0 && (
            <div className="mt-4">
              <MoveNavigationControls
                onNavigateToStart={onNavigateToStart}
                onNavigatePrevious={onNavigatePrevious}
                onNavigateNext={onNavigateNext}
                onNavigateToEnd={onNavigateToEnd}
                {...moveNavDisabledState(currentPosition, movesLength)}
              />
            </div>
          )}

          {/* Action Buttons */}
          {movesLength > 0 && (
            <div className="mt-4 flex flex-col gap-4">
              {currentPosition !== -1 && currentPosition !== -2 && (
                <>
                  {/* Restart from here button - only show if game is still in progress */}
                  {gameInProgress && (
                    <Button
                      variant="primary"
                      icon={<FaPlay className="w-3 h-3" />}
                      onClick={() => onRestartFromPosition(currentPosition)}
                    >
                      {t('restartFromHere')}
                    </Button>
                  )}
                  {/* New game from here button - always show when navigating moves */}
                  <Button
                    variant="secondary"
                    icon={<FaPlusCircle className="w-3 h-3" />}
                    onClick={() => onNewGameFromPosition(currentPosition)}
                  >
                    {t('newGameFromHere')}
                  </Button>
                </>
              )}

              {/* Analyze on Lichess Button */}
              <Button
                variant="secondary"
                icon={<FaExternalLinkAlt className="w-3 h-3" />}
                onClick={handleAnalyzeOnLichess}
              >
                {t('analyzeOnLichess')}
              </Button>

              {/* Copy PGN Button */}
              <Button
                variant="secondary"
                icon={
                  pgnCopy.copied ? (
                    <FaCheck className="w-3 h-3 text-success" />
                  ) : (
                    <FaCopy className="w-3 h-3" />
                  )
                }
                onClick={handleCopyPgn}
              >
                {pgnCopy.copied ? t('copied') || 'Copied!' : t('copyPgn')}
              </Button>

              {/* Copy FEN Button */}
              <Button
                variant="secondary"
                icon={
                  fenCopy.copied ? (
                    <FaCheck className="w-3 h-3 text-success" />
                  ) : (
                    <FaCopy className="w-3 h-3" />
                  )
                }
                onClick={handleCopyFen}
              >
                {fenCopy.copied ? t('copied') || 'Copied!' : t('copyFen')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
