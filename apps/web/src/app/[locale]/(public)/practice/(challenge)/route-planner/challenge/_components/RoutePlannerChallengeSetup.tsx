'use client';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ChallengeSetupShell } from '@/app/[locale]/(public)/practice/(challenge)/_components/ChallengeSetupShell';
import { StandardChallengeRules } from '@/app/[locale]/(public)/practice/(challenge)/_components/StandardChallengeRules';
import type { Locale } from '@/app/[locale]/_lib/types';

import { RoutePlannerSettings } from '../../_components/RoutePlannerSettings';
import { useRoutePlannerSettings } from '../../_hooks/use-route-planner-settings';
import { PIECE_TYPE_TO_NAME } from '../../_lib/query-params';

type Props = {
  locale: Locale;
};

export function RoutePlannerChallengeSetup({ locale }: Props) {
  const t = useTranslations('practice');
  const router = useRouter();

  const { settings, updateSettings } = useRoutePlannerSettings();
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
