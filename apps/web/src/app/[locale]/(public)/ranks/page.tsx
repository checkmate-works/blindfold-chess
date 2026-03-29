/**
 * Ranks Page (段級位一覧)
 *
 * @description
 * Displays all belt ranks and their requirements in the blindfold chess
 * training progression system. Shows defined ranks with their score
 * thresholds and visual state indicators: achieved ✓, next (actionable),
 * locked 🔒 (conditions not yet defined), or Coming Soon (not in DB).
 *
 * @flow
 * 1. Fetch all ranks from the database (ordered by level ascending).
 * 2. Optionally fetch the current user's achieved ranks (if logged in).
 * 3. Render each rank as a card with belt color indicator and state overlay.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { HiCheckCircle, HiLockClosed } from 'react-icons/hi2';

import { ALL_RANK_SLUGS, RANK_COLORS } from '@/lib/db/data/ranks';
import type { ChallengeScoreRequirement, RankSlug } from '@/lib/db/data/ranks';
import { createClient } from '@/lib/supabase/server';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { getAllRanks, getUserAchievedRankIds } from './_lib/queries';

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

type RankCardState = 'achieved' | 'next' | 'locked' | 'coming-soon';

function getRankCardState(
  inDb: boolean,
  requirements: ChallengeScoreRequirement[],
  isAchieved: boolean,
  previousAchieved: boolean,
  isLoggedIn: boolean,
  isFirstRank: boolean
): RankCardState {
  // Not in DB = Coming Soon
  if (!inDb) return 'coming-soon';

  // Has empty requirements = coming soon (conditions not yet defined)
  if (requirements.length === 0) return 'coming-soon';

  // Logged in: check achievement
  if (isLoggedIn) {
    if (isAchieved) return 'achieved';
    if (isFirstRank || previousAchieved) return 'next';
    return 'locked';
  }

  // Not logged in: first rank is visible, rest are locked
  if (isFirstRank) return 'next';
  return 'locked';
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dbRanks = await getAllRanks();
  const dbRanksBySlug = new Map(dbRanks.map((r) => [r.slug, r]));

  const achievedRankIds = user ? await getUserAchievedRankIds(user.id) : new Set<string>();

  // Build a set of achieved slugs for easier lookup
  const achievedSlugs = new Set<string>();
  for (const rank of dbRanks) {
    if (achievedRankIds.has(rank.id)) {
      achievedSlugs.add(rank.slug);
    }
  }

  return (
    <div className="space-y-8">
      <PageTitle>{t('pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('pageTitle')}</SectionTitle>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_RANK_SLUGS.map((slug, index) => {
            const rank = dbRanksBySlug.get(slug);
            const beltColor = getBeltColorHex(slug);
            const isFirstRank = index === 0;
            const previousSlug = index > 0 ? ALL_RANK_SLUGS[index - 1] : undefined;
            const previousAchieved = previousSlug ? achievedSlugs.has(previousSlug) : false;
            const isAchieved = achievedSlugs.has(slug);
            const requirements = rank ? parseRequirements(rank.requirements) : [];

            const state = getRankCardState(
              !!rank,
              requirements,
              isAchieved,
              previousAchieved,
              !!user,
              isFirstRank
            );

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

                    {/* Requirements (only for ranks with defined requirements) */}
                    {requirements.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
                          {t('requirements')}
                        </h4>
                        <ul className="space-y-2">
                          {requirements.map((req, i) => {
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

                    {/* Placeholder height for overlay cards */}
                    {(state === 'coming-soon' || state === 'locked') && <div className="h-8" />}
                  </div>
                </div>

                {/* Achieved badge */}
                {state === 'achieved' && (
                  <div className="absolute right-3 top-3">
                    <HiCheckCircle className="size-6 text-emerald-500" />
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
