import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';

import type { RepertoireCheckEntry } from '@/lib/repertoires/check-report';

import { buildReplayModel } from '../_lib/build-replay';
import { REPERTOIRE_CHECK_PATH, buildRepertoireCheckQuery } from '../_lib/check-url';
import { MATCH_STATUS_BADGE, MATCH_STATUS_KEY, type MatchStatus } from '../_lib/match-status';
import { ReplayBoard } from './ReplayBoard';

type Props = {
  /** The kata being checked. */
  selected: RepertoireCheckEntry;
  /** Every applicable kata, for the side menu. */
  entries: RepertoireCheckEntry[];
  /** The full game's SAN moves. */
  moves: string[];
  /** The game's move pairs, for the viewer's move strip. */
  formatted: FormattedPgnMove[];
  playerColor: 'white' | 'black';
  /** The game's starting position; undefined for the standard start. */
  startingFen?: string;
  gameId?: string;
  locale: string;
};

function StatusBadge({ status, label }: { status: MatchStatus; label: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${MATCH_STATUS_BADGE[status]}`}>
      {label}
    </span>
  );
}

/**
 * The replay view for one chosen kata, laid out like the repertoire detail
 * page: the board column on the left (name + verdict badge above the same
 * board chrome, and — when the game left the kata — the add-line offer below),
 * and a side menu of the other applicable katas on the right for switching
 * without going back to the picker. Positions and move formatting are
 * precomputed server-side so the client viewer stays chess.js-free.
 */
export async function RepertoireCheckView({
  selected,
  entries,
  moves,
  formatted,
  playerColor,
  startingFen,
  gameId,
  locale,
}: Props) {
  const t = await getTranslations({ locale, namespace: 'play' });

  const { repertoire, result } = selected;
  const { positions, stopPly, verdict, addLinePgn } = buildReplayModel({
    result,
    moves,
    gameStartingFen: startingFen,
    repertoireStartingFen: repertoire.startingFen,
  });

  const pathFor = (repertoireId: string) =>
    `/${locale}${REPERTOIRE_CHECK_PATH}?${buildRepertoireCheckQuery({
      moves,
      playerColor,
      startingFen,
      gameId,
      repertoireId,
    })}`;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/${locale}/repertoires/${repertoire.id}`}
            className="text-base font-semibold text-foreground hover:underline"
          >
            {repertoire.name}
          </Link>
          <StatusBadge
            status={verdict.status}
            label={t(`repertoireCheck.status.${MATCH_STATUS_KEY[verdict.status]}`)}
          />
        </div>

        {/* Keyed by repertoire so switching via the side menu remounts the
            viewer — same-route search-param navigation would otherwise keep
            the previous kata's playback state (overlay dismissed, verdict
            revealed). */}
        <ReplayBoard
          key={repertoire.id}
          positions={positions}
          formatted={formatted}
          side={playerColor}
          stopPly={stopPly}
          verdict={verdict}
          addLineHref={
            addLinePgn
              ? `/${locale}/repertoires/${repertoire.id}/lines/new?pgn=${encodeURIComponent(addLinePgn)}`
              : null
          }
        />
      </div>

      {/* The other applicable katas sit in the right column, the same place
          (and styling) the repertoire detail page puts its line list. */}
      <ul className="space-y-1 lg:col-span-1">
        {entries.map((entry) => {
          const isSelected = entry.repertoire.id === repertoire.id;
          return (
            <li key={entry.repertoire.id}>
              <Link
                href={pathFor(entry.repertoire.id)}
                className={`block w-full truncate rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-link-primary/10 font-medium text-link-primary'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {entry.repertoire.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
