'use client';

import type { Color } from '@blindfold-chess/features/chess-core';
import { ChessPieceIcon } from '@blindfold-chess/icons';
import type { PieceType } from '@blindfold-chess/types';

import { getBoardThemeColors } from '@/lib/boardThemes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

function parseFenChar(ch: string): { type: PieceType; color: Color } | null {
  if (/^[KQRBNP]$/.test(ch)) {
    return { type: ch.toLowerCase() as PieceType, color: 'w' };
  }
  if (/^[kqrbnp]$/.test(ch)) {
    return { type: ch as PieceType, color: 'b' };
  }
  return null;
}

function parseFenPlacement(fen: string): (string | null)[][] {
  const placement = fen.split(' ')[0];
  return placement.split('/').map((rank) => {
    const row: (string | null)[] = [];
    for (const ch of rank) {
      if (ch >= '1' && ch <= '8') {
        row.push(...Array<null>(Number(ch)).fill(null));
      } else {
        row.push(ch);
      }
    }
    return row;
  });
}

type Props = {
  fen: string;
  size?: number;
  responsive?: boolean;
  flipped?: boolean;
};

export function MiniBoard({ fen, size = 120, responsive = false, flipped = false }: Props) {
  const { preferences } = useGamePreferences();
  const themeColors = getBoardThemeColors(preferences.boardTheme);
  const board = flipped
    ? parseFenPlacement(fen)
        .reverse()
        .map((rank) => [...rank].reverse())
    : parseFenPlacement(fen);

  if (responsive) {
    return (
      <div className="grid grid-cols-8 border border-border rounded-sm overflow-hidden aspect-square w-full">
        {board.map((rank, rankIdx) =>
          rank.map((fenChar, fileIdx) => {
            const isLight = (rankIdx + fileIdx) % 2 === 0;
            const piece = fenChar ? parseFenChar(fenChar) : null;
            return (
              <div
                key={`${rankIdx}-${fileIdx}`}
                className={`flex items-center justify-center aspect-square ${isLight ? themeColors.light : themeColors.dark}`}
              >
                {piece ? (
                  <ChessPieceIcon
                    type={piece.type}
                    color={piece.color}
                    className="w-[80%] h-[80%]"
                  />
                ) : null}
              </div>
            );
          })
        )}
      </div>
    );
  }

  const squareSize = size / 8;
  const pieceSize = Math.round(squareSize * 0.8);

  return (
    <div
      className="grid grid-cols-8 border border-border rounded-sm overflow-hidden shrink-0"
      style={{ width: size, height: size }}
    >
      {board.map((rank, rankIdx) =>
        rank.map((fenChar, fileIdx) => {
          const isLight = (rankIdx + fileIdx) % 2 === 0;
          const piece = fenChar ? parseFenChar(fenChar) : null;
          return (
            <div
              key={`${rankIdx}-${fileIdx}`}
              className={`flex items-center justify-center ${isLight ? themeColors.light : themeColors.dark}`}
              style={{
                width: squareSize,
                height: squareSize,
              }}
            >
              {piece ? (
                <ChessPieceIcon type={piece.type} color={piece.color} size={pieceSize} />
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
