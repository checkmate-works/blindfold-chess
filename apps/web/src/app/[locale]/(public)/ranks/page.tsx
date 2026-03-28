/**
 * Ranks Page (段級位一覧)
 *
 * @description
 * Displays all belt ranks and their requirements in the blindfold chess
 * training progression system. Shows defined ranks with their score
 * thresholds and a "Coming Soon" overlay for future ranks.
 *
 * @flow
 * 1. Fetch all ranks from the database (ordered by level ascending).
 * 2. Render each rank as a card with belt color indicator and requirements.
 * 3. Ranks not yet in the DB are shown with a smoke overlay and "Coming Soon" label.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { HiCheckCircle } from 'react-icons/hi2';

import { ALL_RANK_SLUGS, RANK_COLORS } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { getAllRanks } from './_lib/queries';

export const dynamic = 'force-dynamic';

/** Map rank color names to CSS hex values. */
const BELT_COLOR_HEX: Record<string, string> = {
  orange: '#f97316',
  blue: '#3b82f6',
  yellow: '#eab308',
  green: '#22c55e',
  brown: '#92400e',
  black: '#1c1917',
};

type ChallengeScoreRequirement = {
  type: 'challenge_score';
  menuType: string;
  leaderboardKey: string;
  minScore: number;
};

function isChallengeScoreRequirement(value: unknown): value is ChallengeScoreRequirement {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as Record<string, unknown>).type === 'challenge_score' &&
    'menuType' in value &&
    typeof (value as Record<string, unknown>).menuType === 'string' &&
    'leaderboardKey' in value &&
    typeof (value as Record<string, unknown>).leaderboardKey === 'string' &&
    'minScore' in value &&
    typeof (value as Record<string, unknown>).minScore === 'number'
  );
}

function parseRequirements(raw: unknown): ChallengeScoreRequirement[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isChallengeScoreRequirement);
}

function buildChallengeNameKey(req: ChallengeScoreRequirement): string {
  if (req.leaderboardKey === 'default') {
    return req.menuType;
  }
  return `${req.menuType}_${req.leaderboardKey}`;
}

function getBeltColorHex(slug: RankSlug): string {
  const colorName = RANK_COLORS[slug];
  return BELT_COLOR_HEX[colorName] ?? '#6b7280';
}

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.ranks' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'ranks' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function RanksPage({ params }: LocalePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ranks' });

  const dbRanks = await getAllRanks();
  const dbRanksBySlug = new Map(dbRanks.map((r) => [r.slug, r]));

  return (
    <div className="space-y-8">
      <PageTitle>{t('pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('pageTitle')}</SectionTitle>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_RANK_SLUGS.map((slug) => {
            const rank = dbRanksBySlug.get(slug);
            const beltColor = getBeltColorHex(slug);
            const isDefined = !!rank;

            return (
              <div key={slug} className="relative">
                {/* Rank card */}
                <div className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                  {/* Belt color bar */}
                  <div className="h-2" style={{ backgroundColor: beltColor }} />

                  <div className="space-y-4 p-4 sm:p-5">
                    {/* Rank name with color badge */}
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-block size-4 shrink-0 rounded-full"
                        style={{ backgroundColor: beltColor }}
                      />
                      <h3 className="text-lg font-bold text-foreground">
                        {t(`rankNames.${slug}`)}
                      </h3>
                    </div>

                    {/* Requirements (only for defined ranks) */}
                    {isDefined && (
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
                          {t('requirements')}
                        </h4>
                        <ul className="space-y-2">
                          {parseRequirements(rank.requirements).map((req, i) => {
                            const challengeKey = buildChallengeNameKey(req);
                            return (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-sm text-foreground"
                              >
                                <HiCheckCircle className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                                <span>
                                  {t('challengeScore', {
                                    minScore: req.minScore,
                                    challengeName: t(`challengeNames.${challengeKey}`),
                                  })}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {/* Placeholder height for coming soon cards */}
                    {!isDefined && <div className="h-8" />}
                  </div>
                </div>

                {/* Coming Soon overlay */}
                {!isDefined && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-foreground/30 backdrop-blur-sm">
                    <span className="text-sm font-semibold text-card">{t('comingSoon')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Divider />

        <Breadcrumb items={[{ label: t('pageTitle') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
