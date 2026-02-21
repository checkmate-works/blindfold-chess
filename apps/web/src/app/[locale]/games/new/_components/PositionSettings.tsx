'use client';

import { useTranslations } from 'next-intl';

export type CastlingRights = {
  K: boolean;
  Q: boolean;
  k: boolean;
  q: boolean;
};

type Props = {
  turn: 'w' | 'b';
  onTurnChange: (turn: 'w' | 'b') => void;
  castling: CastlingRights;
  onCastlingChange: (castling: CastlingRights) => void;
  enPassant: string;
  onEnPassantChange: (square: string) => void;
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const EN_PASSANT_RANKS: Record<'w' | 'b', string> = { w: '6', b: '3' };

function getEnPassantOptions(turn: 'w' | 'b'): string[] {
  const rank = EN_PASSANT_RANKS[turn];
  return FILES.map((f) => `${f}${rank}`);
}

export function PositionSettings({
  turn,
  onTurnChange,
  castling,
  onCastlingChange,
  enPassant,
  onEnPassantChange,
}: Props) {
  const t = useTranslations('newGame.positionSettings');

  const enPassantOptions = getEnPassantOptions(turn);

  return (
    <div className="space-y-4">
      {/* Turn selector */}
      <div>
        <h3 className="text-sm font-medium mb-2">{t('turn')}</h3>
        <div className="flex gap-3">
          <button
            onClick={() => onTurnChange('w')}
            className={`px-4 py-2 rounded-md border text-sm transition-all ${
              turn === 'w'
                ? 'border-foreground bg-foreground/10 font-medium'
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            {t('white')}
          </button>
          <button
            onClick={() => onTurnChange('b')}
            className={`px-4 py-2 rounded-md border text-sm transition-all ${
              turn === 'b'
                ? 'border-foreground bg-foreground/10 font-medium'
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            {t('black')}
          </button>
        </div>
      </div>

      {/* Castling rights */}
      <div>
        <h3 className="text-sm font-medium mb-2">{t('castling')}</h3>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { key: 'K', label: t('whiteKingside') },
              { key: 'Q', label: t('whiteQueenside') },
              { key: 'k', label: t('blackKingside') },
              { key: 'q', label: t('blackQueenside') },
            ] as const
          ).map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={castling[key]}
                onChange={(e) => onCastlingChange({ ...castling, [key]: e.target.checked })}
                className="rounded border-border"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* En passant target */}
      <div>
        <h3 className="text-sm font-medium mb-2">{t('enPassant')}</h3>
        <select
          value={enPassant}
          onChange={(e) => onEnPassantChange(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
        >
          <option value="-">{t('none')}</option>
          {enPassantOptions.map((sq) => (
            <option key={sq} value={sq}>
              {sq}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
