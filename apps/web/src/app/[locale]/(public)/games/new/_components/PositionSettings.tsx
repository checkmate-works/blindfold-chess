'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FILES } from '@blindfold-chess/types';

export type CastlingRights = {
  K: boolean;
  Q: boolean;
  k: boolean;
  q: boolean;
};

type Props = {
  turn: 'w' | 'b';
  castling: CastlingRights;
  castlingAvailability: CastlingRights;
  onCastlingChange: (castling: CastlingRights) => void;
  enPassant: string;
  enPassantAvailability: Record<string, boolean>;
  onEnPassantChange: (square: string) => void;
};

const EN_PASSANT_RANKS: Record<'w' | 'b', string> = { w: '6', b: '3' };

function getEnPassantOptions(turn: 'w' | 'b'): string[] {
  const rank = EN_PASSANT_RANKS[turn];
  return FILES.map((f) => `${f}${rank}`);
}

export function PositionSettings({
  turn,
  castling,
  castlingAvailability,
  onCastlingChange,
  enPassant,
  enPassantAvailability,
  onEnPassantChange,
}: Props) {
  const t = useTranslations('newGame.positionSettings');

  const enPassantOptions = getEnPassantOptions(turn);

  return (
    <div className="space-y-4">
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
          ).map(({ key, label }) => {
            const disabled = !castlingAvailability[key];
            return (
              <label
                key={key}
                className={`flex items-center gap-2 text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <input
                  type="checkbox"
                  checked={castling[key]}
                  disabled={disabled}
                  onChange={(e) => onCastlingChange({ ...castling, [key]: e.target.checked })}
                  className="rounded border-border"
                />
                {label}
              </label>
            );
          })}
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
          {enPassantOptions.map((sq) => {
            const file = sq[0];
            const disabled = !enPassantAvailability[file];
            return (
              <option key={sq} value={sq} disabled={disabled}>
                {sq}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
