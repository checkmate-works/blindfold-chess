'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, FormErrorBanner, TextInput, Textarea } from '@/app/_components';
import { UnsavedChangesDialog } from '@/app/_components/UnsavedChangesDialog';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import type { OpeningOption } from '@/lib/repertoires/opening-queries';
import type { RepertoireSide } from '@/lib/repertoires/validation';
import { REPERTOIRE_NAME_MAX } from '@/lib/repertoires/validation';

import { BoardFenTabs } from '@/app/[locale]/(public)/practice/(free-play)/_components/BoardFenTabs';
import { deleteAnnotation } from '@/app/[locale]/(public)/repertoires/[id]/lines/[lineNo]/_actions/deleteAnnotation';
import { saveAnnotation } from '@/app/[locale]/(public)/repertoires/[id]/lines/[lineNo]/_actions/saveAnnotation';
import { saveShapes } from '@/app/[locale]/(public)/repertoires/[id]/lines/[lineNo]/_actions/saveShapes';

import { MoveAnnotationField } from '../../_components/MoveAnnotationField';
import { OpeningLinksField } from '../../_components/OpeningLinksField';
import { RepertoireBoardBuilder } from '../../_components/RepertoireBoardBuilder';
import { updateRepertoire } from '../_actions/updateRepertoire';

type Props = {
  locale: string;
  repertoireId: string;
  initialName: string;
  /** The opening master; empty for a non-opening repertoire (picker hidden). */
  openings: OpeningOption[];
  initialOpeningIds: string[];
  /** Opening links only exist for an `opening`-phase repertoire. */
  canLinkOpenings: boolean;
  /** The repertoire's side — orients the board in board mode. */
  side: RepertoireSide;
  /**
   * The whole move tree as one PGN-with-variations (the lines recomposed via
   * `mergeLinePgns`). `null` when recomposition failed — the moves editor is
   * then hidden and the form falls back to metadata-only editing.
   */
  initialPgn: string | null;
  /** Existing "why this move" notes, keyed by position key. */
  initialAnnotations: Record<string, string>;
  /** Existing board markup (arrows / circles), keyed by position key. */
  initialShapes: Record<string, BoardAnnotations>;
};

/**
 * Owner-only editor for a repertoire: its title, its opening links, and — with
 * the same Board / PGN switcher as the import form — its whole move tree,
 * including per-move notes and board markup. Saving diffs the tree against the
 * stored lines (unchanged lines keep their row + name; removed ones are
 * soft-deleted; new ones inserted), so editing is not a destructive re-import.
 * Side / phase stay fixed: they define what the repertoire IS.
 */
export function EditRepertoireForm({
  locale,
  repertoireId,
  initialName,
  openings,
  initialOpeningIds,
  canLinkOpenings,
  side,
  initialPgn,
  initialAnnotations,
  initialShapes,
}: Props) {
  const t = useTranslations('Repertoires.edit');
  const tForm = useTranslations('Repertoires.form');
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [openingIds, setOpeningIds] = useState<string[]>(initialOpeningIds);
  const [pgn, setPgn] = useState(initialPgn ?? '');
  const [annotations, setAnnotations] = useState<Record<string, string>>(initialAnnotations);
  const [shapes, setShapes] = useState<Record<string, BoardAnnotations>>(initialShapes);
  const [cursor, setCursor] = useState<{ positionKey: string; label: string } | null>(null);
  // Editing an existing repertoire starts on the board — the tree is already
  // there to step through; the PGN tab remains for raw editing.
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
  const pgnChanged = initialPgn !== null && pgn !== initialPgn;

  // Same leave-guard pieces as the import / line edit / chunk forms.
  const tUnsaved = useTranslations('unsavedChanges');
  const isDirty =
    !submitted &&
    (name !== initialName ||
      JSON.stringify([...openingIds].sort()) !== JSON.stringify([...initialOpeningIds].sort()) ||
      pgnChanged ||
      changedAnnotations.length > 0 ||
      changedShapes.length > 0);
  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  const detailHref = `/repertoires/${repertoireId}`;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await updateRepertoire({
      repertoireId,
      locale,
      name,
      openingIds: canLinkOpenings ? openingIds : [],
      // Only re-decompose the lines when the moves actually changed.
      pgn: pgnChanged ? pgn : undefined,
    });
    if (!result.ok) {
      setPending(false);
      const key = `errors.${result.error}`;
      setError(t.has(key) ? t(key) : t('errors.generic'));
      return;
    }

    // Persist the changed per-move notes and board markup. Position-keyed
    // writes are independent; a partial failure leaves the successful ones in
    // place and keeps the page (still dirty) so a retry re-sends the rest.
    // `lineNo: 1` only picks the line page these actions revalidate.
    const noteResults = await Promise.all([
      ...changedAnnotations.map(([positionKey, text]) =>
        text.trim()
          ? saveAnnotation({ repertoireId, lineNo: 1, locale, positionKey, text: text.trim() })
          : deleteAnnotation({ repertoireId, lineNo: 1, locale, positionKey })
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
    router.push(detailHref);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="repertoire-name" className="block text-sm font-medium text-foreground">
          {t('nameLabel')} <span className="text-destructive">*</span>
        </label>
        <TextInput
          id="repertoire-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={REPERTOIRE_NAME_MAX}
          className="mt-1 w-full"
        />
      </div>

      {initialPgn !== null && (
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
              <p className="text-xs text-muted-foreground">{tForm('pgnHelp')}</p>
              <Textarea
                id="repertoire-pgn"
                value={pgn}
                onChange={(e) => setPgn(e.target.value)}
                rows={10}
                inputSize="sm"
                className="font-mono"
                aria-label={tForm('pgnLabel')}
              />
            </>
          ) : (
            /* Remounts on each switch, re-importing whatever the pgn state
               holds — so board → PGN shows the serialized tree and PGN →
               board replays the edited text. */
            <>
              <RepertoireBoardBuilder
                side={side}
                initialPgn={pgn}
                onPgnChange={setPgn}
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
      )}

      {canLinkOpenings && (
        <OpeningLinksField openings={openings} selectedIds={openingIds} onChange={setOpeningIds} />
      )}

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

      <div className="space-y-3">
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
          onClick={() => router.push(detailHref)}
          disabled={pending}
          className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
