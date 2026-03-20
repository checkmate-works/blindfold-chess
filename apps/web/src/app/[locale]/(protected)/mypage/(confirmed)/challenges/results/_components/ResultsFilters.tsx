'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { PieceSelector } from '@/app/_components';
import type { PieceSelection } from '@/app/_components/practice/PieceSelector';

import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';

import { BoardOrientationSelector } from '@/app/[locale]/(public)/practice/_components/BoardOrientationSelector';

import { ORIENTATION_FILTER_MENUS, PIECE_FILTER_MENUS } from '../../_hooks/use-dashboard-data';

const selectClassName =
  'px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring';

const PIECE_NAME_TO_SHORT: Record<string, PieceSelection> = {
  king: 'k',
  queen: 'q',
  rook: 'r',
  bishop: 'b',
  knight: 'n',
  random: 'random',
};

const PIECE_SHORT_TO_NAME: Record<string, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
};

type BoardOrientation = 'white' | 'black' | 'random';

type Props = {
  locale: string;
  availableMenuTypes: ChallengeMenuType[];
  currentMenu?: ChallengeMenuType;
  currentKey?: string;
};

function buildResultsHref(locale: string, menu?: string, key?: string): string {
  const params = new URLSearchParams();
  if (menu) params.set('menu', menu);
  if (key) params.set('key', key);
  const qs = params.toString();
  return `/${locale}/mypage/challenges/results${qs ? `?${qs}` : ''}`;
}

function getDefaultKey(menu: ChallengeMenuType): string | undefined {
  if (ORIENTATION_FILTER_MENUS.has(menu)) return 'white';
  if (PIECE_FILTER_MENUS.has(menu)) return 'random';
  return undefined;
}

export function ResultsFilters({ locale, availableMenuTypes, currentMenu, currentKey }: Props) {
  const t = useTranslations('Mypage');
  const tResults = useTranslations('MypageChallengeResults');
  const router = useRouter();

  const handleMenuChange = (value: string) => {
    const menu = value || undefined;
    const defaultKey = menu ? getDefaultKey(menu as ChallengeMenuType) : undefined;
    router.push(buildResultsHref(locale, menu, defaultKey));
  };

  const handleOrientationChange = (value: BoardOrientation) => {
    router.push(buildResultsHref(locale, currentMenu, value));
  };

  const handlePieceSelect = (selection: PieceSelection) => {
    const key = selection === 'random' ? 'random' : (PIECE_SHORT_TO_NAME[selection] ?? 'random');
    router.push(buildResultsHref(locale, currentMenu, key));
  };

  const currentPieceSelection: PieceSelection = currentKey
    ? (PIECE_NAME_TO_SHORT[currentKey] ?? 'random')
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
