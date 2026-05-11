'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { BoardSkeleton, Button, FlipBoardButton, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import { TagPicker } from '@/app/[locale]/(public)/practice/(free-play)/_components/TagPicker';
import { useFenBoardEditor } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor';
import { useTagPickerLabels } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-tag-picker-labels';
import { useTagSelection } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-tag-selection';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { updatePosition } from '../_actions/updatePosition';

type Props = {
  positionId: string;
  initial: {
    fen: string;
    title: string;
    description: string | null;
    themes: ThemeOption[];
    chunks: ChunkOption[];
  };
  available: {
    themes: ThemeOption[];
    chunks: ChunkOption[];
  };
};

export function EditPositionForm({ positionId, initial, available }: Props) {
  const router = useRouter();
  const t = useTranslations('practice.positionMemory.edit');
  const tCreate = useTranslations('practice.positionMemory.create');
  const tBoard = useTranslations('practice.positionMemory');
  const tUnsaved = useTranslations('unsavedChanges');
  const tagPickerLabels = useTagPickerLabels();
  const { preferences, isLoaded } = useGamePreferences();

  const initialDescription = initial.description ?? '';
  const initialThemeIdsRef = useRef(initial.themes.map((th) => th.id));
  const initialChunkIdsRef = useRef(initial.chunks.map((c) => c.id));

  const board = useFenBoardEditor({ initialFen: initial.fen });
  const tags = useTagSelection({ initialThemes: initial.themes, initialChunks: initial.chunks });
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [clearBoardOpen, setClearBoardOpen] = useState(false);

  const themeIds = useMemo(() => tags.selectedThemes.map((th) => th.id), [tags.selectedThemes]);
  const chunkIds = useMemo(() => tags.selectedChunks.map((c) => c.id), [tags.selectedChunks]);

  const tagsChanged = useMemo(() => {
    const initialThemeIds = initialThemeIdsRef.current;
    const initialChunkIds = initialChunkIdsRef.current;
    if (themeIds.length !== initialThemeIds.length) return true;
    if (chunkIds.length !== initialChunkIds.length) return true;
    const themeSet = new Set(initialThemeIds);
    const chunkSet = new Set(initialChunkIds);
    return themeIds.some((id) => !themeSet.has(id)) || chunkIds.some((id) => !chunkSet.has(id));
  }, [themeIds, chunkIds]);

  const isDirty =
    !submitted &&
    (title !== initial.title ||
      description !== initialDescription ||
      board.fenInput.trim() !== initial.fen ||
      tagsChanged);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  const editableBoardLabels = useMemo(
    () => ({
      whitePieces: tBoard('whitePieces'),
      blackPieces: tBoard('blackPieces'),
      removePieceMode: tBoard('removePieceMode'),
      placingPiece: tBoard('placingPiece'),
    }),
    [tBoard]
  );

  const handleFlip = useCallback(() => board.setFlipped((prev) => !prev), [board]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    board.setPositionError(false);

    if (!board.trimmedFen || !board.isFenValid) {
      board.setPositionError(true);
      return;
    }

    setPending(true);
    try {
      const result = await updatePosition({
        id: positionId,
        fen: board.trimmedFen,
        title,
        description: description || null,
        themeIds,
        chunkIds,
      });

      if ('error' in result) {
        setError(result.error);
        return;
      }

      flushSync(() => setSubmitted(true));
      router.push(`/practice/position-memory/${positionId}?toast=position_updated`);
    } catch {
      setError(t('saveError'));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            {tCreate('titleLabel')} <span className="text-destructive">*</span>
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
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            {tCreate('descriptionLabel')}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
          />
        </div>

        <nav className="flex rounded-lg bg-secondary p-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={board.activeTab === 'board'}
            onClick={() => board.setActiveTab('board')}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              board.activeTab === 'board'
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tCreate('tabBoard')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={board.activeTab === 'fen'}
            onClick={() => board.setActiveTab('fen')}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              board.activeTab === 'fen'
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tCreate('tabFen')}
          </button>
        </nav>

        {board.activeTab === 'board' && (
          <>
            <div className="flex justify-end mb-2">
              <FlipBoardButton onClick={handleFlip} title={tCreate('flipBoard')} />
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                {!isLoaded ? (
                  <BoardSkeleton />
                ) : (
                  <EditableChessBoard
                    fen={board.boardFen}
                    onFenChange={board.handleBoardChange}
                    labels={editableBoardLabels}
                    editable={true}
                    flipped={board.flipped}
                    showCoordinates={true}
                    boardTheme={preferences.boardTheme}
                  />
                )}
              </div>
            </div>

            {board.positionError && (
              <p className="text-sm text-destructive text-center">{tCreate('positionInvalid')}</p>
            )}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setClearBoardOpen(true)}
                className="px-3 py-1 text-sm rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                {tCreate('clearBoard')}
              </button>
            </div>
          </>
        )}

        {board.activeTab === 'fen' && (
          <div>
            <label htmlFor="fen" className="block text-sm font-medium mb-1">
              {tCreate('fenLabel')}
            </label>
            <textarea
              id="fen"
              value={board.fenInput}
              onChange={board.handleFenInputChange}
              placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              rows={2}
              className="w-full px-3 py-2 rounded border border-border bg-card text-foreground text-sm font-mono"
            />
            {board.fenInput.trim() && !board.isFenValid && (
              <p className="text-sm text-destructive mt-1">{tCreate('fenInvalid')}</p>
            )}
          </div>
        )}

        <TagPicker
          selectedThemes={tags.selectedThemes}
          selectedChunks={tags.selectedChunks}
          availableThemes={available.themes}
          availableChunks={available.chunks}
          disabled={pending}
          onChange={tags.handleTagChange}
          labels={tagPickerLabels}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={pending || !board.isFenValid || title.trim() === '' || !isDirty}
        >
          {pending ? t('submitting') : t('submit')}
        </Button>
      </form>

      <UnsavedChangesDialog
        open={isBlocking}
        onConfirm={confirm}
        onCancel={cancel}
        title={tUnsaved('title')}
        message={tUnsaved('message')}
        confirmLabel={tUnsaved('confirm')}
        cancelLabel={tUnsaved('cancel')}
      />

      <ConfirmationModal
        isOpen={clearBoardOpen}
        title={tCreate('clearBoardConfirmTitle')}
        message={tCreate('clearBoardConfirmMessage')}
        confirmText={tCreate('clearBoardConfirmConfirm')}
        cancelText={tCreate('clearBoardConfirmCancel')}
        confirmVariant="danger"
        onConfirm={() => {
          setClearBoardOpen(false);
          board.handleClearBoard();
        }}
        onCancel={() => setClearBoardOpen(false)}
      />
    </>
  );
}
