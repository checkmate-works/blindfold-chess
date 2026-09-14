'use client';

import type { Locale } from '@/app/[locale]/_lib/types';

import { useRoutePlannerSettings } from '../_hooks/use-route-planner-settings';
import { RoutePlannerSetup } from './RoutePlannerSetup';

type Props = {
  locale: Locale;
};

export default function RoutePlanner({ locale }: Props) {
  const { settings, updateSettings } = useRoutePlannerSettings();

  return (
    <RoutePlannerSetup
      locale={locale}
      pieceSelection={settings.pieceSelection}
      onPieceSelect={(pieceSelection) => updateSettings({ pieceSelection })}
    />
  );
}
