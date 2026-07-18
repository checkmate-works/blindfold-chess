'use client';

import { useTranslations } from 'next-intl';

import { Textarea } from '@/app/_components';

import { REPERTOIRE_ANNOTATION_MAX } from '@/lib/repertoires/validation';

type Props = {
  /** The move being explained, e.g. "3. d4" — for the heading. */
  moveLabel: string;
  value: string;
  onChange: (next: string) => void;
};

/**
 * The owner's "why this move" note for the move the board cursor rests on,
 * as it appears on the repertoire editing forms (import + line edit): the same
 * framed section the line detail page shows the note in, but directly editable
 * — on an owner-only form the note is just another field, no edit-mode dance.
 * Drafts stage in the parent's state and persist with the form's submit.
 */
export function MoveAnnotationField({ moveLabel, value, onChange }: Props) {
  const t = useTranslations('Repertoires');

  return (
    <section className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
      <h3 className="text-xs font-semibold text-muted-foreground">
        {t('line.annotation.title')} · <span className="text-foreground">{moveLabel}</span>
      </h3>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={REPERTOIRE_ANNOTATION_MAX}
        placeholder={t('line.annotation.placeholder')}
        aria-label={t('line.annotation.title')}
      />
      <p className="text-xs text-muted-foreground">{t('boardBuilder.annotationHelp')}</p>
    </section>
  );
}
