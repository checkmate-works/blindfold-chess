'use client';

import { useId, useState, useSyncExternalStore } from 'react';

import { useCopyToClipboard } from '@/_hooks/useCopyToClipboard';
import { Button } from '@/app/_components';
import { InfoModal } from '@/app/_components/InfoModal';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaCheck, FaCopy, FaExclamationTriangle, FaExternalLinkAlt } from 'react-icons/fa';

import {
  toggleKnobClass,
  toggleTrackClass,
} from '@/app/[locale]/_components/toggle-switch-classes';
import { UI_TIMEOUTS } from '@/app/[locale]/_constants/ui-timeouts';

import type { LichessAnalysisUrls } from '../_lib/lichess-analysis-urls';
import {
  DEFAULT_INCLUDE_MOVES,
  readIncludeMoves,
  subscribeIncludeMoves,
  writeIncludeMoves,
} from '../_lib/lichess-include-moves-store';

/** Lichess's own PGN import page — the way to analyse a game too long for a link. */
const LICHESS_IMPORT_URL = 'https://lichess.org/paste';

type Props = {
  urls: LichessAnalysisUrls;
  /**
   * The game as PGN text, for the "too long" explanation's copy button —
   * a getter, so the full PGN is only built when someone actually copies it.
   */
  getPgnText: () => string;
};

/**
 * The moves panels' "Analyze on Lichess" control: one link, plus an
 * "Include moves" switch choosing what it sends — the moves so far, opened
 * at the shown position, to step through the game (on); or only the shown
 * position, to analyse it in isolation (off). A line under the switch states
 * which of the two the link opens right now. The switch is remembered per
 * browser (see `lichess-include-moves-store`).
 *
 * When the game is too long for a Lichess link, a chip next to the switch
 * says so, and opens an explanation with a way to get the whole game into
 * Lichess anyway: copy the PGN and paste it into Lichess's import page.
 *
 * A real link rather than a `window.open` button, so it can be middle-clicked,
 * long-pressed, or have its URL copied.
 */
export function LichessAnalysisControl({ urls, getPgnText }: Props) {
  const t = useTranslations('play');
  const switchId = useId();
  const hintId = useId();
  const [isTruncatedInfoOpen, setIsTruncatedInfoOpen] = useState(false);
  const pgnCopy = useCopyToClipboard(UI_TIMEOUTS.PGN_COPY_DURATION);

  const includeMoves = useSyncExternalStore(
    subscribeIncludeMoves,
    readIncludeMoves,
    () => DEFAULT_INCLUDE_MOVES
  );
  const { game } = urls;
  const showTruncated = includeMoves && game.truncated;

  return (
    <div className="flex flex-col gap-2">
      <a
        href={includeMoves ? game.url : urls.position}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full"
        aria-describedby={hintId}
      >
        <Button asChild variant="secondary" icon={<FaExternalLinkAlt className="w-3 h-3" />}>
          {t('analyzeOnLichess')}
        </Button>
      </a>

      {/* The label names the switch; the line under it says, for the current
          state, what the link will open — so the effect of switching it off
          (the position alone, no moves) is visible rather than implied. */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          {/* The chip drops under the label when the row is too narrow for both —
            the desktop sidebar column, or a longer translation of the label. */}
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <label
              htmlFor={switchId}
              className="cursor-pointer whitespace-nowrap text-xs text-foreground"
            >
              {t('lichessAnalysis.includeMoves')}
            </label>
            {showTruncated && (
              <button
                type="button"
                onClick={() => setIsTruncatedInfoOpen(true)}
                aria-haspopup="dialog"
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning-soft-foreground hover:brightness-95"
              >
                <FaExclamationTriangle className="w-3 h-3" aria-hidden />
                {t('lichessAnalysis.truncatedChip')}
              </button>
            )}
          </div>
          <button
            id={switchId}
            type="button"
            role="switch"
            aria-checked={includeMoves}
            aria-describedby={hintId}
            onClick={() => writeIncludeMoves(!includeMoves)}
            className={`shrink-0 ${toggleTrackClass('control', includeMoves)}`}
          >
            <span className={toggleKnobClass('control', includeMoves)} />
          </button>
        </div>
        <p id={hintId} className="text-xs text-muted-foreground">
          {includeMoves
            ? t('lichessAnalysis.includeMovesOnHint')
            : t('lichessAnalysis.includeMovesOffHint')}
        </p>
      </div>

      <InfoModal
        isOpen={isTruncatedInfoOpen}
        onClose={() => setIsTruncatedInfoOpen(false)}
        title={t('lichessAnalysis.truncatedTitle')}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            {t('lichessAnalysis.truncatedBody', {
              lastIncludedMove: game.cut?.lastIncludedMove ?? '',
              lastMove: game.cut?.lastMove ?? '',
            })}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              icon={
                pgnCopy.copied ? (
                  <FaCheck className="w-3 h-3 text-success" />
                ) : (
                  <FaCopy className="w-3 h-3" />
                )
              }
              onClick={() => pgnCopy.copy(getPgnText())}
            >
              {pgnCopy.copied ? t('copied') : t('copyPgn')}
            </Button>
            <a href={LICHESS_IMPORT_URL} target="_blank" rel="noopener noreferrer">
              <Button asChild variant="secondary" icon={<FaExternalLinkAlt className="w-3 h-3" />}>
                {t('lichessAnalysis.openImport')}
              </Button>
            </a>
          </div>
        </div>
      </InfoModal>
    </div>
  );
}
