'use client';

import { useCallback, useMemo, useState } from 'react';

import { useLocale, useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { BoardSkeleton, Button, FlipBoardButton, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';
import { FaPlay } from 'react-icons/fa';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import { TagPicker } from '@/app/[locale]/(public)/practice/(free-play)/_components/TagPicker';
import { useFenBoardEditor } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor';
import { useTagPickerLabels } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-tag-picker-labels';
import { useTagSelection } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-tag-selection';
import { EMPTY_BOARD_FEN } from '@/app/[locale]/(public)/practice/(free-play)/_lib/board-editor-constants';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { createPosition } from '../_actions/createPosition';

function formatLocalIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDefaultTitle(displayName: string | undefined): string {
  if (displayName === undefined) return '';
  const date = formatLocalIsoDate(new Date());
  const trimmed = displayName.trim();
  return trimmed ? `Position ${date} - ${trimmed}` : `Position ${date}`;
}

type Props = {
  displayName?: string;
  /**
   * Skip the unsaved-changes navigation guard. Used when the form is
   * rendered behind a guest sign-up overlay: the guest cannot submit, so
   * the guard would otherwise block the sign-up CTA click with a modal
   * that makes no sense in context.
   */
  disableUnsavedGuard?: boolean;
  availableThemes?: ThemeOption[];
  availableChunks?: ChunkOption[];
};

export function CreatePositionForm({
  displayName,
  disableUnsavedGuard = false,
  availableThemes = [],
  availableChunks = [],
}: Props = {}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('practice.positionMemory.create');
  const tBoard = useTranslations('practice.positionMemory');
  const tUnsaved = useTranslations('unsavedChanges');
  const tagPickerLabels = useTagPickerLabels();
  const { preferences, isLoaded } = useGamePreferences();

  const board = useFenBoardEditor();
  const tags = useTagSelection();
  const [title, setTitle] = useState(() => buildDefaultTitle(displayName));
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [clearBoardOpen, setClearBoardOpen] = useState(false);

  const isDirty =
    !submitted &&
    (title.trim() !== '' ||
      description.trim() !== '' ||
      (board.fenInput.trim() !== '' && board.fenInput !== EMPTY_BOARD_FEN) ||
      tags.selectedThemes.length > 0 ||
      tags.selectedChunks.length > 0);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({
    isDirty: disableUnsavedGuard ? false : isDirty,
  });

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
      const result = await createPosition({
        fen: board.trimmedFen,
        title,
        description: description || null,
        themeIds: tags.selectedThemes.map((th) => th.id),
        chunkIds: tags.selectedChunks.map((c) => c.id),
      });

      if ('error' in result) {
        setError(result.error);
        return;
      }

      // flushSync ensures the re-render (isDirty → false) completes
      // before router.push triggers the navigation guard check.
      flushSync(() => setSubmitted(true));
      // Grant fired → route via /thanks so the user lands on the award screen,
      // then continues to the position detail (toast suppressed because the
      // /thanks page already celebrates the create). No-grant flows keep the
      // legacy in-place toast UX.
      if (result.grant) {
        const returnUrl = `/${locale}/practice/position-memory/${result.id}`;
        router.push(
          `/thanks?grantId=${result.grant.grantId}&returnUrl=${encodeURIComponent(returnUrl)}`
        );
      } else {
        router.push(`/practice/position-memory/${result.id}?toast=position_created`);
      }
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
            {t('tabBoard')}
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
            {t('tabFen')}
          </button>
        </nav>

        {board.activeTab === 'board' && (
          <>
            <div className="flex justify-end mb-2">
              <FlipBoardButton onClick={handleFlip} title={t('flipBoard')} />
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
              <p className="text-sm text-destructive text-center">{t('positionInvalid')}</p>
            )}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setClearBoardOpen(true)}
                className="px-3 py-1 text-sm rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                {t('clearBoard')}
              </button>
            </div>
          </>
        )}

        {board.activeTab === 'fen' && (
          <div>
            <label htmlFor="fen" className="block text-sm font-medium mb-1">
              {t('fenLabel')}
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
              <p className="text-sm text-destructive mt-1">{t('fenInvalid')}</p>
            )}
          </div>
        )}

        <TagPicker
          selectedThemes={tags.selectedThemes}
          selectedChunks={tags.selectedChunks}
          availableThemes={availableThemes}
          availableChunks={availableChunks}
          disabled={pending}
          onChange={tags.handleTagChange}
          labels={tagPickerLabels}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          icon={<FaPlay />}
          fullWidth
          disabled={pending || !board.isFenValid || title.trim() === ''}
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
        title={t('clearBoardConfirmTitle')}
        message={t('clearBoardConfirmMessage')}
        confirmText={t('clearBoardConfirmConfirm')}
        cancelText={t('clearBoardConfirmCancel')}
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
