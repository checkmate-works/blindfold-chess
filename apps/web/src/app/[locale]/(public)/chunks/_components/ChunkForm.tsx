'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { validateFenStructure } from '@blindfold-chess/features/chess-core';

import { BoardAnnotationEditor } from '@/lib/board-annotations/BoardAnnotationEditor';
import { type BoardAnnotations, EMPTY_BOARD_ANNOTATIONS } from '@/lib/board-annotations/types';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { createChunk } from '../_actions/createChunk';
import { deleteChunk } from '../_actions/deleteChunk';
import { updateChunk } from '../_actions/updateChunk';

export type ChunkFormInitial = {
  id: string;
  representativeFen: string;
  title: string;
  slug: string;
  description: string | null;
  annotations?: BoardAnnotations;
};

type Props = {
  mode: 'create' | 'edit';
  initial?: ChunkFormInitial;
  /**
   * Skip the unsaved-changes navigation guard. Set when the form is
   * rendered behind a guest sign-up overlay so the overlay's CTAs are
   * not blocked by a confirm dialog the guest didn't summon.
   */
  disableUnsavedGuard?: boolean;
};

/**
 * Slug normalizer used by the "Generate from title" button. Mirrors the
 * pattern enforced by `validateChunkMutationData`: lowercase ASCII
 * alphanumerics joined by single hyphens, no leading / trailing hyphen.
 */
function deriveSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function ChunkForm({ mode, initial, disableUnsavedGuard = false }: Props) {
  const router = useRouter();
  const t = useTranslations('chunks.form');

  const [representativeFen, setRepresentativeFen] = useState(initial?.representativeFen ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [annotations, setAnnotations] = useState<BoardAnnotations>(
    initial?.annotations ?? EMPTY_BOARD_ANNOTATIONS
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Structural validation only — chunks are piece-coordination patterns
  // that may legitimately omit kings, so we deliberately do NOT use the
  // chess.js legality check here.
  const trimmedFen = representativeFen.trim();
  const isFenValid = trimmedFen !== '' && validateFenStructure(trimmedFen).ok;

  const isDirty =
    !submitted &&
    (mode === 'create'
      ? representativeFen.trim() !== '' ||
        title.trim() !== '' ||
        slug.trim() !== '' ||
        description.trim() !== '' ||
        annotations.arrows.length > 0 ||
        annotations.circles.length > 0
      : representativeFen !== (initial?.representativeFen ?? '') ||
        title !== (initial?.title ?? '') ||
        description !== (initial?.description ?? '') ||
        JSON.stringify(annotations) !==
          JSON.stringify(initial?.annotations ?? EMPTY_BOARD_ANNOTATIONS));

  const { isBlocking, confirm, cancel } = useUnsavedChanges({
    isDirty: disableUnsavedGuard ? false : isDirty,
  });

  function localizeError(code: string): string {
    // Server-side validation errors come back as English messages
    // (representative FEN, slug shape, etc.). The short tokens below are
    // the ones the mutation core emits for non-validation failures; fall
    // back to the raw message when we don't have a localized form.
    const wellKnown = new Set([
      'signInRequired',
      'banned',
      'rateLimited',
      'slugTaken',
      'notFound',
      'unauthorized',
      'alreadyDeleted',
    ]);
    return wellKnown.has(code) ? t(`errors.${code}` as 'errors.signInRequired') : code;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const payload = {
      representativeFen,
      title,
      description: description || null,
      annotations,
    };

    const result =
      mode === 'create'
        ? await createChunk({ ...payload, slug })
        : await updateChunk(initial!.id, payload);

    setPending(false);

    if ('error' in result) {
      setError(localizeError(result.error));
      return;
    }

    setSubmitted(true);
    if (mode === 'create' && 'slug' in result) {
      router.push(`/chunks/${result.slug}` as '/chunks/[slug]');
    } else if (initial) {
      router.push(`/chunks/${initial.slug}` as '/chunks/[slug]');
    }
  }

  async function handleDelete() {
    if (!initial) return;
    setDeleteConfirmOpen(false);
    setDeletePending(true);
    setError(null);

    const result = await deleteChunk(initial.id);
    setDeletePending(false);

    if ('error' in result) {
      setError(localizeError(result.error));
      return;
    }

    setSubmitted(true);
    router.push('/chunks');
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {error && (
          <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="representativeFen" className="block text-sm font-medium mb-1">
            {t('fields.fen')} <span className="text-destructive">*</span>
          </label>
          <input
            id="representativeFen"
            type="text"
            value={representativeFen}
            onChange={(e) => setRepresentativeFen(e.target.value)}
            placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
            className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">{t('hints.fen')}</p>
          {representativeFen.trim() && !isFenValid && (
            <p className="text-sm text-destructive mt-1">{t('errors.invalidFen')}</p>
          )}
        </div>

        {isFenValid && (
          <div className="w-64">
            <BoardAnnotationEditor
              fen={trimmedFen}
              value={annotations}
              onChange={setAnnotations}
              disabled={pending}
            />
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            {t('fields.title')} <span className="text-destructive">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
            required
          />
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium mb-1">
            {t('fields.slug')} {mode === 'create' && <span className="text-destructive">*</span>}
          </label>
          <div className="flex gap-2">
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="rook-battery"
              className="flex-1 px-3 py-2 rounded border border-border bg-card text-foreground font-mono text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              required={mode === 'create'}
              readOnly={mode === 'edit'}
              disabled={mode === 'edit'}
            />
            {mode === 'create' && (
              <button
                type="button"
                onClick={() => setSlug(deriveSlugFromTitle(title))}
                className="px-3 py-2 text-sm rounded border border-border bg-muted text-foreground hover:opacity-80 transition-opacity whitespace-nowrap"
              >
                {t('actions.generateFromTitle')}
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === 'create' ? t('hints.slugCreate') : t('hints.slugLocked')}
          </p>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            {t('fields.description')}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
          />
        </div>

        <div className="flex gap-3 items-center">
          <Button type="submit" disabled={pending || deletePending}>
            {pending
              ? mode === 'create'
                ? t('actions.creating')
                : t('actions.saving')
              : mode === 'create'
                ? t('actions.create')
                : t('actions.save')}
          </Button>
          {mode === 'edit' && initial && (
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={pending || deletePending}
              className="ml-auto px-4 py-2 text-sm rounded border border-destructive text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
            >
              {deletePending ? t('actions.deleting') : t('actions.delete')}
            </button>
          )}
        </div>
      </form>

      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        title={t('delete.confirmTitle')}
        message={t('delete.confirmBody')}
        confirmText={t('delete.confirm')}
        cancelText={t('delete.cancel')}
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      <UnsavedChangesDialog open={isBlocking} onCancel={cancel} onConfirm={confirm} />
    </>
  );
}
