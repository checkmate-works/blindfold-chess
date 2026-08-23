'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { useSubmitError } from '@/_hooks/useSubmitError';
import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import {
  Button,
  FormActionFooter,
  FormErrorBanner,
  LocalizedUnsavedChangesDialog,
} from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { validateFenStructure } from '@blindfold-chess/features/chess-core';
import { flushSync } from 'react-dom';

import { useFenBoardEditor } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { DraftRestoredBanner } from '@/app/[locale]/_components/DraftRestoredBanner';

import { checkSlugAvailability } from '../_actions/checkSlugAvailability';
import { useChunkDraftRecovery } from '../_hooks/use-chunk-draft-recovery';
import { type ChunkFormInitial, useChunkFormState } from '../_hooks/use-chunk-form-state';
import { type ChunkFormField, validateChunkForm } from '../_lib/chunk-form-validation';
import { type ChunkDraftV1, clearChunkDraft, writeChunkDraft } from '../_lib/draft-storage';
import type { ChunkLinkTarget } from '../_lib/link-target';
import { ChunkFormFields } from './ChunkFormFields';

export type { ChunkFormInitial } from '../_hooks/use-chunk-form-state';

/** DOM ids a rejected submit focuses, per field. */
const FIELD_ANCHOR_IDS: Record<ChunkFormField, string> = {
  fen: 'chunk-fen',
  title: 'chunk-title',
  slug: 'chunk-slug',
  description: 'chunk-description',
};

type CreateProps = {
  mode: 'create';
  /**
   * Skip the unsaved-changes navigation guard. Set when the form is
   * rendered behind a guest sign-up overlay so the overlay's CTAs are
   * not blocked by a confirm dialog the guest didn't summon.
   */
  disableUnsavedGuard?: boolean;
  /**
   * Seed the board with this position when entering the create form
   * (e.g. "create a chunk from this game position", passed via `?fen=`).
   * Already validated server-side. Takes precedence over any stored
   * draft — see `useChunkDraftRecovery`.
   */
  injectedFen?: string;
  /**
   * The game move the injected position came from (`?game=&ply=`). Written
   * into the draft so the preview's create call can link the new chunk back
   * to that move. Tied to `injectedFen`: it is only meaningful for the
   * position it accompanies, so a draft restored over the injected seed
   * carries its own target (or none) rather than inheriting this one.
   */
  injectedLinkTarget?: ChunkLinkTarget;
};

type EditProps = {
  mode: 'edit';
  initial: ChunkFormInitial;
  disableUnsavedGuard?: boolean;
};

type Props = CreateProps | EditProps;

const validateFenForChunks = (fen: string) => validateFenStructure(fen).ok;

/**
 * Form shell for chunk authoring. The pieces live in focused modules:
 * field state + dirty check in `useChunkFormState`, sessionStorage draft
 * recovery in `useChunkDraftRecovery`, and the submit validation gate in
 * `validateChunkForm`. This component wires them to the markup.
 *
 * Both modes hand off through the same confirmation page: submit writes
 * a `ChunkDraftV1` to sessionStorage and navigates to a preview, where
 * the `Server Action` that actually persists lives (the sessionStorage
 * handoff can't be read on the server).
 *
 * - **Create**: navigates to `/chunks/new/preview`; the preview calls
 *   `createChunk`.
 * - **Edit**: navigates to `/chunks/<slug>/edit/preview`; the preview
 *   calls `updateChunk` — and Publish when the "Save as draft" toggle is
 *   off, exactly like create. The draft carries the row id + starting
 *   slug (`draft.edit`) so the preview can resolve the post-save target
 *   slug (draft chunks allow slug renames). Delete is NOT offered here —
 *   it lives on the detail page's "⋯" owner menu (`ChunkDeleteButton`),
 *   the one surface that also covers published chunks (which 404 here).
 *
 * Annotations are NOT user-editable from this form yet. Newly-created
 * chunks store the empty shape (the DB default); edits leave whatever
 * value was previously written untouched by omitting the column from
 * the update payload (drizzle treats `undefined` as "skip").
 */
export function ChunkForm(props: Props) {
  const { mode, disableUnsavedGuard = false } = props;
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('chunks.form');

  // Latched at mount: `true` when the author arrived from the preview's
  // "Back to edit" (`?resumed=1`) rather than a cold visit. Distinguishes
  // an intentional round-trip — where the draft restore is expected and
  // the banner would be noise — from a genuine fresh restore. Latched via
  // ref so stripping the marker below doesn't flip it and reveal the
  // banner. Mirrors the puzzle authoring flow.
  const resumedRef = useRef(searchParams.get('resumed') === '1');
  const resumed = resumedRef.current;

  // Strip the marker so it isn't bookmarked or re-read on refresh.
  useEffect(() => {
    if (!resumed) return;
    const base =
      mode === 'edit' ? `/chunks/${(props as EditProps).initial.slug}/edit` : '/chunks/new';
    router.replace(base as '/chunks/[slug]');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A position injected via `?fen=` (create mode only) seeds the board and
  // takes precedence over any stored draft (handled in the recovery hook).
  const injectedFen = props.mode === 'create' ? props.injectedFen : undefined;
  const initialFen = mode === 'edit' ? props.initial.representativeFen : injectedFen;

  const board = useFenBoardEditor({
    initialFen,
    validate: validateFenForChunks,
  });

  const form = useChunkFormState({
    mode,
    initial: mode === 'edit' ? props.initial : undefined,
    initialLinkTarget: props.mode === 'create' ? props.injectedLinkTarget : undefined,
  });
  const {
    title,
    slug,
    description,
    annotations,
    status,
    feedbackTopics,
    linkTarget,
    setAnnotations,
    setStatus,
    setFeedbackTopics,
  } = form;

  const [submitted, setSubmitted] = useState(false);
  const [startOverOpen, setStartOverOpen] = useState(false);
  // In-flight slug preflight (see `handleSubmit`). Only guards against a
  // double submit while the round trip is out — every *validation* verdict
  // still reaches the author through `submitError`, never through a
  // silently inert button.
  const [checkingSlug, setCheckingSlug] = useState(false);

  // The FEN rule can fail from either position tab, so on the board tab
  // it anchors on the position section wrapper — the raw FEN textarea
  // isn't mounted there.
  const submitError = useSubmitError<ChunkFormField>((field) =>
    field === 'fen' && board.activeTab === 'board' ? 'chunk-position' : FIELD_ANCHOR_IDS[field]
  );

  const { hydratedFromDraft, setHydratedFromDraft } = useChunkDraftRecovery({
    mode,
    injectedFen,
    editChunkId: mode === 'edit' ? props.initial.id : undefined,
    resumed,
    board,
    form,
  });

  const isDirty = !submitted && form.computeIsDirty(board.trimmedFen);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({
    isDirty: disableUnsavedGuard ? false : isDirty,
  });

  function handleStartOver() {
    clearChunkDraft();
    board.resetBoard();
    form.resetFields();
    submitError.clear();
    setHydratedFromDraft(false);
    setStartOverOpen(false);
  }

  // flushSync so the isDirty -> false re-render completes before
  // router.push triggers the navigation guard.
  function navigateAfterSubmit(path: string) {
    flushSync(() => setSubmitted(true));
    router.push(path as '/chunks/[slug]');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (checkingSlug) return;
    submitError.clear();

    const invalid = validateChunkForm({
      isFenValid: board.isFenValid,
      title,
      slug,
      status,
      description,
    });
    if (invalid) {
      submitError.report(invalid.field, t(invalid.key, invalid.values));
      return;
    }

    // A slug collision is the one submit-blocking rule the client can't
    // answer on its own, so it used to surface at the preview's Confirm —
    // two steps away from the field at fault, in a banner, with the input
    // no longer on screen. Asking the server here puts the same verdict on
    // the slug control alongside every other rejection.
    //
    // Skipped in edit mode when the slug is untouched: the row's own slug
    // is trivially "taken", and `saveChunkEdit` omits an unchanged slug
    // from its payload anyway.
    const trimmedSlug = slug.trim();
    if (props.mode === 'create' || trimmedSlug !== props.initial.slug) {
      setCheckingSlug(true);
      try {
        const { available } = await checkSlugAvailability(trimmedSlug);
        if (!available) {
          submitError.report('slug', t('errors.slugTaken'));
          return;
        }
      } catch {
        // Preflight only — a failed round trip must not strand an
        // otherwise valid draft on the form. The create / update actions
        // re-check under the DB's UNIQUE constraint, so a collision that
        // slips through here is still caught at the preview.
      } finally {
        setCheckingSlug(false);
      }
    }

    // Both modes hand off to a confirmation page: create persists via
    // `/chunks/new/preview`, edit via `/chunks/<slug>/edit/preview`. The
    // draft is the handoff channel for both — the preview reads it,
    // renders it for review, and only then calls the mutation (and, when
    // the draft toggle is off, Publish). Edit drafts carry the row id +
    // starting slug so the preview can call `updateChunk` and resolve the
    // (possibly renamed) target slug.
    const draft: ChunkDraftV1 = {
      version: 1,
      representativeFen: board.trimmedFen,
      title,
      slug,
      description,
      annotations,
      status,
      feedbackTopics,
      ...(mode === 'edit'
        ? { edit: { chunkId: props.initial.id, initialSlug: props.initial.slug } }
        : {}),
      ...(linkTarget ? { linkTarget } : {}),
      activeTab: board.activeTab,
      sideToMove: board.sideToMove,
      flipped: board.flipped,
      userFlipped: board.userFlipped,
    };

    const ok = writeChunkDraft(draft);
    if (!ok) {
      submitError.report(null, t('errors.draftWriteFailed'));
      return;
    }

    navigateAfterSubmit(
      mode === 'create' ? '/chunks/new/preview' : `/chunks/${props.initial.slug}/edit/preview`
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/*
         * Form-wide errors only — anything attributable to a control is
         * rendered against that control instead, so the same sentence
         * never appears twice.
         */}
        <FormErrorBanner ref={submitError.summaryRef} message={submitError.formMessage} />

        {hydratedFromDraft && mode === 'create' && !resumed && (
          <DraftRestoredBanner
            message={t('draftRestoredBanner')}
            discardLabel={t('draftRestoredDiscard')}
            onDiscard={() => setStartOverOpen(true)}
          />
        )}

        <ChunkFormFields
          board={board}
          title={title}
          onTitleChange={form.setTitle}
          description={description}
          onDescriptionChange={form.setDescription}
          slug={slug}
          onSlugChange={form.setSlug}
          annotations={annotations}
          onAnnotationsChange={setAnnotations}
          status={status}
          onStatusChange={setStatus}
          feedbackTopics={feedbackTopics}
          onFeedbackTopicsChange={setFeedbackTopics}
          mode={mode}
          pending={checkingSlug}
          messageFor={submitError.messageFor}
        />

        <FormActionFooter
          cancel={
            // Abandon editing and return to the detail page. A plain
            // `router.push` (not a <Link>) so the unsaved-changes guard
            // still intercepts when there are pending edits. Create mode has
            // nothing to return to, so it renders no cancel at all.
            mode === 'edit'
              ? {
                  label: t('actions.cancel'),
                  onClick: () => router.push(`/chunks/${props.initial.slug}` as '/chunks/[slug]'),
                }
              : undefined
          }
        >
          {/*
           * Deliberately never disabled *by validation state*: a disabled
           * submit is silent about *why* it won't move, which is the same
           * dead-end as an off-screen error. Pressing it runs
           * `validateChunkForm` and puts the author on the offending field
           * with an explanation. The only thing that holds it is the slug
           * preflight already in flight, and that says so with a spinner.
           */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={checkingSlug}
            loading={checkingSlug}
          >
            {t('actions.continueToPreview')}
          </Button>
        </FormActionFooter>
      </form>

      <ConfirmationModal
        isOpen={startOverOpen}
        title={t('startOverConfirmTitle')}
        message={t('startOverConfirmMessage')}
        confirmText={t('startOverConfirm')}
        cancelText={t('startOverCancel')}
        confirmVariant="danger"
        onConfirm={handleStartOver}
        onCancel={() => setStartOverOpen(false)}
      />

      <LocalizedUnsavedChangesDialog open={isBlocking} onConfirm={confirm} onCancel={cancel} />
    </>
  );
}
