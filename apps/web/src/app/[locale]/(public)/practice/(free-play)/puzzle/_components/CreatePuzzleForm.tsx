'use client';

import { useCallback, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { getTurnFromFen, validateFen } from '@blindfold-chess/features/chess-core';
import { flushSync } from 'react-dom';
import { FaSyncAlt } from 'react-icons/fa';

import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';

import { createPuzzle } from '../_actions/createPuzzle';

const EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

type EditorTab = 'board' | 'fen';

export function CreatePuzzleForm() {
  const router = useRouter();
  const t = useTranslations('practice.puzzle.create');
  const tBoard = useTranslations('practice.puzzle');
  const tUnsaved = useTranslations('unsavedChanges');
  const [fenInput, setFenInput] = useState('');
  const [boardFen, setBoardFen] = useState(EMPTY_BOARD_FEN);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [solutionLine, setSolutionLine] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [positionError, setPositionError] = useState(false);
  const [solutionError, setSolutionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>('board');
  const [flipped, setFlipped] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isDirty =
    !submitted &&
    (title.trim() !== '' ||
      description.trim() !== '' ||
      solutionLine.trim() !== '' ||
      (fenInput.trim() !== '' && fenInput !== EMPTY_BOARD_FEN));

  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  const handleFlip = useCallback(() => setFlipped((prev) => !prev), []);

  const isFenValid = fenInput.trim() !== '' && validateFen(fenInput.trim());

  const turnIndicator = useMemo(() => {
    if (!isFenValid) return null;
    try {
      const turn = getTurnFromFen(fenInput.trim());
      return turn;
    } catch {
      return null;
    }
  }, [fenInput, isFenValid]);

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
    setSolutionError(null);

    if (!fenInput.trim() || !isFenValid) {
      setPositionError(true);
      return;
    }

    if (!solutionLine.trim()) {
      setSolutionError(t('solutionRequired'));
      return;
    }

    setPending(true);

    try {
      const result = await createPuzzle({
        fen: fenInput.trim(),
        title,
        description: description || null,
        solutionLine: solutionLine.trim(),
      });

      if ('error' in result) {
        setError(result.error);
        return;
      }

      // flushSync ensures the re-render (isDirty -> false) completes
      // before router.push triggers the navigation guard check.
      flushSync(() => setSubmitted(true));
      router.push(`/practice/puzzle?toast=puzzle_created`);
    } catch {
      setError('An unexpected error occurred. Please try again.');
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

        {/* Tab switcher — matches LeaderboardTabs style */}
        <nav className="flex rounded-lg bg-secondary p-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'board'}
            onClick={() => setActiveTab('board')}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              activeTab === 'board'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('tabBoard')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'fen'}
            onClick={() => setActiveTab('fen')}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              activeTab === 'fen'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('tabFen')}
          </button>
        </nav>

        {/* Board editor tab */}
        {activeTab === 'board' && (
          <>
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={handleFlip}
                className="p-2 border border-border rounded-md hover:bg-muted"
                title={t('flipBoard')}
              >
                <FaSyncAlt className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <EditableChessBoard
                  fen={boardFen}
                  onFenChange={handleBoardChange}
                  labels={editableBoardLabels}
                  editable={true}
                  flipped={flipped}
                  showCoordinates={true}
                />
              </div>
            </div>

            {positionError && (
              <p className="text-sm text-destructive text-center">{t('positionInvalid')}</p>
            )}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleClearBoard}
                className="px-3 py-1 text-sm rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                {t('clearBoard')}
              </button>
            </div>
          </>
        )}

        {/* FEN input tab */}
        {activeTab === 'fen' && (
          <div>
            <label htmlFor="fen" className="block text-sm font-medium mb-1">
              {t('fenLabel')}
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
              <p className="text-sm text-destructive mt-1">{t('fenInvalid')}</p>
            )}
          </div>
        )}

        {/* Turn indicator */}
        {turnIndicator && (
          <p className="text-sm text-muted-foreground text-center">
            {turnIndicator === 'w' ? t('whiteToMove') : t('blackToMove')}
          </p>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            {t('titleLabel')} <span className="text-destructive">*</span>
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
            {t('descriptionLabel')}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
          />
        </div>

        <div>
          <label htmlFor="solutionLine" className="block text-sm font-medium mb-1">
            {t('solutionLabel')} <span className="text-destructive">*</span>
          </label>
          <input
            id="solutionLine"
            type="text"
            value={solutionLine}
            onChange={(e) => {
              setSolutionLine(e.target.value);
              setSolutionError(null);
            }}
            placeholder={t('solutionPlaceholder')}
            className="w-full px-3 py-2 rounded border border-border bg-card text-foreground font-mono"
            required
          />
          {solutionError && <p className="text-sm text-destructive mt-1">{solutionError}</p>}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {pending ? t('submitting') : t('submit')}
        </button>
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
    </>
  );
}
