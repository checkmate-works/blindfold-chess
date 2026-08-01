'use client';

import { useTranslations } from 'next-intl';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import type { RepertoireSide } from '@/lib/repertoires/validation';

import { addLine } from '@/app/[locale]/(public)/repertoires/[id]/_actions/addLine';
import { LineForm } from '@/app/[locale]/(public)/repertoires/_components/LineForm';

type Props = {
  repertoireId: string;
  /** The repertoire's side — orients the board in board mode. */
  side: RepertoireSide;
  /**
   * Moves to start from — e.g. the kata check's uncovered line (matched prefix
   * through the diverging move). Empty for a blank new line.
   */
  initialPgn: string;
  /** The repertoire's chapters — the sections the new line can be filed into. */
  chapters: readonly { id: string; name: string }[];
  /** Existing "why this move" notes, keyed by position key. */
  initialAnnotations: Record<string, string>;
  /** Existing board markup (arrows / circles), keyed by position key. */
  initialShapes: Record<string, BoardAnnotations>;
};

/**
 * Owner-only form for appending a new line to a repertoire — {@link LineForm}
 * wired to `addLine`, landing on the line the server just assigned. Notes and
 * markup authored here persist right after the line is created; they are
 * position-keyed, so positions already annotated by other lines show their
 * existing notes.
 */
export function NewLineForm({ repertoireId, ...rest }: Props) {
  const tNew = useTranslations('Repertoires.line.new');

  return (
    <LineForm
      {...rest}
      repertoireId={repertoireId}
      initialName=""
      // Unfiled by default: a new line has no chapter until its author picks
      // one, and the kata check's "add this line" lands here with only moves.
      initialChapterId={null}
      cancelHref={`/repertoires/${repertoireId}`}
      submitLabels={{ idle: tNew('submit'), saving: tNew('saving') }}
      saveLine={async ({ name, chapterId, pgn }) => {
        const result = await addLine({ repertoireId, name, chapterId, pgn });
        return result.ok
          ? {
              ok: true,
              nextHref: `/repertoires/${repertoireId}/lines/${result.lineNo}?toast=line_added`,
            }
          : { ok: false, error: result.error };
      }}
    />
  );
}
