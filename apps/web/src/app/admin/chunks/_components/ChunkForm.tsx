'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { validateFenStructure } from '@blindfold-chess/features/chess-core';

import { BoardAnnotationEditor } from '@/lib/board-annotations/BoardAnnotationEditor';
import { type BoardAnnotations, EMPTY_BOARD_ANNOTATIONS } from '@/lib/board-annotations/types';

import { createChunk } from '../_actions/createChunk';
import { updateChunk } from '../_actions/updateChunk';

type ChunkFormProps = {
  mode: 'create' | 'edit';
  initial?: {
    id: string;
    representativeFen: string;
    title: string;
    slug: string;
    description: string | null;
    userId: string | null;
    annotations?: BoardAnnotations;
  };
};

export function ChunkForm({ mode, initial }: ChunkFormProps) {
  const router = useRouter();
  const [userId, setUserId] = useState(initial?.userId ?? '');
  const [representativeFen, setRepresentativeFen] = useState(initial?.representativeFen ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [annotations, setAnnotations] = useState<BoardAnnotations>(
    initial?.annotations ?? EMPTY_BOARD_ANNOTATIONS
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function generateSlugFromTitle() {
    const generated = title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(generated);
  }

  // Structural validation only — chunks are piece-coordination patterns that
  // may legitimately omit kings, so we intentionally do NOT use chess.js's
  // full legality check here. Keep this in sync with `validateChunkMutationData`
  // in `lib/chunks/validation.ts`.
  const isFenValid =
    representativeFen.trim() !== '' && validateFenStructure(representativeFen.trim()).ok;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const payload = {
      userId,
      representativeFen,
      title,
      slug,
      description: description || null,
      annotations,
    };

    const result =
      mode === 'create' ? await createChunk(payload) : await updateChunk(initial!.id, payload);

    setPending(false);

    if ('error' in result) {
      setError(result.error);
      return;
    }

    router.push('/admin/chunks');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="userId" className="block text-sm font-medium mb-1">
          User ID <span className="text-destructive">*</span>
        </label>
        <input
          id="userId"
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground font-mono text-sm"
          required
        />
      </div>

      <div>
        <label htmlFor="representativeFen" className="block text-sm font-medium mb-1">
          Representative FEN <span className="text-destructive">*</span>
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
        {representativeFen.trim() && !isFenValid && (
          <p className="text-sm text-destructive mt-1">Invalid FEN position</p>
        )}
      </div>

      {isFenValid && (
        <div className="w-64">
          {/*
           * Use `BoardAnnotationEditor` (which itself wraps the chess.js-free
           * `BoardThumbnail`) rather than `AnimatedChessBoard`: chunks may
           * legitimately omit kings, and chess.js's `fenToBoard` would
           * reject those. The editor doubles as the preview, so there is no
           * separate `<BoardThumbnail>` here.
           */}
          <BoardAnnotationEditor
            fen={representativeFen.trim()}
            value={annotations}
            onChange={setAnnotations}
            disabled={pending}
          />
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Title <span className="text-destructive">*</span>
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
          Slug {mode === 'create' && <span className="text-destructive">*</span>}
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
              onClick={generateSlugFromTitle}
              className="px-3 py-2 text-sm rounded border border-border bg-muted text-foreground hover:opacity-80 transition-opacity whitespace-nowrap"
            >
              Generate from title
            </button>
          )}
        </div>
        {mode === 'edit' && (
          <p className="text-xs text-muted-foreground mt-1">
            Slug is fixed at creation and cannot be edited (used as a permanent catalog URL).
          </p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {pending
          ? mode === 'create'
            ? 'Creating...'
            : 'Saving...'
          : mode === 'create'
            ? 'Create Chunk'
            : 'Save Changes'}
      </button>
    </form>
  );
}
