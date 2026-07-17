'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Textarea } from '@/app/_components';

import { REPERTOIRE_ANNOTATION_MAX } from '@/lib/repertoires/validation';

import { GameCommentBody } from '@/app/[locale]/(public)/games/shared/[id]/_components/GameCommentBody';
import type { MoveNotationLine } from '@/app/[locale]/(public)/topics/_lib/move-notation';

import { deleteAnnotation } from '../_actions/deleteAnnotation';
import { saveAnnotation } from '../_actions/saveAnnotation';

/**
 * How long an edit sits before it is persisted — matching the board markup's
 * autosave (see `use-shape-autosave`): long enough to not save every
 * keystroke, short enough that navigating away still lands it (unmount
 * flushes whatever is pending).
 */
const SAVE_DEBOUNCE_MS = 800;

type Props = {
  repertoireId: string;
  lineNo: number;
  locale: string;
  /** Normalised FEN of the position reached by this move (the annotation key). */
  positionKey: string;
  /** The move this note explains, e.g. "3. d4" — for the heading. */
  moveLabel: string;
  initialText: string | null;
  /**
   * The line's moves, so a note that cites a move by number ("1... e4") renders
   * it as a board-preview link — the same treatment comments get.
   */
  moveNotation: MoveNotationLine;
  isOwner: boolean;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * The owner-authored "why this move" note for the selected move (the Chessable
 * right-panel idea). Read-only for everyone else; the owner gets the same
 * inline always-editable field the import / line edit forms use — no
 * add/edit-mode chips. On this page there is no form to submit, so edits
 * autosave like the board markup does (debounced, flushed on unmount); an
 * emptied note is a deletion. Remounted per move (keyed on positionKey by the
 * parent), so state resets cleanly when navigating between moves.
 */
export function AnnotationPanel({
  repertoireId,
  lineNo,
  locale,
  positionKey,
  moveLabel,
  initialText,
  moveNotation,
  isOwner,
}: Props) {
  const t = useTranslations('Repertoires.line.annotation');
  const [text, setText] = useState(initialText ?? '');
  const [status, setStatus] = useState<SaveStatus>('idle');

  // The draft awaiting persistence (null = nothing pending) + its timer.
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // What the server currently holds, so a no-op edit (type + revert) is not
  // written, and an emptied note is only deleted when one actually exists.
  const savedRef = useRef((initialText ?? '').trim());

  function persist(draft: string) {
    const value = draft.trim();
    if (value === savedRef.current) {
      setStatus((s) => (s === 'saving' ? 'idle' : s));
      return;
    }
    setStatus('saving');
    const write = value
      ? saveAnnotation({ repertoireId, lineNo, locale, positionKey, text: value })
      : deleteAnnotation({ repertoireId, lineNo, locale, positionKey });
    void write.then((result) => {
      if (result.ok) {
        savedRef.current = value;
        setStatus('saved');
      } else {
        setStatus('error');
      }
    });
  }

  function handleChange(next: string) {
    setText(next);
    pendingRef.current = next;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const draft = pendingRef.current;
      pendingRef.current = null;
      if (draft !== null) persist(draft);
    }, SAVE_DEBOUNCE_MS);
  }

  // Flush the pending draft on unmount (move navigation / page leave) — an
  // un-awaited Server Action survives the unmount, a lost edit doesn't. The
  // status updates inside persist() are harmless no-ops after unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const draft = pendingRef.current;
      pendingRef.current = null;
      if (draft !== null && draft.trim() !== savedRef.current) {
        const value = draft.trim();
        void (value
          ? saveAnnotation({ repertoireId, lineNo, locale, positionKey, text: value })
          : deleteAnnotation({ repertoireId, lineNo, locale, positionKey }));
      }
    };
    // Save params are fixed for this mount (remounted per positionKey).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const heading = (
    <h3 className="text-xs font-semibold text-muted-foreground">
      {t('title')} · <span className="text-foreground">{moveLabel}</span>
    </h3>
  );

  // Non-owner: show the note when present — plain text, except that a move
  // cited by number ("1... e4") becomes a board-preview link — else nothing.
  if (!isOwner) {
    if (!initialText) return null;
    return (
      <section className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
        {heading}
        <p className="whitespace-pre-wrap text-foreground">
          <GameCommentBody
            text={initialText}
            locale={locale}
            moves={moveNotation.moves}
            startingFen={moveNotation.startingFen}
            playerColor={moveNotation.playerColor}
          />
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-baseline justify-between gap-2">
        {heading}
        <span
          aria-live="polite"
          className={`text-xs ${status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {status === 'saving'
            ? t('saving')
            : status === 'saved'
              ? t('saved')
              : status === 'error'
                ? t('error')
                : ''}
        </span>
      </div>
      <Textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={3}
        maxLength={REPERTOIRE_ANNOTATION_MAX}
        placeholder={t('placeholder')}
        aria-label={t('title')}
      />
      <p className="text-xs text-muted-foreground">{t('autosaveHelp')}</p>
    </section>
  );
}
