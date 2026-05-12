'use client';

import type { BoardAnnotations } from '@/lib/board-annotations/types';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { BoardThumbnail } from './BoardThumbnail';

type Props = {
  fen: string;
  className?: string;
  annotations?: BoardAnnotations | null;
};

/**
 * Client wrapper around {@link BoardThumbnail} that automatically applies
 * the user's board theme preference from {@link useGamePreferences}.
 *
 * Use this in pages where the board theme should reflect user settings.
 * For admin pages or contexts without the GamePreferencesContext provider,
 * use {@link BoardThumbnail} directly.
 */
export function ThemedBoardThumbnail({ fen, className, annotations = null }: Props) {
  const { preferences } = useGamePreferences();

  return (
    <BoardThumbnail
      fen={fen}
      className={className}
      boardTheme={preferences.boardTheme}
      annotations={annotations}
    />
  );
}
