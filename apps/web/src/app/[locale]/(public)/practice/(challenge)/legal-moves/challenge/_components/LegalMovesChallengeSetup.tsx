'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import type { PieceSelection } from '@/app/_components/practice/PieceSelector';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPlay } from 'react-icons/fa';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge-constants';

import { PracticePanel } from '@/app/[locale]/(public)/practice/_components/PracticePanel';
import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LegalMovesSettings } from '../../_components/LegalMovesSettings';
import { PIECE_NAME_TO_TYPE, PIECE_TYPE_TO_NAME } from '../../_lib/utils';

type Props = {
  locale: Locale;
  piece: string;
};

export function LegalMovesChallengeSetup({ locale, piece }: Props) {
  const t = useTranslations('practice');
  const router = useRouter();

  // Convert piece name from URL to PieceSelection type
  const initialSelection: PieceSelection =
    piece === 'random' ? 'random' : (PIECE_NAME_TO_TYPE[piece] ?? 'random');
  const [pieceSelection, setPieceSelection] = useState<PieceSelection>(initialSelection);

  const handleStart = () => {
    const pieceName =
      pieceSelection === 'random' ? 'random' : (PIECE_TYPE_TO_NAME[pieceSelection] ?? 'random');
    const params = new URLSearchParams({
      piece: pieceName,
    });
    router.push(`/${locale}/practice/legal-moves/challenge/session?${params.toString()}`);
  };

  return (
    <PracticePanel className="p-6">
      <SectionTitle className="mb-4">{t('challengeSetup.title')}</SectionTitle>

      <ul className="mb-6 space-y-2 text-sm text-muted-foreground list-disc list-inside">
        <li>{t('challengeSetup.timeLimit', { seconds: CHALLENGE_TIME_LIMIT })}</li>
        <li>{t('challengeSetup.mistakeLimit', { count: MISTAKE_LIMIT })}</li>
        <li>{t('challengeSetup.leaderboard')}</li>
      </ul>

      <LegalMovesSettings pieceSelection={pieceSelection} onPieceSelect={setPieceSelection} />

      <Button
        onClick={handleStart}
        variant="primary"
        size="lg"
        icon={<FaPlay />}
        className="w-full mt-6"
      >
        {t('startChallenge')}
      </Button>
    </PracticePanel>
  );
}
