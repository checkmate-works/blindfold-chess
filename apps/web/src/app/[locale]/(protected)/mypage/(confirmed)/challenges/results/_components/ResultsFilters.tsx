'use client';

import { useRouter } from 'next/navigation';

import { PieceSelector } from '@/app/_components';
import type { PieceSelection } from '@/app/_components/practice/PieceSelector';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { BoardOrientation } from '@blindfold-chess/types';

import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';

import { BoardOrientationSelector } from '@/app/[locale]/(public)/practice/(challenge)/_components/BoardOrientationSelector';

import {
  PIECE_NAME_TO_SHORT,
  PIECE_SHORT_TO_NAME,
  type PieceFullName,
} from '../../_lib/derive-piece-filter';
import { ORIENTATION_FILTER_MENUS, PIECE_FILTER_MENUS } from '../../_lib/keyed-menus';
import { buildResultsPath } from '../../_lib/results-href';
import { selectClassName } from '../../_lib/ui-constants';

type Props = {
  locale: string;
  availableMenuTypes: ChallengeMenuType[];
  currentMenu?: ChallengeMenuType;
  currentKey?: string;
};

function buildResultsHref(locale: string, menu?: string, key?: string): string {
  return `/${locale}${buildResultsPath(menu, key)}`;
}

export function ResultsFilters({ locale, availableMenuTypes, currentMenu, currentKey }: Props) {
  const t = useTranslations('Mypage');
  const tResults = useTranslations('MypageChallengeResults');
  const router = useRouter();

  // No key on a menu change: the page resolves it from the player's most
  // recent record for that menu, so a keyed menu never opens on a key they
  // have not played.
  const handleMenuChange = (value: string) => {
    router.push(buildResultsHref(locale, value || undefined));
  };

  const handleOrientationChange = (value: BoardOrientation) => {
    router.push(buildResultsHref(locale, currentMenu, value));
  };

  const handlePieceSelect = (selection: PieceSelection) => {
    const key =
      selection === 'random'
        ? 'random'
        : (PIECE_SHORT_TO_NAME[selection as keyof typeof PIECE_SHORT_TO_NAME] ?? 'random');
    router.push(buildResultsHref(locale, currentMenu, key));
  };

  const currentPieceSelection: PieceSelection =
    currentKey && currentKey in PIECE_NAME_TO_SHORT
      ? (PIECE_NAME_TO_SHORT[currentKey as PieceFullName] ?? 'random')
      : 'random';

  const currentOrientation: BoardOrientation =
    currentKey === 'white' || currentKey === 'black' || currentKey === 'random'
      ? currentKey
      : 'white';

  return (
    <div className="space-y-4">
      <select
        value={currentMenu ?? ''}
        onChange={(e) => handleMenuChange(e.target.value)}
        className={`block w-full sm:w-64 ${selectClassName}`}
      >
        <option value="">{tResults('allMenuTypes')}</option>
        {availableMenuTypes.map((type) => (
          <option key={type} value={type}>
            {t(`menuTypes.${type}`)}
          </option>
        ))}
      </select>

      {currentMenu && ORIENTATION_FILTER_MENUS.has(currentMenu) && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {t('filters.boardOrientation')}
          </label>
          <BoardOrientationSelector
            value={currentOrientation}
            onChange={handleOrientationChange}
            labels={{
              title: t('filters.boardOrientation'),
              white: t('filters.white'),
              black: t('filters.black'),
              random: t('filters.random'),
            }}
            size="compact"
            hideLabel
            hideOptionLabels
          />
        </div>
      )}

      {currentMenu && PIECE_FILTER_MENUS.has(currentMenu) && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {t('filters.selectedPiece')}
          </label>
          <PieceSelector
            selected={currentPieceSelection}
            onSelect={handlePieceSelect}
            getLabel={(s) => t(`filters.pieces.${s}`)}
          />
        </div>
      )}
    </div>
  );
}
