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
import { deleteAnnotation } from '@/app/[locale]/(public)/repertoires/[id]/lines/[lineNo]/_actions/deleteAnnotation';
import { saveAnnotation } from '@/app/[locale]/(public)/repertoires/[id]/lines/[lineNo]/_actions/saveAnnotation';
import { saveShapes } from '@/app/[locale]/(public)/repertoires/[id]/lines/[lineNo]/_actions/saveShapes';
import { MoveAnnotationField } from '@/app/[locale]/(public)/repertoires/_components/MoveAnnotationField';
import { RepertoireBoardBuilder } from '@/app/[locale]/(public)/repertoires/_components/RepertoireBoardBuilder';

/**
 * Outcome of persisting the line row itself. On success the caller names the
 * URL to land on — appending a line needs the server-assigned `lineNo` that
 * only the action knows, so the destination cannot be derived up front.
 */
export type SaveLineResult = { ok: true; nextHref: string } | { ok: false; error: string };

type Props = {
  repertoireId: string;
  /** The repertoire's side — orients the board in board mode. */
  side: RepertoireSide;
  /** Prefills the title field. Empty when appending a new line. */
  initialName: string;
  /**
   * Moves to start from — the stored line when editing, or a handed-in line
   * when appending (e.g. a kata check's uncovered line, via `?pgn=`).
   */
  initialPgn: string;
  /**
   * Existing "why this move" notes, keyed by position key. Positions already
   * annotated by other lines of the same repertoire show their notes here.
   */
  initialAnnotations: Record<string, string>;
  /** Existing board markup (arrows / circles), keyed by position key. */
  initialShapes: Record<string, BoardAnnotations>;
  /** Where Cancel navigates. */
  cancelHref: string;
  submitLabels: { idle: string; saving: string };
  /** Persists the line row. Notes and markup are saved by this component. */
  saveLine: (input: { name: string | null; pgn: string }) => Promise<SaveLineResult>;
};

/**
 * Owner-only editor for a single repertoire line: its title and its moves.
 * The moves are editable two ways behind the same Board / PGN switcher as the
 * import form — an interactive board (in single-line mode a divergent move
 * replaces the tail, since a line holds no branches) or the raw PGN textbox.
 *
 * Shared by the create and edit pages, which differ only in where they
 * navigate and which action writes the line row; everything else — the
 * dirty-tracking, the leave guard, the note / markup diffing and persistence,
 * and the error mapping — is the same on both, and used to exist twice.
 *
 * Notes and board markup are position-keyed, so they need no line row to
 * exist and follow the surviving positions with no migration on save.
 */
export function LineForm({
  repertoireId,
  side,
  initialName,
  initialPgn,
  initialAnnotations,
  initialShapes,
  cancelHref,
  submitLabels,
  saveLine,
}: Props) {
  const t = useTranslations('Repertoires.line.edit');
  const tForm = useTranslations('Repertoires.form');
  const tUnsaved = useTranslations('unsavedChanges');
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [pgn, setPgn] = useState(initialPgn);
  // Per-position "why this move" drafts, edited inline under the board for
  // whichever move the cursor rests on, and persisted on Save alongside the
  // line (notes are position-keyed, so they need no line row to exist).
  const [annotations, setAnnotations] = useState<Record<string, string>>(initialAnnotations);
  const [shapes, setShapes] = useState<Record<string, BoardAnnotations>>(initialShapes);
  const [cursor, setCursor] = useState<{ positionKey: string; label: string } | null>(null);
  // Opens on the board: the moves handed in are the point of both pages —
  // the stored line when editing, the prefilled line when appending. The PGN
  // tab remains for raw editing.
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

  // Same leave-guard pieces as the import / chunk / puzzle forms. A prefilled
  // pgn doesn't count as dirty — leaving without touching anything is fine.
  const isDirty =
    !submitted &&
    (name !== initialName ||
      pgn !== initialPgn ||
      changedAnnotations.length > 0 ||
      changedShapes.length > 0);
  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await saveLine({ name: name.trim() || null, pgn });
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
          ? saveAnnotation({ repertoireId, positionKey, text: text.trim() })
          : deleteAnnotation({ repertoireId, positionKey })
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
    router.push(result.nextHref);
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

      <div className="space-y-4">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={pending}
          disabled={pending}
        >
          {pending ? submitLabels.saving : submitLabels.idle}
        </Button>
        <button
          type="button"
          onClick={() => router.push(cancelHref)}
          disabled={pending}
          className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
