'use client';

import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { PIECES } from '../_lib/utils';
import type { RoutePlannerPieceSelection } from '../_lib/utils';

type Props = {
  pieceSelection: RoutePlannerPieceSelection;
  onPieceSelect: (selection: RoutePlannerPieceSelection) => void;
};

export function RoutePlannerSettings({ pieceSelection, onPieceSelect }: Props) {
  const t = useTranslations('practice.routePlanner');

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-foreground mb-4">
          {t('pieceSelection')}
        </label>
        <div className="flex flex-col items-center">
          <div className="flex justify-center gap-1 sm:gap-2">
            {PIECES.map((option) => (
              <button
                key={option}
                onClick={() => onPieceSelect(option)}
                className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-md font-bold text-lg transition-colors border ${
                  pieceSelection === option
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                }`}
                aria-label={t(`pieces.${option}`)}
                title={t(`pieces.${option}`)}
              >
                <ChessPiece type={option} color="w" size={24} />
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-muted-foreground animate-in fade-in duration-300">
            {t(`pieces.${pieceSelection}`)}
          </div>
        </div>
      </div>
    </div>
  );
}
