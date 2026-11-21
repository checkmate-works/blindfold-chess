/**
 * Convention guard: every read of `challenge_results` composes the
 * live-result predicate.
 *
 * Moderation removes a challenge result by setting `deleted_at`; the row stays
 * in the table. Nothing in the schema stops a query from reading it back, so a
 * removed score disappears only from the reads that remember to filter it —
 * and those reads are spread over the rankings, the per-user history, the
 * score comparison, the monthly badges and the feed. One forgotten read puts a
 * removed score back on a leaderboard, and review alone does not catch a new
 * read added months later. This test does.
 *
 * A source file under `src/` (tests excluded) that reads the table must
 * contain one of:
 * - `liveChallengeResult(` — the drizzle predicate from
 *   `./challenge-results-visibility`, for query-builder reads and for raw SQL
 *   that interpolates the unaliased table;
 * - `deleted_at IS NULL` — for raw SQL that reads the table under an alias,
 *   which the unaliased drizzle predicate cannot target.
 *
 * "Reads the table" means a FROM or JOIN of it: `.from(challengeResults)`,
 * `.innerJoin(challengeResults, …)` and its siblings, raw `FROM
 * challenge_results` / `JOIN challenge_results` (any case), or
 * `FROM ${challengeResults}` inside a `sql` template. Writes —
 * `.insert(challengeResults)`, `.update(…)` — are not reads and are not
 * matched. Comments are stripped before matching, so prose that mentions the
 * table neither counts as a read nor as composing the predicate.
 *
 * The check is per file, not per query: a file with two reads that filters
 * only one of them still passes. The per-query tests of those files (the
 * mypage history, the score comparison) assert the predicate in each WHERE.
 *
 * A file that has to see removed results on purpose goes in
 * {@link READS_REMOVED_RESULTS_ON_PURPOSE} with the reason. An entry may name
 * a file that does not exist yet; it is only consulted for files the scan
 * finds.
 */
import fg from 'fast-glob';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Paths relative to `apps/web`, mapped to why they read removed results. */
const READS_REMOVED_RESULTS_ON_PURPOSE: Record<string, string> = {
  'src/app/admin/challenge-results/_lib/queries.ts':
    'The moderation screen lists removed results alongside live ones, so an admin can see what was removed.',
};

const READ_PATTERNS: RegExp[] = [
  // Drizzle query builder: .from(challengeResults), .innerJoin(challengeResults, ...)
  /\.from\(\s*challengeResults\b/,
  /Join\(\s*challengeResults\b/,
  // Raw SQL naming the table.
  /\b(?:from|join)\s+challenge_results\b/i,
  // sql`` template interpolating the table object.
  /\b(?:from|join)\s+\$\{\s*challengeResults\s*\}/i,
];

const LIVE_MARKERS = ['liveChallengeResult(', 'deleted_at IS NULL'];

const webRoot = join(__dirname, '..', '..', '..');

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

async function scanReaders(): Promise<Array<{ rel: string; live: boolean }>> {
  const files = await fg('src/**/*.{ts,tsx}', {
    cwd: webRoot,
    absolute: true,
    ignore: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts', 'src/**/*.spec.tsx'],
  });

  const readers: Array<{ rel: string; live: boolean }> = [];
  for (const abs of files) {
    const code = stripComments(readFileSync(abs, 'utf8'));
    if (!READ_PATTERNS.some((re) => re.test(code))) continue;
    readers.push({
      rel: relative(webRoot, abs),
      live: LIVE_MARKERS.some((marker) => code.includes(marker)),
    });
  }
  return readers;
}

describe('challenge_results reads compose the live-result predicate', () => {
  it('finds the known readers, and not the insert-only writer', async () => {
    // Guards the scan itself: if the glob or a pattern stopped matching, the
    // real assertion below would pass vacuously.
    const readers = (await scanReaders()).map((r) => r.rel);
    expect(readers).toEqual(
      expect.arrayContaining([
        'src/lib/db/challenge-queries.ts',
        'src/lib/db/score-comparison.ts',
        'src/lib/achievements/grant-monthly-leaderboard-badges.ts',
        'src/app/[locale]/(public)/(home)/_lib/feed-liveness.ts',
        'src/app/[locale]/(protected)/mypage/(confirmed)/challenges/_lib/queries.ts',
        'src/app/[locale]/(protected)/mypage/(confirmed)/challenges/_actions/get-challenge-sessions.ts',
      ])
    );
    expect(readers).not.toContain('src/lib/db/save-challenge-result.ts');
  });

  it('every file that reads challenge_results filters out removed results', async () => {
    const offenders = (await scanReaders())
      .filter((r) => !r.live && !(r.rel in READS_REMOVED_RESULTS_ON_PURPOSE))
      .map((r) => r.rel);

    expect(
      offenders,
      offenders
        .map(
          (rel) =>
            `${rel} reads challenge_results without excluding results removed by moderation. ` +
            'Add liveChallengeResult() (from @/lib/db/challenge-results-visibility) to the ' +
            'and(...) of each query on the table, or, in raw SQL that aliases the table, add `<alias>.deleted_at IS NULL` to its WHERE. ' +
            'If this file must see removed results on purpose, add it to ' +
            'READS_REMOVED_RESULTS_ON_PURPOSE in src/lib/db/challenge-results-live-reads.test.ts with the reason.'
        )
        .join('\n')
    ).toEqual([]);
  });
});
