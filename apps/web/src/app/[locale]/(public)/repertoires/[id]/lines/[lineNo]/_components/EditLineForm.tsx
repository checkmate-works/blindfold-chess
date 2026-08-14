'use client';

import { useTranslations } from 'next-intl';

import type { Side } from '@blindfold-chess/types';

import type { BoardAnnotations } from '@/lib/board-annotations/types';

import { LineForm } from '@/app/[locale]/(public)/repertoires/_components/LineForm';

import { updateLine } from '../_actions/updateLine';

type Props = {
  repertoireId: string;
  lineNo: number;
  initialName: string;
  /** The repertoire's chapters — the sections this line can be re-filed into. */
  chapters: readonly { id: string; name: string }[];
  /** The chapter the line is currently filed under; null is unfiled. */
  initialChapterId: string | null;
  initialPgn: string;
  /** The repertoire's side — orients the board in board mode. */
  side: Side;
  /**
   * The repertoire's existing "why this move" notes, keyed by position key —
   * prefills the per-move note editor under the board.
   */
  initialAnnotations: Record<string, string>;
  /**
   * The repertoire's existing board markup (arrows / circles), keyed by
   * position key — displayed and editable on the board in board mode.
   */
  initialShapes: Record<string, BoardAnnotations>;
};

/**
 * Owner-only editor for an existing line — {@link LineForm} wired to
 * `updateLine`, returning to the line's own page on save. Replacing the
 * moves needs no annotation migration: notes and per-move comments are
 * position-keyed, so they follow the surviving positions.
 */
export function EditLineForm({ repertoireId, lineNo, ...rest }: Props) {
  const t = useTranslations('Repertoires.line.edit');
  const lineHref = `/repertoires/${repertoireId}/lines/${lineNo}`;

  return (
    <LineForm
      {...rest}
      repertoireId={repertoireId}
      cancelHref={lineHref}
      submitLabels={{ idle: t('save'), saving: t('saving') }}
      saveLine={async ({ name, chapterId, pgn }) => {
        const result = await updateLine({ repertoireId, lineNo, name, chapterId, pgn });
        return result.ok
          ? { ok: true, nextHref: `${lineHref}?toast=line_updated` }
          : { ok: false, error: result.error };
      }}
    />
  );
}
