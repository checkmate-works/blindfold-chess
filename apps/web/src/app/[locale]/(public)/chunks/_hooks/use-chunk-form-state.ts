'use client';

import { useState } from 'react';

import { type BoardAnnotations, EMPTY_BOARD_ANNOTATIONS } from '@/lib/board-annotations/types';
import type { ChunkFeedbackTopic, ChunkStatus } from '@/lib/chunks/validation';

import type { ChunkDraftV1 } from '../_lib/draft-storage';

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
}: {
  mode: 'create' | 'edit';
  initial?: ChunkFormInitial;
}) {
  const [title, setTitle] = useState(mode === 'edit' && initial ? initial.title : '');
  const [slug, setSlug] = useState(mode === 'edit' && initial ? initial.slug : '');
  const [description, setDescription] = useState(
    mode === 'edit' && initial ? (initial.description ?? '') : ''
  );
  const [annotations, setAnnotations] = useState<BoardAnnotations>(
    mode === 'edit' && initial ? initial.annotations : EMPTY_BOARD_ANNOTATIONS
  );
  // The lifecycle toggle is only meaningful in create mode, where it
  // defaults to 'published' (the draft checkbox is unchecked by default).
  // Edit mode can only run against an already-draft row (the page guard
  // blocks published chunks from reaching this form) and never surfaces
  // the toggle, so this value is unused there.
  const [status, setStatus] = useState<ChunkStatus>('published');
  const [feedbackTopics, setFeedbackTopics] = useState<ChunkFeedbackTopic[]>(
    mode === 'edit' && initial ? [...initial.feedbackTopics] : []
  );

  /** Reset every field to the create-mode blank state (Start over). */
  function resetFields() {
    setTitle('');
    setSlug('');
    setDescription('');
    setAnnotations(EMPTY_BOARD_ANNOTATIONS);
    setStatus('published');
    setFeedbackTopics([]);
  }

  /** Apply a recovered sessionStorage draft's non-board fields. */
  function applyDraft(draft: ChunkDraftV1) {
    setTitle(draft.title);
    setSlug(draft.slug);
    setDescription(draft.description);
    setAnnotations(draft.annotations);
    setStatus(draft.status);
    setFeedbackTopics(draft.feedbackTopics);
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
      description !== (initial.description ?? '')
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
    resetFields,
    applyDraft,
    computeIsDirty,
  };
}

export type ChunkFormState = ReturnType<typeof useChunkFormState>;
