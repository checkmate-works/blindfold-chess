'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import type { PieceSelection } from '@/app/_components/practice/PieceSelector';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ChallengeSetupShell } from '@/app/[locale]/(public)/practice/(challenge)/_components/ChallengeSetupShell';
import { StandardChallengeRules } from '@/app/[locale]/(public)/practice/(challenge)/_components/StandardChallengeRules';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LegalMovesSettings } from '../../_components/LegalMovesSettings';
import { PIECE_NAME_TO_TYPE, PIECE_TYPE_TO_NAME } from '../../_lib/query-params';

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
    <ChallengeSetupShell onStart={handleStart} rules={<StandardChallengeRules t={t} />}>
      <LegalMovesSettings pieceSelection={pieceSelection} onPieceSelect={setPieceSelection} />
    </ChallengeSetupShell>
  );
}
