'use client';

import { useTranslations } from 'next-intl';

import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import type { PieceType } from '@blindfold-chess/types';
import { FaQuestion } from 'react-icons/fa';

import type { LeaderboardModule } from '../_lib/types';
import { MODULES, MODULE_KEYS } from '../_lib/types';

const LEGAL_MOVES_KEY_TO_PIECE: Record<string, PieceType> = {
  king: 'k',
  queen: 'q',
  rook: 'r',
  bishop: 'b',
  knight: 'n',
};

type Props = {
  module: LeaderboardModule;
  settingKey: string;
  onModuleChange: (module: LeaderboardModule) => void;
  onSettingKeyChange: (key: string) => void;
};

export function LeaderboardFilters({
  module,
  settingKey,
  onModuleChange,
  onSettingKeyChange,
}: Props) {
  const t = useTranslations('leaderboard');

  const settingKeys = MODULE_KEYS[module];

  return (
    <div className="space-y-4">
      {/* Module Tabs */}
      <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label={t('moduleLabel')}>
        {MODULES.map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={module === m}
            onClick={() => onModuleChange(m)}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              module === m
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {t(`module.${m}`)}
          </button>
        ))}
      </div>

      {/* Setting Key Selector - hide when only one option */}
      {settingKeys.length > 1 && (
        <div
          className="flex rounded-lg bg-secondary p-1"
          role="radiogroup"
          aria-label={t('settingLabel')}
        >
          {settingKeys.map((k) => {
            const isSelected = settingKey === k;
            const label = t(`setting.${module}.${k}`);
            const pieceType = module === 'legal_moves' ? LEGAL_MOVES_KEY_TO_PIECE[k] : undefined;

            return (
              <button
                key={k}
                role="radio"
                aria-checked={isSelected}
                aria-label={label}
                title={label}
                onClick={() => onSettingKeyChange(k)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {pieceType ? (
                  <ChessPiece type={pieceType} color="w" size={20} />
                ) : k === 'random' && module === 'legal_moves' ? (
                  <FaQuestion className="h-4 w-4" />
                ) : (
                  label
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
