'use client';

import { useTranslations } from 'next-intl';

import type { PositionAccuracy } from '@blindfold-chess/features/common';

import { SegmentedProgressBar } from './SegmentedProgressBar';

type Props = {
  accuracy: PositionAccuracy;
  /**
   * Namespace holding `recreationProgress`, `correct`, `incorrect`, `missing`,
   * `extra` and `extraDescription`. The keys are spelled the same under every
   * practice module, so the namespace is all a caller has to supply.
   */
  namespace: string;
};

/**
 * How much of a position the player rebuilt: a heading, a three-way bar over
 * correct / incorrect / missing squares, and a note for pieces placed that the
 * original did not have.
 *
 * The three segments and their colors are fixed rather than passed in. Every
 * result screen that shows this shows the same three, and the one that spelled
 * them out by hand had already fallen behind: it wrote the bar as three raw
 * divs, so it rendered zero-width blocks for empty segments and named its text
 * colors differently. Extra pieces are a note rather than a fourth segment
 * because they are not part of the total — the bar sums to the original's piece
 * count, and a surplus piece has no square in it to occupy.
 */
export function PieceRecreationProgress({ accuracy, namespace }: Props) {
  const t = useTranslations(namespace);

  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-2">{t('recreationProgress')}</p>
      <SegmentedProgressBar
        segments={[
          {
            key: 'correct',
            value: accuracy.correctPieces,
            color: 'bg-success',
            label: t('correct'),
          },
          {
            key: 'incorrect',
            value: accuracy.incorrectPieces,
            color: 'bg-destructive',
            label: t('incorrect'),
          },
          {
            key: 'missing',
            value: accuracy.missingPieces,
            color: 'bg-muted-foreground/40',
            label: t('missing'),
          },
        ]}
        total={accuracy.totalPieces}
      />
      {accuracy.extraPieces > 0 && (
        <p className="text-xs text-muted-foreground mt-3">
          {t('extra')}: <span className="font-semibold">+{accuracy.extraPieces}</span> (
          {t('extraDescription')})
        </p>
      )}
    </div>
  );
}
