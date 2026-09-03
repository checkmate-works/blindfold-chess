'use client';

import { PieceSelector } from '@/app/_components';
import type { PieceSelection } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { BoardOrientation } from '@blindfold-chess/types';

import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';

import { BoardOrientationSelector } from '@/app/[locale]/(public)/practice/(challenge)/_components/BoardOrientationSelector';

import { ORIENTATION_FILTER_MENUS, PIECE_FILTER_MENUS } from '../_lib/keyed-menus';
import type { DatePeriod } from '../_lib/period-utils';
import { selectClassName } from '../_lib/ui-constants';

// Period selection is intentionally restricted to a few fixed ranges.
// Rationale:
// (1) Old data is not a useful reference point for measuring practice progress.
// (2) We plan to run periodic data cleanup, so long-term data retention is not
//     an assumption of this UI.

const DATE_PERIODS: DatePeriod[] = ['thisWeek', 'lastWeek', 'thisMonth', 'lastMonth'];

type MenuOption = {
  value: ChallengeMenuType;
  label: string;
};

type DashboardFiltersProps = {
  selectedPeriod: DatePeriod;
  setSelectedPeriod: (period: DatePeriod) => void;
  selectedMenu: ChallengeMenuType | null;
  setSelectedMenu: (menu: ChallengeMenuType) => void;
  menuOptions: MenuOption[];
  boardOrientationFilter: BoardOrientation;
  setBoardOrientationFilter: (v: BoardOrientation) => void;
  pieceFilter: PieceSelection;
  handlePieceSelect: (piece: PieceSelection) => void;
};

export function DashboardFilters({
  selectedPeriod,
  setSelectedPeriod,
  selectedMenu,
  setSelectedMenu,
  menuOptions,
  boardOrientationFilter,
  setBoardOrientationFilter,
  pieceFilter,
  handlePieceSelect,
}: DashboardFiltersProps) {
  const t = useTranslations('Mypage');

  return (
    <>
      <select
        value={selectedPeriod}
        onChange={(e) => setSelectedPeriod(e.target.value as DatePeriod)}
        className={`block w-full sm:w-48 ${selectClassName}`}
      >
        {DATE_PERIODS.map((period) => (
          <option key={period} value={period}>
            {t(`periods.${period}`)}
          </option>
        ))}
      </select>

      {menuOptions.length > 0 && (
        <select
          value={selectedMenu ?? ''}
          onChange={(e) => setSelectedMenu(e.target.value as ChallengeMenuType)}
          className={`block w-full sm:w-64 ${selectClassName}`}
        >
          {menuOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {selectedMenu && ORIENTATION_FILTER_MENUS.has(selectedMenu) && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {t('filters.boardOrientation')}
          </label>
          <BoardOrientationSelector
            value={boardOrientationFilter}
            onChange={setBoardOrientationFilter}
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

      {selectedMenu && PIECE_FILTER_MENUS.has(selectedMenu) && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {t('filters.selectedPiece')}
          </label>
          <PieceSelector
            selected={pieceFilter}
            onSelect={handlePieceSelect}
            getLabel={(s) => t(`filters.pieces.${s}`)}
          />
        </div>
      )}
    </>
  );
}
