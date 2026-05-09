'use client';

import { useCallback, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { BoardSkeleton, Button, FlipBoardButton, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { validateFen } from '@blindfold-chess/features/chess-core';
import { flushSync } from 'react-dom';

import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { updatePosition } from '../_actions/updatePosition';

const EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

type EditorTab = 'board' | 'fen';

type Props = {
  positionId: string;
  initial: {
    fen: string;
    title: string;
    description: string | null;
  };
};

export function EditPositionForm({ positionId, initial }: Props) {
  const router = useRouter();
  const t = useTranslations('practice.positionMemory.edit');
  const tCreate = useTranslations('practice.positionMemory.create');
  const tBoard = useTranslations('practice.positionMemory');
  const tUnsaved = useTranslations('unsavedChanges');
  const { preferences, isLoaded } = useGamePreferences();

  const initialDescription = initial.description ?? '';
  const [fenInput, setFenInput] = useState(initial.fen);
  const [boardFen, setBoardFen] = useState(initial.fen);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [positionError, setPositionError] = useState(false);
  const [pending, setPending] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>('board');
  const [flipped, setFlipped] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [clearBoardOpen, setClearBoardOpen] = useState(false);

  const isDirty =
    !submitted &&
    (title !== initial.title ||
      description !== initialDescription ||
      fenInput.trim() !== initial.fen);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  const handleFlip = useCallback(() => setFlipped((prev) => !prev), []);

  const isFenValid = fenInput.trim() !== '' && validateFen(fenInput.trim());

  const editableBoardLabels = useMemo(
    () => ({
      whitePieces: tBoard('whitePieces'),
      blackPieces: tBoard('blackPieces'),
      removePieceMode: tBoard('removePieceMode'),
      placingPiece: tBoard('placingPiece'),
    }),
    [tBoard]
  );

  function handleFenInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setFenInput(value);
    if (value.trim() !== '' && validateFen(value.trim())) {
      setBoardFen(value.trim());
    }
  }

  function handleBoardChange(newFen: string) {
    setFenInput(newFen);
    setBoardFen(newFen);
    setPositionError(false);
  }

  function handleClearBoard() {
    setFenInput(EMPTY_BOARD_FEN);
    setBoardFen(EMPTY_BOARD_FEN);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPositionError(false);

    if (!fenInput.trim() || !isFenValid) {
      setPositionError(true);
      return;
    }

    setPending(true);
    try {
      const result = await updatePosition({
        id: positionId,
        fen: fenInput.trim(),
        title,
        description: description || null,
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
            aria-selected={activeTab === 'board'}
            onClick={() => setActiveTab('board')}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              activeTab === 'board'
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tCreate('tabBoard')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'fen'}
            onClick={() => setActiveTab('fen')}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              activeTab === 'fen'
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tCreate('tabFen')}
          </button>
        </nav>

        {activeTab === 'board' && (
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
                    fen={boardFen}
                    onFenChange={handleBoardChange}
                    labels={editableBoardLabels}
                    editable={true}
                    flipped={flipped}
                    showCoordinates={true}
                    boardTheme={preferences.boardTheme}
                  />
                )}
              </div>
            </div>

            {positionError && (
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

        {activeTab === 'fen' && (
          <div>
            <label htmlFor="fen" className="block text-sm font-medium mb-1">
              {tCreate('fenLabel')}
            </label>
            <textarea
              id="fen"
              value={fenInput}
              onChange={handleFenInputChange}
              placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              rows={2}
              className="w-full px-3 py-2 rounded border border-border bg-card text-foreground text-sm font-mono"
            />
            {fenInput.trim() && !isFenValid && (
              <p className="text-sm text-destructive mt-1">{tCreate('fenInvalid')}</p>
            )}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={pending || !isFenValid || title.trim() === '' || !isDirty}
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
          handleClearBoard();
        }}
        onCancel={() => setClearBoardOpen(false)}
      />
    </>
  );
}
