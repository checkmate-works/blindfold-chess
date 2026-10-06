import type { ServerTranslator } from '@/i18n/translator';

import type { createAdminClient } from '@/lib/supabase/admin';

import type { AdminUserFilters } from '../_lib/filters';
import { buildLevelBucketNames } from '../_lib/level-names';
import {
  fetchCountryStats,
  fetchLevelStats,
  fetchRankStats,
  fetchSignupMethodStats,
} from '../_lib/queries';
import { buildRankNames } from '../_lib/rank-names';
import type { SIGNUP_METHOD_ORDER } from '../_lib/signup-method';
import { CountryBarChart } from './CountryBarChart';
import { LevelBarChart } from './LevelBarChart';
import { RankBarChart } from './RankBarChart';
import { SignupMethodChart } from './SignupMethodChart';
import { StatsChartNav } from './StatsChartNav';

type Translator = ServerTranslator;
type AdminClient = ReturnType<typeof createAdminClient>;
type ProviderNames = Record<(typeof SIGNUP_METHOD_ORDER)[number], string>;

/** Anchor ids of the chart sections, in page order. Shared with the jump nav. */
const SECTION_IDS = ['country', 'rank', 'level', 'signup-method'] as const;
type SectionId = (typeof SECTION_IDS)[number];

const SECTION_TITLE_KEY: Record<SectionId, string> = {
  country: 'stats.usersByCountry',
  rank: 'stats.usersByRank',
  level: 'stats.usersByLevel',
  'signup-method': 'stats.usersBySignupMethod',
};

/**
 * The user statistics charts. Owns the parallel chart-data fetches
 * (country / rank / level / signup method), all sliced from one cached
 * population so the four charts agree with each other, and renders each
 * behind a `StatsChartNav` so a bar click cross-filters into the users list.
 *
 * The charts stay on one page rather than one route per axis because they are
 * four views of the same population: the admin reads them side by side, and a
 * single `getFilteredPopulation` pass serves all of them. The jump nav at the
 * top is for getting to one chart quickly, not for isolating it.
 */
export async function UserStatsCharts({
  adminClient,
  filters,
  providerNames,
  t,
}: {
  adminClient: AdminClient;
  filters: AdminUserFilters;
  providerNames: ProviderNames;
  t: Translator;
}) {
  const [countryStats, rankStats, levelStats, signupMethodStats] = await Promise.all([
    fetchCountryStats(adminClient, filters),
    fetchRankStats(adminClient, filters),
    fetchLevelStats(adminClient, filters),
    fetchSignupMethodStats(adminClient, filters),
  ]);

  const rankNames = buildRankNames(t);
  const levelNames = buildLevelBucketNames(t);
  const sectionTitle = (id: SectionId) => t(SECTION_TITLE_KEY[id]);

  return (
    <div className="space-y-6">
      <nav aria-label={t('stats.jumpTo')} className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">{t('stats.jumpTo')}</span>
        {SECTION_IDS.map((id) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-full border border-border bg-muted px-3 py-1 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {sectionTitle(id)}
          </a>
        ))}
      </nav>

      <section id="country" className="bg-card border border-border rounded-lg p-6 scroll-mt-6">
        <h2 className="text-lg font-semibold mb-4">{sectionTitle('country')}</h2>
        <StatsChartNav type="country">
          <CountryBarChart
            data={countryStats}
            labels={{
              noData: t('stats.noData'),
              users: t('stats.users'),
              unknown: t('stats.unknownCountry'),
            }}
          />
        </StatsChartNav>
      </section>

      <section id="rank" className="bg-card border border-border rounded-lg p-6 scroll-mt-6">
        <h2 className="text-lg font-semibold mb-4">{sectionTitle('rank')}</h2>
        <StatsChartNav type="rank">
          <RankBarChart
            data={rankStats}
            labels={{
              noData: t('stats.noData'),
              users: t('stats.users'),
            }}
            rankNames={rankNames}
          />
        </StatsChartNav>
      </section>

      <section id="level" className="bg-card border border-border rounded-lg p-6 scroll-mt-6">
        <h2 className="text-lg font-semibold mb-1">{sectionTitle('level')}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t('stats.usersByLevelHelp')}</p>
        <StatsChartNav type="level">
          <LevelBarChart
            data={levelStats}
            labels={{
              noData: t('stats.noData'),
              users: t('stats.users'),
            }}
            bucketNames={levelNames}
          />
        </StatsChartNav>
      </section>

      <section
        id="signup-method"
        className="bg-card border border-border rounded-lg p-6 scroll-mt-6"
      >
        <h2 className="text-lg font-semibold mb-4">{sectionTitle('signup-method')}</h2>
        <StatsChartNav type="provider">
          <SignupMethodChart
            data={signupMethodStats}
            labels={{
              noData: t('stats.noData'),
              users: t('stats.users'),
            }}
            methodNames={providerNames}
          />
        </StatsChartNav>
      </section>
    </div>
  );
}
