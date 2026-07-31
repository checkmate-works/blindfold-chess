'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { Button } from '@/app/_components';
import { ChessBoard } from '@/app/_components/chess/ChessBoard';
import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';
import type { Side } from '@blindfold-chess/types';
import { HiChevronDown, HiChevronRight, HiChevronUp } from 'react-icons/hi2';

import { lineFallbackTitle } from '@/lib/repertoires/line-display-name';

import { HorizontalMoveList } from '@/app/[locale]/(public)/games/play/_components/HorizontalMoveList';
import { MoveNavigationRow } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationRow';
import { INLINE_BOARD_CARD_CHROME } from '@/app/[locale]/(public)/games/play/_lib/skeleton-layout-classes';
import { useBoardDisplay } from '@/app/[locale]/_hooks/use-board-display';

import { LineListPanel } from './LineListPanel';

/** One line, pre-replayed + pre-formatted on the server (no chess.js client-side). */
export type RepertoireViewerLine = {
  id: string;
  name: string | null;
  /** Stable line number within the repertoire (`line_no`); the detail-page key. */
  lineNo: number;
  /** Numbered move pairs, rendered like the in-game move list. */
  formatted: FormattedPgnMove[];
  /** Board position at each ply; index 0 is the start. */
  positions: { fen: string; lastMove: { from: string; to: string } | null }[];
};

/** Move pairs shown in a list row's unfolded preview before truncating. */
const PREVIEW_PAIRS = 4;

type Props = {
  lines: RepertoireViewerLine[];
  side: Side;
  /** Repertoire id, for linking each line to its detail (annotations) page. */
  repertoireId: string;
  locale: string;
  /** Whether the viewer is the owner — gates the empty-state "add a line" CTA. */
  isOwner: boolean;
};

/**
 * Interactive viewer for a repertoire's lines: a clickable list of lines on the
 * left, and on the right the same board layout the game screen uses — a
 * horizontally-scrolling move list above the board, the board, and first / prev
 * / next / last controls (and ←/→ keys). Positions/formatting are precomputed
 * server-side, so this stays a thin UI client component.
 *
 * For the owner, the line list ends with an "Add a line" row to the
 * (previously unlinked) lines/new page — always available, not just when the
 * repertoire has none yet (see the `!line` empty-state branch below, which
 * offers the same link).
 */
export function RepertoireLineViewer({ lines, side, repertoireId, locale, isOwner }: Props) {
  const t = useTranslations('Repertoires');
  const [selectedIndex, setSelectedIndex] = useState(0);
  // The line whose truncated moves are unfolded in the list; accordion-style
  // (one at a time). Expanding also previews the line on the big board.
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [ply, setPly] = useState(0);

  // A `building` repertoire is reachable by direct URL (soft-privacy) before
  // it has any lines — e.g. right after creation, or between deleting the
  // last line and adding a new one. `line` stays undefined in that case;
  // everything below the early return assumes at least one line exists.
  const line = lines[selectedIndex] ?? lines[0];
  const maxPly = (line?.positions.length ?? 1) - 1;
  const clampedPly = Math.min(ply, maxPly);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        setPly((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight') {
        setPly((p) => Math.min(maxPly, p + 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [maxPly]);

  function toggleExpand(index: number) {
    setExpandedIndex((prev) => (prev === index ? null : index));
    // Unfolding a line also previews it on the board (collapsing keeps it).
    if (expandedIndex !== index) {
      setSelectedIndex(index);
      setPly(0);
    }
  }

  // Resolved before the empty-state guard below: hooks cannot run conditionally.
  const display = useBoardDisplay(
    line ? (clampedPly > 0 ? line.positions[clampedPly].lastMove : null) : null
  );

  if (!line) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-muted-foreground">{t('detail.noLines')}</p>
        {isOwner && (
          <Link href={`/${locale}/repertoires/${repertoireId}/lines/new`} className="inline-block">
            <Button asChild variant="primary">
              {t('line.new.title')}
            </Button>
          </Link>
        )}
      </div>
    );
  }

  const current = line.positions[clampedPly];

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {/* Mirrors InlineBoardView's always-open (board-visible) chrome: a single
            card holding the horizontal move strip, the board, and the controls. */}
        <div className={INLINE_BOARD_CARD_CHROME}>
          <div className="relative">
            <HorizontalMoveList
              formattedPgn={line.formatted}
              currentPosition={clampedPly - 1}
              onNavigateToPosition={(position) => setPly(position + 1)}
            />

            <ChessBoard
              fen={current.fen}
              flipped={side === 'black'}
              playerSide={side}
              showOwnPieces
              showOpponentPieces
              {...display}
              rounded={false}
            />

            <MoveNavigationRow
              onNavigateToStart={() => setPly(0)}
              onNavigatePrevious={() => setPly(Math.max(0, clampedPly - 1))}
              onNavigateNext={() => setPly(Math.min(maxPly, clampedPly + 1))}
              onNavigateToEnd={() => setPly(maxPly)}
              isPreviousDisabled={clampedPly === 0}
              isNextDisabled={clampedPly === maxPly}
            />
          </div>
        </div>

        <Link
          href={`/${locale}/repertoires/${repertoireId}/lines/${line.lineNo}`}
          className="block"
        >
          <Button asChild variant="outline" fullWidth>
            {t('detail.openLine')}
          </Button>
        </Link>
      </div>

      {/* The line list sits in the right column, in the same labelled card the
          line detail page's switcher uses (LineListPanel): row separators, row
          click navigating to the line's detail page. The chevron toggle unfolds
          a truncated preview of the line's moves (and mirrors it on the big
          board) — the preview itself is also a link to the same detail page, so
          expanding it isn't a dead end. */}
      <div className="lg:col-span-1">
        <LineListPanel
          heading={t('detail.linesHeading')}
          addLineHref={`/${locale}/repertoires/${repertoireId}/lines/new`}
          addLineLabel={isOwner ? t('line.new.title') : undefined}
          manageHref={`/${locale}/repertoires/${repertoireId}/lines`}
          manageLabel={isOwner && lines.length > 1 ? t('lines.manageAction') : undefined}
        >
          {lines.map((l, i) => {
            const isSelected = i === selectedIndex;
            const isExpanded = i === expandedIndex;
            const previewPairs = l.formatted.slice(0, PREVIEW_PAIRS);
            const truncated = l.formatted.length > PREVIEW_PAIRS;
            return (
              <li key={l.id} className="border-b border-border last:border-b-0">
                <div
                  className={`flex items-center transition-colors ${isSelected ? 'bg-muted' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(i)}
                    aria-expanded={isExpanded}
                    aria-label={t('detail.previewToggle')}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {isExpanded ? (
                      <HiChevronUp aria-hidden className="size-4" />
                    ) : (
                      <HiChevronDown aria-hidden className="size-4" />
                    )}
                  </button>
                  <Link
                    href={`/${locale}/repertoires/${repertoireId}/lines/${l.lineNo}`}
                    className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-3 transition-colors hover:bg-muted"
                  >
                    <span
                      className={`truncate text-sm text-foreground ${isSelected ? 'font-medium' : ''}`}
                    >
                      {l.name ??
                        lineFallbackTitle(l.formatted, t('detail.lineFallback', { n: i + 1 }))}
                    </span>
                    <HiChevronRight
                      aria-hidden
                      className="ml-auto size-4 flex-shrink-0 text-foreground/40"
                    />
                  </Link>
                </div>

                {isExpanded && (
                  <Link
                    href={`/${locale}/repertoires/${repertoireId}/lines/${l.lineNo}`}
                    className="flex flex-wrap items-center gap-x-1 gap-y-0.5 p-3 text-sm transition-colors hover:bg-muted"
                  >
                    {previewPairs.map((pair) => (
                      <span key={pair.moveNumber} className="flex items-center gap-0.5">
                        <span className="text-xs text-muted-foreground">{pair.moveNumber}.</span>
                        {pair.whiteMove && (
                          <span className="text-foreground">{pair.whiteMove}</span>
                        )}
                        {pair.blackMove && (
                          <span className="text-foreground">{pair.blackMove}</span>
                        )}
                      </span>
                    ))}
                    {truncated && <span className="text-muted-foreground">…</span>}
                  </Link>
                )}
              </li>
            );
          })}
        </LineListPanel>
      </div>
    </div>
  );
}
