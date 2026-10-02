'use client';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ChallengeSetupShell } from '@/app/[locale]/(public)/practice/(challenge)/_components/ChallengeSetupShell';
import { useQuerySeededSettings } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-query-seeded-settings';
import { StandardChallengeRules } from '@/app/[locale]/(public)/practice/(challenge)/_components/StandardChallengeRules';
import type { Locale } from '@/app/[locale]/_lib/types';

import { RoutePlannerSettings } from '../../_components/RoutePlannerSettings';
import { useRoutePlannerSettings } from '../../_hooks/use-route-planner-settings';
import type { RoutePlannerPieceSelection } from '../../_lib/pieces';
import { PIECE_TYPE_TO_NAME } from '../../_lib/query-params';

type Props = {
  locale: Locale;
  /** The piece the entering link named (the leaderboard's challenge button). */
  initialPieceSelection?: RoutePlannerPieceSelection | undefined;
};

export function RoutePlannerChallengeSetup({ locale, initialPieceSelection }: Props) {
  const t = useTranslations('practice');
  const router = useRouter();

  const { settings, updateSettings } = useQuerySeededSettings(
    useRoutePlannerSettings(),
    initialPieceSelection ? { pieceSelection: initialPieceSelection } : undefined,
    ['piece']
  );
  const { pieceSelection } = settings;

  const pieceName = PIECE_TYPE_TO_NAME[pieceSelection] ?? 'knight';
  const settingsQuery = new URLSearchParams({ piece: pieceName }).toString();

  const handleStart = () => {
    router.push(`/${locale}/practice/route-planner/challenge/session?${settingsQuery}`);
  };

  return (
    <ChallengeSetupShell
      onStart={handleStart}
      // The route planner's session element predates the shared
      // `<slug>-training-session` id, so its fragment is spelled out.
      trainingHref={`/${locale}/practice/route-planner/training?${settingsQuery}#route-planner-session`}
      rules={<StandardChallengeRules t={t} />}
    >
      <RoutePlannerSettings
        pieceSelection={pieceSelection}
        onPieceSelect={(selection) => updateSettings({ pieceSelection: selection })}
      />
    </ChallengeSetupShell>
  );
}
