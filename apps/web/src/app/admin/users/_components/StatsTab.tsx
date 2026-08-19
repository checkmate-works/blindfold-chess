import type { ServerTranslator } from '@/i18n/translator';

import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import type { createAdminClient } from '@/lib/supabase/admin';

import type { AdminUserFilters } from '../_lib/filters';
import { fetchCountryStats, fetchRankStats, fetchSignupMethodStats } from '../_lib/queries';
import type { SIGNUP_METHOD_ORDER } from '../_lib/signup-method';
import { CountryBarChart } from './CountryBarChart';
import { RankBarChart } from './RankBarChart';
import { SignupMethodChart } from './SignupMethodChart';
import { StatsChartNav } from './StatsChartNav';

type Translator = ServerTranslator;
type AdminClient = ReturnType<typeof createAdminClient>;
type ProviderNames = Record<(typeof SIGNUP_METHOD_ORDER)[number], string>;

/**
 * Server-rendered "Statistics" tab. Owns the three parallel chart-data
 * fetches (country / rank / signup method) and renders each behind a
 * `StatsChartNav` so a bar click on any chart cross-filters into the
 * list tab. Extracted from the page so the page module only dispatches
 * between tab variants.
 */
export async function StatsTab({
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
  const [countryStats, rankStats, signupMethodStats] = await Promise.all([
    fetchCountryStats(adminClient, filters),
    fetchRankStats(adminClient, filters),
    fetchSignupMethodStats(adminClient, filters),
  ]);

  const rankNames: Record<string, string> = {};
  for (const slug of ALL_RANK_SLUGS) {
    rankNames[slug] = t(`stats.rankNames.${slug}`);
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">{t('stats.usersByCountry')}</h2>
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
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">{t('stats.usersByRank')}</h2>
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
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">{t('stats.usersBySignupMethod')}</h2>
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
      </div>
    </div>
  );
}
