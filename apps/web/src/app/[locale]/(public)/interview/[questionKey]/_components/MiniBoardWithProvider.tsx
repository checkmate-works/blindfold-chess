'use client';

import { MiniBoard } from '@/app/[locale]/(public)/topics/openings/_components/MiniBoard';
import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  fen: string;
  flipped?: boolean;
  size?: number;
};

export function MiniBoardWithProvider({ fen, flipped = false, size = 140 }: Props) {
  return (
    <GamePreferencesProvider>
      <MiniBoard fen={fen} flipped={flipped} size={size} />
    </GamePreferencesProvider>
  );
}
