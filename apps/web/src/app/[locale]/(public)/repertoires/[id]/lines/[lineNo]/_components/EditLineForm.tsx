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
import { MoveAnnotationField } from '@/app/[locale]/(public)/repertoires/_components/MoveAnnotationField';
import { RepertoireBoardBuilder } from '@/app/[locale]/(public)/repertoires/_components/RepertoireBoardBuilder';

import { deleteAnnotation } from '../_actions/deleteAnnotation';
import { saveAnnotation } from '../_actions/saveAnnotation';
import { saveShapes } from '../_actions/saveShapes';
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
  /**
   * The repertoire's existing board markup (arrows / circles), keyed by
   * position key — displayed and editable on the board in board mode.
   */
  initialShapes: Record<string, BoardAnnotations>;
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
  initialShapes,
}: Props) {
  const t = useTranslations('Repertoires.line.edit');
  const tForm = useTranslations('Repertoires.form');
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [pgn, setPgn] = useState(initialPgn);
  // Per-position "why this move" drafts, edited inline under the board for
  // whichever move the cursor rests on, and persisted on Save alongside the
  // line (notes are position-keyed, so they need no line row to exist).
  const [annotations, setAnnotations] = useState<Record<string, string>>(initialAnnotations);
  const [shapes, setShapes] = useState<Record<string, BoardAnnotations>>(initialShapes);
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
  // Markup that differs from the server's. Shapes are value objects saved
  // wholesale (see saveShapes), so a JSON comparison is the equality we need.
  const changedShapes = Object.entries(shapes).filter(
    ([key, value]) => JSON.stringify(value) !== JSON.stringify(initialShapes[key] ?? null)
  );

  // Same leave-guard pieces as the import / chunk / puzzle forms.
  const tUnsaved = useTranslations('unsavedChanges');
  const isDirty =
    !submitted &&
    (name !== initialName ||
      pgn !== initialPgn ||
      changedAnnotations.length > 0 ||
      changedShapes.length > 0);
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

    // Persist the changed per-move notes and board markup alongside the line.
    // Position-keyed writes are independent of each other and of the line row,
    // so a partial failure leaves the successful ones in place; we stay on the
    // page (still dirty) and a retry re-sends what differs from the load.
    const noteResults = await Promise.all([
      ...changedAnnotations.map(([positionKey, text]) =>
        text.trim()
          ? saveAnnotation({ repertoireId, lineNo, locale, positionKey, text: text.trim() })
          : deleteAnnotation({ repertoireId, lineNo, locale, positionKey })
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
