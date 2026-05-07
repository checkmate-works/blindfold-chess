'use client';

import { useLocalStorageSettings } from '@/lib/persistent-settings/use-local-storage-settings';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { RoutePlannerPieceSelection } from '../_lib/utils';
import { RoutePlannerSetup } from './RoutePlannerSetup';
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
  const { settings, updateSettings } = useLocalStorageSettings(STORAGE_KEY, DEFAULTS);

  return (
    <RoutePlannerSetup
      locale={locale}
      pieceSelection={settings.pieceSelection}
      onPieceSelect={(pieceSelection) => updateSettings({ pieceSelection })}
    />
  );
}
