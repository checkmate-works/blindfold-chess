'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useSubmitError } from '@/_hooks/useSubmitError';
import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import {
  Button,
  FieldError,
  FormActionFooter,
  FormErrorBanner,
  TextInput,
  Textarea,
  fieldErrorProps,
} from '@/app/_components';
import { UnsavedChangesDialog } from '@/app/_components/UnsavedChangesDialog';
import { INPUT_BASE_CLASSES, invalidBorderClasses } from '@/app/_components/inputStyles';
import { useRouter } from '@/i18n/routing';
import type { Side } from '@blindfold-chess/types';
import { flushSync } from 'react-dom';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import type { RepertoireFormField } from '@/lib/repertoires/form-error-fields';
import { repertoireErrorField } from '@/lib/repertoires/form-error-fields';
import { KNOWN_LINE_FORM_ERRORS } from '@/lib/repertoires/line-form-errors';

import { BoardFenTabs } from '@/app/[locale]/(public)/practice/(free-play)/_components/BoardFenTabs';
import { deleteAnnotation } from '@/app/[locale]/(public)/repertoires/[id]/lines/[lineNo]/_actions/deleteAnnotation';
import { saveAnnotation } from '@/app/[locale]/(public)/repertoires/[id]/lines/[lineNo]/_actions/saveAnnotation';
import { saveShapes } from '@/app/[locale]/(public)/repertoires/[id]/lines/[lineNo]/_actions/saveShapes';
import { MoveAnnotationField } from '@/app/[locale]/(public)/repertoires/_components/MoveAnnotationField';
import { RepertoireBoardBuilder } from '@/app/[locale]/(public)/repertoires/_components/RepertoireBoardBuilder';
import { PgnDiagnosisHint } from '@/app/[locale]/_components/PgnDiagnosisHint';

/**
 * Outcome of persisting the line row itself. On success the caller names the
 * URL to land on — appending a line needs the server-assigned `lineNo` that
 * only the action knows, so the destination cannot be derived up front.
 */
export type SaveLineResult = { ok: true; nextHref: string } | { ok: false; error: string };

/**
 * The controls this form renders a rejection against. The chapter picker is
 * only mounted when the course HAS chapters, so it is added conditionally —
 * a message anchored to a control that never renders is a message never read.
 */
const FIELDS: readonly RepertoireFormField[] = ['name', 'moves'];
const FIELDS_WITH_CHAPTER: readonly RepertoireFormField[] = [...FIELDS, 'chapter'];

type Props = {
  repertoireId: string;
  /** The repertoire's side — orients the board in board mode. */
  side: Side;
  /** Prefills the title field. Empty when appending a new line. */
  initialName: string;
  /**
   * The repertoire's chapters, in display order. Empty when the course has
   * none — the picker is then hidden rather than offered with "unfiled" as its
   * only choice, since chapters are created on the arrange page.
   */
  chapters: readonly { id: string; name: string }[];
  /** The chapter the line is filed under; null is the unfiled bucket. */
  initialChapterId: string | null;
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
  saveLine: (input: {
    name: string | null;
    chapterId: string | null;
    pgn: string;
  }) => Promise<SaveLineResult>;
};

/**
 * Owner-only editor for a single repertoire line: its title, the chapter it is
 * filed under, and its moves.
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
  chapters,
  initialChapterId,
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
  // '' is the unfiled bucket — <option value=""> cannot carry null, and the
  // empty string is not a chapter id either way.
  const [chapterId, setChapterId] = useState(initialChapterId ?? '');
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
  const [submitted, setSubmitted] = useState(false);

  // A rejected save is reported against the control at fault and focuses it —
  // same rule as the import / chunk forms, and it matters just as much here:
  // the board editor alone is taller than a phone screen, so a message beside
  // the button says nothing about the moves it is complaining about. The moves
  // editor anchors on its section wrapper while the board tab is up, since the
  // PGN textarea isn't mounted there.
  const submitError = useSubmitError<RepertoireFormField>((field) => {
    if (field === 'name') return 'line-name';
    if (field === 'chapter') return 'line-chapter';
    return inputMode === 'board' ? 'line-moves' : 'line-pgn';
  });
  const nameError = submitError.messageFor('name');
  const chapterError = submitError.messageFor('chapter');
  const movesError = submitError.messageFor('moves');

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
      chapterId !== (initialChapterId ?? '') ||
      pgn !== initialPgn ||
      changedAnnotations.length > 0 ||
      changedShapes.length > 0);
  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    submitError.clear();

    const result = await saveLine({ name: name.trim() || null, chapterId: chapterId || null, pgn });
    if (!result.ok) {
      setPending(false);
      const known = KNOWN_LINE_FORM_ERRORS.has(result.error);
      submitError.report(
        known
          ? repertoireErrorField(result.error, chapters.length > 0 ? FIELDS_WITH_CHAPTER : FIELDS)
          : null,
        known ? t(`errors.${result.error}`) : t('errors.generic')
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
      // Note / markup writes belong to no single control (they span every
      // annotated position), so this one stays form-level.
      submitError.report(null, t('errors.generic'));
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
          invalid={nameError !== null}
          {...fieldErrorProps('line-name-error', nameError)}
        />
        <FieldError id="line-name-error" message={nameError} />
      </div>

      {/* Only once the course HAS chapters. Creating them stays on the arrange
          page — this picker files a line among the sections that already
          exist, which is the part the author knows while writing the line.
          Where it sits INSIDE the chosen chapter is the arrange page's job
          too; saving appends it to the end. */}
      {chapters.length > 0 && (
        <div>
          <label htmlFor="line-chapter" className="block text-sm font-medium text-foreground">
            {t('chapterLabel')}
          </label>
          <select
            id="line-chapter"
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            className={`${invalidBorderClasses(INPUT_BASE_CLASSES, chapterError !== null)} mt-1`}
            {...fieldErrorProps('line-chapter-error', chapterError)}
          >
            <option value="">{t('chapterUnfiled')}</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name}
              </option>
            ))}
          </select>
          <FieldError id="line-chapter-error" message={chapterError} />
        </div>
      )}

      {/* `id` + `tabIndex` make the whole moves block a focus target: a
          rejection about the moves can land while the board tab is up, where
          there is no textarea to focus. See `submitError` above. */}
      <div
        id="line-moves"
        tabIndex={-1}
        role="group"
        aria-label={tForm('movesLabel')}
        aria-describedby={movesError && inputMode === 'board' ? 'line-pgn-error' : undefined}
        className="space-y-2"
      >
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
              invalid={movesError !== null}
              {...fieldErrorProps('line-pgn-error', movesError)}
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
        {/* Outside the mode branch on purpose: board mode is where an
            unreadable PGN is hardest to notice (the builder just shows the
            starting position), so the reason has to be visible there too. It
            doubles as the moves editor's error slot — the submit rejection
            shows here when the live diagnosis has nothing more specific. */}
        <PgnDiagnosisHint pgn={pgn} id="line-pgn-error" fallbackMessage={movesError} />
      </div>

      {/* Form-wide errors only — anything attributable to a control is
          rendered against that control instead. */}
      <FormErrorBanner ref={submitError.summaryRef} message={submitError.formMessage} />

      <UnsavedChangesDialog
        open={isBlocking}
        onConfirm={confirm}
        onCancel={cancel}
        title={tUnsaved('title')}
        message={tUnsaved('message')}
        confirmLabel={tUnsaved('confirm')}
        cancelLabel={tUnsaved('cancel')}
      />

      <FormActionFooter
        cancel={{ label: t('cancel'), onClick: () => router.push(cancelHref), disabled: pending }}
      >
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
      </FormActionFooter>
    </form>
  );
}
