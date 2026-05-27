'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { ChallengeSetupShell } from '@/app/[locale]/(public)/practice/(challenge)/_components/ChallengeSetupShell';
import type { Locale } from '@/app/[locale]/_lib/types';

import { RoutePlannerSettings } from '../../_components/RoutePlannerSettings';
import type { RoutePlannerPieceSelection } from '../../_lib/pieces';
import { PIECE_NAME_TO_TYPE, PIECE_TYPE_TO_NAME } from '../../_lib/query-params';

type Props = {
  locale: Locale;
  piece: string;
};

export function RoutePlannerChallengeSetup({ locale, piece }: Props) {
  const t = useTranslations('practice');
  const router = useRouter();

  // Convert piece name from URL to RoutePlannerPieceSelection
  const initialSelection: RoutePlannerPieceSelection = PIECE_NAME_TO_TYPE[piece] ?? 'n';
  const [pieceSelection, setPieceSelection] =
    useState<RoutePlannerPieceSelection>(initialSelection);

  const handleStart = () => {
    const pieceName = PIECE_TYPE_TO_NAME[pieceSelection] ?? 'knight';
    const params = new URLSearchParams({
      piece: pieceName,
    });
    router.push(`/${locale}/practice/route-planner/challenge/session?${params.toString()}`);
  };

  return (
    <ChallengeSetupShell
      onStart={handleStart}
      rules={
        <>
          <li>{t('challengeSetup.timeLimit', { seconds: CHALLENGE_TIME_LIMIT })}</li>
          <li>{t('challengeSetup.mistakeLimit', { count: MISTAKE_LIMIT })}</li>
          <li>{t('challengeSetup.leaderboard')}</li>
        </>
      }
    >
      <RoutePlannerSettings pieceSelection={pieceSelection} onPieceSelect={setPieceSelection} />
    </ChallengeSetupShell>
  );
}
