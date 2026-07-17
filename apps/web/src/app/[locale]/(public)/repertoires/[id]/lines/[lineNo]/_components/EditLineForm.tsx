'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, FormErrorBanner, TextInput, Textarea } from '@/app/_components';
import { UnsavedChangesDialog } from '@/app/_components/UnsavedChangesDialog';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import { KNOWN_LINE_FORM_ERRORS } from '@/lib/repertoires/line-form-errors';
import type { RepertoireSide } from '@/lib/repertoires/validation';
import { REPERTOIRE_ANNOTATION_MAX } from '@/lib/repertoires/validation';

import { BoardFenTabs } from '@/app/[locale]/(public)/practice/(free-play)/_components/BoardFenTabs';
import { RepertoireBoardBuilder } from '@/app/[locale]/(public)/repertoires/_components/RepertoireBoardBuilder';

import { deleteAnnotation } from '../_actions/deleteAnnotation';
import { saveAnnotation } from '../_actions/saveAnnotation';
import { updateLine } from '../_actions/updateLine';

type Props = {
  locale: string;
  repertoireId: string;
  lineNo: number;
  initialName: string;
  initialPgn: string;
  /** The repertoire's side — orients the board in board mode. */
  side: RepertoireSide;
  /**
   * The repertoire's existing "why this move" notes, keyed by position key —
   * prefills the per-move note editor under the board.
   */
  initialAnnotations: Record<string, string>;
};

/**
 * Owner-only editor for a single line: its title and its moves. The moves are
 * editable two ways behind the same Board / PGN switcher as the import form —
 * an interactive board (opens with the stored line loaded; in single-line mode
 * a divergent move replaces the tail, since a line holds no branches) or the
 * raw PGN textbox. On save we just store the new moves — annotations and
 * per-move comments are position-keyed, so they follow the surviving positions
 * with no migration here.
 */
export function EditLineForm({
  locale,
  repertoireId,
  lineNo,
  initialName,
  initialPgn,
  side,
  initialAnnotations,
}: Props) {
  const t = useTranslations('Repertoires.line.edit');
  const tForm = useTranslations('Repertoires.form');
  const tAnnotation = useTranslations('Repertoires.line.annotation');
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [pgn, setPgn] = useState(initialPgn);
  // Per-position "why this move" drafts, edited inline under the board for
  // whichever move the cursor rests on, and persisted on Save alongside the
  // line (notes are position-keyed, so they need no line row to exist).
  const [annotations, setAnnotations] = useState<Record<string, string>>(initialAnnotations);
  const [cursor, setCursor] = useState<{ positionKey: string; label: string } | null>(null);
  // Editing an existing line starts on the board — the stored moves are
  // already there to step through; the PGN tab remains for raw editing.
  const [inputMode, setInputMode] = useState<'pgn' | 'board'>('board');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Note drafts that differ from what the server holds (trimmed comparison —
  // whitespace-only edits are not changes worth writing).
  const changedAnnotations = Object.entries(annotations).filter(
    ([key, text]) => text.trim() !== (initialAnnotations[key] ?? '').trim()
  );

  // Same leave-guard pieces as the import / chunk / puzzle forms.
  const tUnsaved = useTranslations('unsavedChanges');
  const isDirty =
    !submitted && (name !== initialName || pgn !== initialPgn || changedAnnotations.length > 0);
  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  const lineHref = `/repertoires/${repertoireId}/lines/${lineNo}`;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await updateLine({
      repertoireId,
      lineNo,
      locale,
      name: name.trim() || null,
      pgn,
    });
    if (!result.ok) {
      setPending(false);
      setError(
        KNOWN_LINE_FORM_ERRORS.has(result.error) ? t(`errors.${result.error}`) : t('errors.generic')
      );
      return;
    }

    // Persist the changed per-move notes alongside the line. Position-keyed
    // writes are independent of each other and of the line row, so a partial
    // failure leaves the successful ones in place; we stay on the page (still
    // dirty) so retrying the save only re-sends what still differs.
    const noteResults = await Promise.all(
      changedAnnotations.map(([positionKey, text]) =>
        text.trim()
          ? saveAnnotation({ repertoireId, lineNo, locale, positionKey, text: text.trim() })
          : deleteAnnotation({ repertoireId, lineNo, locale, positionKey })
      )
    );
    if (noteResults.some((r) => !r.ok)) {
      setPending(false);
      setError(t('errors.generic'));
      return;
    }

    // flushSync so the isDirty -> false re-render completes before
    // router.push triggers the navigation guard (same as ChunkForm).
    flushSync(() => setSubmitted(true));
    router.push(`${lineHref}?toast=line_updated`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="line-name" className="block text-sm font-medium text-foreground">
          {t('nameLabel')}
        </label>
        <TextInput
          id="line-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('namePlaceholder')}
          maxLength={120}
          className="mt-1 w-full"
        />
      </div>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-foreground">
          {tForm('movesLabel')} <span className="text-destructive">*</span>
        </span>
        <BoardFenTabs
          activeTab={inputMode === 'board' ? 'board' : 'fen'}
          onTabChange={(tab) => setInputMode(tab === 'board' ? 'board' : 'pgn')}
          boardLabel={tForm('inputModeBoard')}
          fenLabel={tForm('inputModePgn')}
        />
        {inputMode === 'pgn' ? (
          <>
            <p className="text-xs text-muted-foreground">{t('pgnHelp')}</p>
            <Textarea
              id="line-pgn"
              value={pgn}
              onChange={(e) => setPgn(e.target.value)}
              rows={8}
              className="font-mono text-sm"
              aria-label={t('pgnLabel')}
            />
          </>
        ) : (
          /* Remounts on each switch, re-importing whatever the pgn state holds
             (including a non-standard [FEN] root) — so board → PGN shows the
             serialized line and PGN → board replays the edited text. */
          <>
            <RepertoireBoardBuilder
              side={side}
              initialPgn={pgn}
              onPgnChange={setPgn}
              singleLine
              onCursorChange={setCursor}
            />

            {/* The owner's "why this move" note for the move the cursor rests
                on — the same framed section the line detail page shows it in,
                but directly editable here: on an owner-only edit form the
                note is just another field, no edit-mode dance. Saved with the
                line via the form's Save. */}
            {cursor && (
              <section className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="text-xs font-semibold text-muted-foreground">
                  {tAnnotation('title')} · <span className="text-foreground">{cursor.label}</span>
                </h3>
                <Textarea
                  value={annotations[cursor.positionKey] ?? ''}
                  onChange={(e) =>
                    setAnnotations((prev) => ({ ...prev, [cursor.positionKey]: e.target.value }))
                  }
                  rows={3}
                  maxLength={REPERTOIRE_ANNOTATION_MAX}
                  placeholder={tAnnotation('placeholder')}
                  aria-label={tAnnotation('title')}
                />
                <p className="text-xs text-muted-foreground">{t('annotationHelp')}</p>
              </section>
            )}
          </>
        )}
      </div>

      <FormErrorBanner message={error} />

      <UnsavedChangesDialog
        open={isBlocking}
        onConfirm={confirm}
        onCancel={cancel}
        title={tUnsaved('title')}
        message={tUnsaved('message')}
        confirmLabel={tUnsaved('confirm')}
        cancelLabel={tUnsaved('cancel')}
      />

      <div className="space-y-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={pending}
          disabled={pending}
        >
          {pending ? t('saving') : t('save')}
        </Button>
        <button
          type="button"
          onClick={() => router.push(lineHref)}
          disabled={pending}
          className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
