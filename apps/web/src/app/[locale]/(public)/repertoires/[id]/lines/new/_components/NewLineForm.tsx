'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, FormErrorBanner, TextInput, Textarea } from '@/app/_components';
import { UnsavedChangesDialog } from '@/app/_components/UnsavedChangesDialog';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import { KNOWN_LINE_FORM_ERRORS } from '@/lib/repertoires/line-form-errors';
import type { RepertoireSide } from '@/lib/repertoires/validation';

import { BoardFenTabs } from '@/app/[locale]/(public)/practice/(free-play)/_components/BoardFenTabs';
import { addLine } from '@/app/[locale]/(public)/repertoires/[id]/_actions/addLine';
import { deleteAnnotation } from '@/app/[locale]/(public)/repertoires/[id]/lines/[lineNo]/_actions/deleteAnnotation';
import { saveAnnotation } from '@/app/[locale]/(public)/repertoires/[id]/lines/[lineNo]/_actions/saveAnnotation';
import { saveShapes } from '@/app/[locale]/(public)/repertoires/[id]/lines/[lineNo]/_actions/saveShapes';
import { MoveAnnotationField } from '@/app/[locale]/(public)/repertoires/_components/MoveAnnotationField';
import { RepertoireBoardBuilder } from '@/app/[locale]/(public)/repertoires/_components/RepertoireBoardBuilder';

type Props = {
  locale: string;
  repertoireId: string;
  /** The repertoire's side — orients the board in board mode. */
  side: RepertoireSide;
  /**
   * Moves to start from — e.g. the kata check's uncovered line (matched prefix
   * through the diverging move). Empty for a blank new line.
   */
  initialPgn: string;
  /** Existing "why this move" notes, keyed by position key. */
  initialAnnotations: Record<string, string>;
  /** Existing board markup (arrows / circles), keyed by position key. */
  initialShapes: Record<string, BoardAnnotations>;
};

/**
 * Owner-only form for appending a new line to a repertoire — the same
 * Board / PGN editor as the line edit form (single-line semantics: a
 * divergent move replaces the tail), starting from whatever moves were
 * handed in (a kata check's uncovered line arrives via `?pgn=`). Notes and
 * markup authored here persist right after the line is created — they are
 * position-keyed, so positions already annotated by other lines show their
 * existing notes.
 */
export function NewLineForm({
  locale,
  repertoireId,
  side,
  initialPgn,
  initialAnnotations,
  initialShapes,
}: Props) {
  const t = useTranslations('Repertoires.line.edit');
  const tNew = useTranslations('Repertoires.line.new');
  const tForm = useTranslations('Repertoires.form');
  const router = useRouter();

  const [name, setName] = useState('');
  const [pgn, setPgn] = useState(initialPgn);
  const [annotations, setAnnotations] = useState<Record<string, string>>(initialAnnotations);
  const [shapes, setShapes] = useState<Record<string, BoardAnnotations>>(initialShapes);
  const [cursor, setCursor] = useState<{ positionKey: string; label: string } | null>(null);
  // The handed-in line is the point of this page — open on the board with it.
  const [inputMode, setInputMode] = useState<'pgn' | 'board'>('board');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const changedAnnotations = Object.entries(annotations).filter(
    ([key, text]) => text.trim() !== (initialAnnotations[key] ?? '').trim()
  );
  const changedShapes = Object.entries(shapes).filter(
    ([key, value]) => JSON.stringify(value) !== JSON.stringify(initialShapes[key] ?? null)
  );

  // Same leave-guard pieces as the other repertoire forms. The prefilled pgn
  // doesn't count as dirty — leaving without touching anything is fine.
  const tUnsaved = useTranslations('unsavedChanges');
  const isDirty =
    !submitted &&
    (name !== '' ||
      pgn !== initialPgn ||
      changedAnnotations.length > 0 ||
      changedShapes.length > 0);
  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await addLine({ repertoireId, locale, name: name.trim() || null, pgn });
    if (!result.ok) {
      setPending(false);
      setError(
        KNOWN_LINE_FORM_ERRORS.has(result.error) ? t(`errors.${result.error}`) : t('errors.generic')
      );
      return;
    }

    // Persist notes / markup authored alongside; position-keyed, so they only
    // needed a repertoire (which already existed) — the fresh lineNo merely
    // picks the page these actions revalidate.
    const noteResults = await Promise.all([
      ...changedAnnotations.map(([positionKey, text]) =>
        text.trim()
          ? saveAnnotation({
              repertoireId,
              lineNo: result.lineNo,
              locale,
              positionKey,
              text: text.trim(),
            })
          : deleteAnnotation({ repertoireId, lineNo: result.lineNo, locale, positionKey })
      ),
      ...changedShapes.map(([positionKey, value]) =>
        saveShapes({ repertoireId, positionKey, shapes: value })
      ),
    ]);
    if (noteResults.some((r) => !r.ok)) {
      setPending(false);
      setError(t('errors.generic'));
      return;
    }

    // flushSync so the isDirty -> false re-render completes before
    // router.push triggers the navigation guard (same as ChunkForm).
    flushSync(() => setSubmitted(true));
    router.push(`/repertoires/${repertoireId}/lines/${result.lineNo}?toast=line_added`);
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
          <>
            <RepertoireBoardBuilder
              side={side}
              initialPgn={pgn}
              onPgnChange={setPgn}
              singleLine
              onCursorChange={setCursor}
              shapes={shapes}
              onShapesChange={(positionKey, next) =>
                setShapes((prev) => ({ ...prev, [positionKey]: next }))
              }
            />
            {cursor && (
              <MoveAnnotationField
                moveLabel={cursor.label}
                value={annotations[cursor.positionKey] ?? ''}
                onChange={(next) =>
                  setAnnotations((prev) => ({ ...prev, [cursor.positionKey]: next }))
                }
              />
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
          {pending ? tNew('saving') : tNew('submit')}
        </Button>
        <button
          type="button"
          onClick={() => router.push(`/repertoires/${repertoireId}`)}
          disabled={pending}
          className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
