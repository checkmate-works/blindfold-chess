'use client';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaFlagCheckered } from 'react-icons/fa';

import { AlgebraicKeyboardHint } from '@/app/[locale]/(public)/practice/_components/KeyboardHint';
import { PieceCoordinateInput } from '@/app/[locale]/(public)/practice/_components/PieceCoordinateInput';

import type { PieceType } from '../../../_lib/utils';

type Props = {
  piece: PieceType;
  start: string;
  end: string;
  selectedFile: string | null;
  selectedRank: string | null;
  onFilePress: (file: string) => void;
  onRankPress: (rank: string) => void;
  onSubmit: () => void;
  isDisabled: boolean;
  movesCount: number;
};

export function SubmitArea({
  piece,
  start,
  end,
  selectedFile,
  selectedRank,
  onFilePress,
  onRankPress,
  onSubmit,
  isDisabled,
  movesCount,
}: Props) {
  const t = useTranslations('practice.routePlanner');

  return (
    <div
      className={`transition-opacity duration-300 ${isDisabled ? 'opacity-40 pointer-events-none' : ''}`}
    >
      <PieceCoordinateInput
        activePiece={piece}
        selectedFile={selectedFile}
        selectedRank={selectedRank}
        onFileToggle={onFilePress}
        onRankToggle={onRankPress}
      >
        <div className="flex pt-4 border-t border-border mt-2">
          <Button
            onClick={onSubmit}
            disabled={isDisabled || (movesCount === 0 && start === end)}
            variant="primary"
            className="w-full"
          >
            <FaFlagCheckered className="mr-2" />
            {t('submit')}
          </Button>
        </div>
      </PieceCoordinateInput>
      <AlgebraicKeyboardHint disabled={isDisabled} />
    </div>
  );
}
