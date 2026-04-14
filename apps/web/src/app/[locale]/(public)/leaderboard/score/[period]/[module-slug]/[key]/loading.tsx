import { PagePanel } from '@/app/[locale]/_components';

/**
 * Loading skeleton for the score leaderboard detail page. Mirrors the
 * resolved DOM: SectionTitle + PeriodSelector (labeled select) + table
 * (header + 20 rows) + pagination + full-width Try This Challenge CTA +
 * back link.
 */
export default function ScoreLeaderboardDetailLoading() {
  return (
    <PagePanel>
      <div className="space-y-8">
        {/* SectionTitle (module + period label) */}
        <div className="h-8 w-72 animate-pulse rounded bg-muted" />

        {/* PeriodSelector (visible label + select box) */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-9 w-32 rounded-md border border-border bg-card" />
        </div>

        {/* Table: header + 20 rows */}
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="h-10 bg-muted" />
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="h-12 border-t border-border" />
          ))}
        </div>

        {/* Pagination (3 buttons) */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 w-9 rounded-md bg-muted" />
          ))}
        </div>
      </div>

      {/* ChallengeLink — full-width pill, wrapper matches pt-4 from the real component */}
      <div className="pt-4">
        <div className="h-11 w-full rounded-md bg-primary/30" />
      </div>

      {/* Back link — centered, mt-4 matches the real component */}
      <div className="mt-4 text-center">
        <div className="mx-auto h-4 w-24 rounded bg-muted" />
      </div>
    </PagePanel>
  );
}
