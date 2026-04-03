import Link from 'next/link';

import { HiCheckCircle, HiChevronRight, HiLockClosed } from 'react-icons/hi2';

import type { RankCardState } from '../_lib/helpers';
import { RequirementsList } from './RequirementsList';

type RankCardProps = {
  slug: string;
  locale: string;
  beltColor: string;
  rankName: string;
  state: RankCardState;
  requirementLabels: string[];
  requirementsHeading: string;
  comingSoonLabel: string;
};

export function RankCard({
  slug,
  locale,
  beltColor,
  rankName,
  state,
  requirementLabels,
  requirementsHeading,
  comingSoonLabel,
}: RankCardProps) {
  const isClickable = state === 'achieved' || state === 'next';

  // White belt needs a visible border since #ffffff is invisible on light backgrounds
  const isWhiteBelt = beltColor === '#ffffff';

  const cardContent = (
    <>
      {/* Belt color bar */}
      <div
        className="h-2"
        style={{
          backgroundColor: beltColor,
          ...(isWhiteBelt ? { borderBottom: '1px solid #d4d4d4' } : {}),
        }}
      />

      <div className="space-y-4 p-4 sm:p-5">
        {/* Rank name with color badge */}
        <div className="flex items-center gap-3">
          <span
            className="inline-block size-4 shrink-0 rounded-full"
            style={{
              backgroundColor: beltColor,
              ...(isWhiteBelt ? { border: '1px solid #d4d4d4' } : {}),
            }}
          />
          <h3 className="text-lg font-bold text-foreground">{rankName}</h3>
          {state === 'achieved' && (
            <>
              <HiCheckCircle className="ml-auto size-6 shrink-0 text-emerald-500" />
              <HiChevronRight
                className="size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </>
          )}
          {state === 'next' && (
            <HiChevronRight
              className="ml-auto size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Requirements (only for ranks with defined requirements) */}
        {requirementLabels.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
              {requirementsHeading}
            </h4>
            <RequirementsList items={requirementLabels} />
          </div>
        )}

        {/* Placeholder height for overlay cards */}
        {(state === 'coming-soon' || state === 'locked') && <div className="h-8" />}
      </div>
    </>
  );

  return (
    <div className="relative">
      {/* Rank card */}
      {isClickable ? (
        <Link
          href={`/${locale}/ranks/${slug}`}
          className="block relative overflow-hidden rounded-lg border border-border bg-card shadow-sm hover:border-foreground/20 transition-colors"
        >
          {cardContent}
        </Link>
      ) : (
        <div className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          {cardContent}
        </div>
      )}

      {/* Locked overlay */}
      {state === 'locked' && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-foreground/30 backdrop-blur-sm">
          <HiLockClosed className="size-6 text-card" />
        </div>
      )}

      {/* Coming Soon overlay */}
      {state === 'coming-soon' && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-foreground/30 backdrop-blur-sm">
          <span className="text-sm font-semibold text-card">{comingSoonLabel}</span>
        </div>
      )}
    </div>
  );
}
