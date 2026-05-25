'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

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

import { formatPgnToText } from '../_lib';
import type { FormattedPgn, FormattedPgnMove } from '../_lib';
import { getMovingSide } from '../_lib/fen-utils';
import { MoveNavigationControls } from './MoveNavigationControls';

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
};

type Props = {
  moveList: MovesPanelMoveListProps;
  navigation: MovesPanelNavigationProps;
  actions: MovesPanelActionsProps;
  operations?: MovesPanelOperationsProps;
  showBackground?: boolean;
};

/** True iff at least one counter on the log entry is non-zero. */
function hasOps(log: MoveOperationLog): boolean {
  return (
    log.peekCount > 0 ||
    log.undoCount > 0 ||
    (log.movePeekCount ?? 0) > 0 ||
    (log.invalidCount ?? 0) > 0
  );
}

/**
 * Small popover that lists each non-zero counter for a single move. Self
 * dismisses on outside click + Esc. Positioned absolutely relative to its
 * parent (the move row), so the parent must establish a `position:
 * relative` container.
 */
function OpsPopover({
  log,
  onClose,
  labels,
}: {
  log: MoveOperationLog;
  onClose: () => void;
  labels: { peek: string; undo: string; hints: string; invalid: string };
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Defer one tick so the click that opens the popover does not also
    // trigger the outside-click handler that closes it.
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClick);
      window.addEventListener('keydown', handleKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const rows: { label: string; value: number }[] = [];
  if (log.peekCount > 0) rows.push({ label: labels.peek, value: log.peekCount });
  if (log.undoCount > 0) rows.push({ label: labels.undo, value: log.undoCount });
  if ((log.movePeekCount ?? 0) > 0)
    rows.push({ label: labels.hints, value: log.movePeekCount as number });
  if ((log.invalidCount ?? 0) > 0)
    rows.push({ label: labels.invalid, value: log.invalidCount as number });

  return (
    <div
      ref={ref}
      role="dialog"
      className="absolute z-20 right-0 top-full mt-1 min-w-[8rem] rounded-md border border-border bg-card shadow-md text-xs font-sans"
    >
      <dl className="divide-y divide-border/50">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-3 px-3 py-1.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

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
  const [isCopied, setIsCopied] = useState(false);
  const [isFenCopied, setIsFenCopied] = useState(false);
  // Which player move's ops popover is currently open. Identified by the
  // moves[] index, so the same key works for both white and black moves.
  const [opsOpenForMoveIndex, setOpsOpenForMoveIndex] = useState<number | null>(null);

  // Player-move-indices: each entry is a moves[] index that the player
  // played. logs[i] aligns with playerMoveIndices[i] — same alignment the
  // OperationLogModal table uses. Recomputed when moves or playerSide
  // change; empty array when no operations are wired in.
  const playerMoveIndices = useMemo<number[]>(() => {
    if (!operations) return [];
    const result: number[] = [];
    for (let i = 0; i < movesLength; i++) {
      if (getMovingSide(i, startingFen) === operations.playerSide) result.push(i);
    }
    return result;
  }, [operations, movesLength, startingFen]);

  const logForMovesIndex = (movesIndex: number | undefined): MoveOperationLog | null => {
    if (!operations || movesIndex === undefined) return null;
    const logIndex = playerMoveIndices.indexOf(movesIndex);
    if (logIndex === -1 || logIndex >= operations.logs.length) return null;
    return operations.logs[logIndex];
  };

  const opsLabels = {
    peek: t('operationLog.columnPeek'),
    undo: t('operationLog.columnUndo'),
    hints: t('operationLog.columnMovePeek'),
    invalid: t('operationLog.columnInvalid'),
  };

  const handleCopyPgn = () => {
    const pgnText = formatPgnToText(formattedPgn, startingFen);
    navigator.clipboard.writeText(pgnText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), UI_TIMEOUTS.PGN_COPY_DURATION);
    });
  };

  const handleCopyFen = () => {
    // Use the same FEN that is sent to Lichess
    let fenToCopy: string;
    if (currentPosition === -1) {
      // Current position
      fenToCopy = currentFen;
    } else {
      // Historical position
      fenToCopy = displayFen || currentFen;
    }

    navigator.clipboard.writeText(fenToCopy).then(() => {
      setIsFenCopied(true);
      setTimeout(() => setIsFenCopied(false), UI_TIMEOUTS.FEN_COPY_DURATION);
    });
  };

  const handleAnalyzeOnLichess = () => {
    window.open(lichessAnalysisUrl, '_blank');
  };

  return (
    <div className={showBackground ? 'bg-card rounded-lg' : 'border border-border rounded-lg'}>
      {/* Moves Toggle Header */}
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
                isPreviousDisabled={
                  currentPosition === -2 || (currentPosition === -1 && movesLength === 0)
                }
                isNextDisabled={currentPosition === -1}
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
                  isCopied ? (
                    <FaCheck className="w-3 h-3 text-success" />
                  ) : (
                    <FaCopy className="w-3 h-3" />
                  )
                }
                onClick={handleCopyPgn}
              >
                {isCopied ? t('copied') || 'Copied!' : t('copyPgn')}
              </Button>

              {/* Copy FEN Button */}
              <Button
                variant="secondary"
                icon={
                  isFenCopied ? (
                    <FaCheck className="w-3 h-3 text-success" />
                  ) : (
                    <FaCopy className="w-3 h-3" />
                  )
                }
                onClick={handleCopyFen}
              >
                {isFenCopied ? t('copied') || 'Copied!' : t('copyFen')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
