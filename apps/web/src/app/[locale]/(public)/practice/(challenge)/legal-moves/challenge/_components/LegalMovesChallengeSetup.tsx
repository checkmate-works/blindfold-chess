'use client';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { PieceSelection } from '@/app/_components/practice/PieceSelector';

import { ChallengeSetupShell } from '@/app/[locale]/(public)/practice/(challenge)/_components/ChallengeSetupShell';
import { useQuerySeededSettings } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-query-seeded-settings';
import { StandardChallengeRules } from '@/app/[locale]/(public)/practice/(challenge)/_components/StandardChallengeRules';
import { trainingHrefFor } from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingModeButton';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LegalMovesSettings } from '../../_components/LegalMovesSettings';
import { useLegalMovesSettings } from '../../_hooks/use-legal-moves-settings';
import { PIECE_TYPE_TO_NAME } from '../../_lib/query-params';

type Props = {
  locale: Locale;
  /** The piece the entering link named (the leaderboard's challenge button). */
  initialPieceSelection?: PieceSelection | undefined;
};

export function LegalMovesChallengeSetup({ locale, initialPieceSelection }: Props) {
  const t = useTranslations('practice');
  const router = useRouter();

  const { settings, updateSettings } = useQuerySeededSettings(
    useLegalMovesSettings(),
    initialPieceSelection ? { pieceSelection: initialPieceSelection } : undefined,
    ['piece']
  );
  const { pieceSelection } = settings;

  const pieceName =
    pieceSelection === 'random' ? 'random' : (PIECE_TYPE_TO_NAME[pieceSelection] ?? 'random');
  const settingsQuery = new URLSearchParams({ piece: pieceName }).toString();

  const handleStart = () => {
    router.push(`/${locale}/practice/legal-moves/challenge/session?${settingsQuery}`);
  };

  return (
    <ChallengeSetupShell
      onStart={handleStart}
      trainingHref={trainingHrefFor(locale, 'legal-moves', settingsQuery)}
      rules={<StandardChallengeRules t={t} />}
    >
      <LegalMovesSettings
        pieceSelection={pieceSelection}
        onPieceSelect={(selection) => updateSettings({ pieceSelection: selection })}
      />
    </ChallengeSetupShell>
  );
}
