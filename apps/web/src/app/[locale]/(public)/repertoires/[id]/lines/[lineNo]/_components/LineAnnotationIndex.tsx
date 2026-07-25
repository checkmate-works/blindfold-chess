'use client';

import { useTranslations } from 'next-intl';

import { FiChevronRight } from 'react-icons/fi';

import { GameCommentBody } from '@/app/[locale]/(public)/games/shared/[id]/_components/GameCommentBody';
import type { MoveNotationLine } from '@/app/[locale]/(public)/topics/_lib/move-notation';
import { SectionTitle } from '@/app/[locale]/_components';

import type { LineMove } from '../_lib/line-moves';

type Props = {
  /** Per-ply move data, indexed by ply-1 (moves[0] = ply 1). */
  moves: LineMove[];
  /** Jump the board to a move (1-based ply). */
  onJumpToPly: (ply: number) => void;
  /** The line's moves + root, so a note that cites a move renders it as a link. */
  moveNotation: MoveNotationLine;
  locale: string;
};

/**
 * Shown at the start position (ply 0), where no single move is in focus: a
 * table of contents of the moves in this line that carry a "why this move"
 * note. Mirrors the shared game's Discussion feed — each entry is the move
 * label (jumping the board there) over its note — so the two read the same.
 * Renders nothing when the line has no notes.
 */
export function LineAnnotationIndex({ moves, onJumpToPly, moveNotation, locale }: Props) {
  const t = useTranslations('Repertoires.line.annotationIndex');

  // moves[i] is ply i+1; keep that mapping so the jump lands on the right move.
  const annotated = moves.flatMap((move, index) =>
    move.annotation
      ? [{ ply: index + 1, label: move.label, text: move.annotation, key: move.positionKey }]
      : []
  );

  if (annotated.length === 0) return null;

  return (
    <section className="space-y-6">
      <SectionTitle>{t('title')}</SectionTitle>
      <ul className="space-y-8">
        {annotated.map(({ ply, label, text, key }) => (
          <li key={key} className="space-y-3">
            <button
              type="button"
              onClick={() => onJumpToPly(ply)}
              className="inline-flex items-center gap-0.5 text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              {label}
              <FiChevronRight className="h-4 w-4" aria-hidden />
            </button>
            <p className="whitespace-pre-wrap text-foreground">
              <GameCommentBody
                text={text}
                locale={locale}
                moves={moveNotation.moves}
                startingFen={moveNotation.startingFen}
                playerColor={moveNotation.playerColor}
              />
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
