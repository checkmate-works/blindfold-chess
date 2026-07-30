'use client';

import { useState } from 'react';

import { type BoardAnnotations, EMPTY_BOARD_ANNOTATIONS } from '@/lib/board-annotations/types';
import type { ChunkFeedbackTopic, ChunkStatus } from '@/lib/chunks/validation';

import type { ChunkDraftV1 } from '../_lib/draft-storage';
import type { ChunkLinkTarget } from '../_lib/link-target';

export type ChunkFormInitial = {
  id: string;
  representativeFen: string;
  title: string;
  slug: string;
  description: string | null;
  annotations: BoardAnnotations;
  /**
   * Topics the chunk currently has flagged on the server. Used to
   * pre-populate the checkbox group on the edit form so the author can
   * see (and tweak) the same set the detail-page callout is
   * displaying.
   */
  feedbackTopics: readonly ChunkFeedbackTopic[];
};

/**
 * Field state for the chunk authoring form: values, setters, the
 * create-mode blank reset, draft rehydration, and the mode-aware dirty
 * check. The board position itself lives in `useFenBoardEditor`; this hook
 * owns everything else the form edits.
 */
export function useChunkFormState({
  mode,
  initial,
  initialLinkTarget,
}: {
  mode: 'create' | 'edit';
  initial?: ChunkFormInitial;
  /**
   * Game move the create flow was seeded from (`?game=&ply=`). Not an
   * editable field — provenance the form carries so the preview can hand
   * it to the create action — but it lives here because every place that
   * rewrites the form's state (draft restore, Start over) has to move it
   * in lock-step with the position it describes.
   */
  initialLinkTarget?: ChunkLinkTarget;
}) {
  const [title, setTitle] = useState(mode === 'edit' && initial ? initial.title : '');
  const [slug, setSlug] = useState(mode === 'edit' && initial ? initial.slug : '');
  const [description, setDescription] = useState(
    mode === 'edit' && initial ? (initial.description ?? '') : ''
  );
  const [annotations, setAnnotations] = useState<BoardAnnotations>(
    mode === 'edit' && initial ? initial.annotations : EMPTY_BOARD_ANNOTATIONS
  );
  // The "Save as draft" toggle drives this. Create defaults to 'published'
  // (checkbox unchecked). Edit can only run against an already-draft row
  // (the page guard blocks published chunks from reaching this form), so it
  // seeds 'draft' — the checkbox starts checked, and unchecking it routes
  // the preview to Publish, matching the create flow.
  const [status, setStatus] = useState<ChunkStatus>(mode === 'edit' ? 'draft' : 'published');
  const [feedbackTopics, setFeedbackTopics] = useState<ChunkFeedbackTopic[]>(
    mode === 'edit' && initial ? [...initial.feedbackTopics] : []
  );
  const [linkTarget, setLinkTarget] = useState<ChunkLinkTarget | undefined>(
    mode === 'create' ? initialLinkTarget : undefined
  );

  /** Reset every field to the create-mode blank state (Start over). */
  function resetFields() {
    setTitle('');
    setSlug('');
    setDescription('');
    setAnnotations(EMPTY_BOARD_ANNOTATIONS);
    setStatus('published');
    setFeedbackTopics([]);
    // Start over also clears the board, so the position the link target
    // describes is gone — keeping it would auto-link a game move to a
    // chunk about some other position entirely.
    setLinkTarget(undefined);
  }

  /** Apply a recovered sessionStorage draft's non-board fields. */
  function applyDraft(draft: ChunkDraftV1) {
    setTitle(draft.title);
    setSlug(draft.slug);
    setDescription(draft.description);
    setAnnotations(draft.annotations);
    setStatus(draft.status);
    setFeedbackTopics(draft.feedbackTopics);
    // The draft's own provenance wins: on the preview's "Back to edit"
    // round-trip the `?game=&ply=` params are gone from the URL, so the
    // stored value is the only surviving record of where this came from.
    setLinkTarget(draft.linkTarget);
  }

  /**
   * Whether the form deviates from its seed: any non-empty field in create
   * mode, any changed field against the server row in edit mode. The board
   * FEN is passed in because it lives in the board editor hook.
   */
  function computeIsDirty(trimmedFen: string): boolean {
    if (mode === 'create') {
      return (
        trimmedFen !== '' || title.trim() !== '' || slug.trim() !== '' || description.trim() !== ''
      );
    }
    if (!initial) return false;
    return (
      trimmedFen !== initial.representativeFen ||
      title !== initial.title ||
      slug !== initial.slug ||
      description !== (initial.description ?? '') ||
      // Unchecking "Save as draft" (intent to publish) is a pending change
      // too — the edit row is always seeded 'draft'.
      status !== 'draft'
    );
  }

  return {
    title,
    setTitle,
    slug,
    setSlug,
    description,
    setDescription,
    annotations,
    setAnnotations,
    status,
    setStatus,
    feedbackTopics,
    setFeedbackTopics,
    linkTarget,
    resetFields,
    applyDraft,
    computeIsDirty,
  };
}

export type ChunkFormState = ReturnType<typeof useChunkFormState>;
