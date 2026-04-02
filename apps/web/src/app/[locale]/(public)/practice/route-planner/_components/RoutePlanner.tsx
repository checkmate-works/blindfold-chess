'use client';

import { usePersistentSettings } from '@/app/[locale]/(public)/practice/_hooks/use-persistent-settings';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { RoutePlannerPieceSelection } from '../_lib/utils';
import { RoutePlannerPageContent } from './RoutePlannerPageContent';
import { STORAGE_KEY } from './constants';

type Props = {
  locale: Locale;
};

type RoutePlannerLocalSettings = {
  pieceSelection: RoutePlannerPieceSelection;
};
const DEFAULTS: RoutePlannerLocalSettings = {
  pieceSelection: 'n',
};

export default function RoutePlanner({ locale }: Props) {
  const { settings, updateSettings } = usePersistentSettings(STORAGE_KEY, DEFAULTS);

  return (
    <RoutePlannerPageContent
      locale={locale}
      pieceSelection={settings.pieceSelection}
      onPieceSelect={(pieceSelection) => updateSettings({ pieceSelection })}
    />
  );
}
