import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { getDailyPuzzle } from '@/lib/positions/queries';
import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';

import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';

import { Button } from './Button';

type Props = {
  locale: string;
  /**
   * `'full'` (default) — the tall marketing card used on the signed-in
   * dashboard: full-width board on top, uppercase label, title, description,
   * bottom-right CTA.
   *
   * `'compact'` — the shorter banner used atop the practice index, where the
   * card sits above a dense module grid: the board stays prominent on the
   * left (~half the card), the description is dropped and the padding
   * tightened, and the "Daily Puzzle" name is lifted out into a `SectionTitle`
   * so it reads as a page section like the difficulty groups below it. The
   * heading is rendered inside this component (not by the caller) so it is
   * gated on the puzzle existing — no orphan heading when there is none.
   */
  variant?: 'full' | 'compact';
};

/**
 * "Daily Puzzle" card — one puzzle per day, linking to its practice page.
 *
 * Async Server Component, so it must NOT be re-exported from the
 * `_components` barrel; import it by path. Rendered on the signed-in
 * dashboard (`/`) and at the top of the practice index (`/[locale]/practice`);
 * both share the same puzzle for the day because `getDailyPuzzle` is seeded
 * on the UTC date. The pick comes from the admin-curated `featured_puzzles`
 * pool; when the pool is empty this renders `null`, which is the intended
 * "no daily puzzle" state — both variants (and the compact variant's
 * SectionTitle) disappear together.
 *
 * Copy still lives under the `landing` i18n namespace, where the card was
 * first introduced. Kept there deliberately: renaming the keys would mean
 * touching every locale file for no user-visible gain.
 */
export async function DailyPuzzleCard({ locale, variant = 'full' }: Props) {
  const t = await getTranslations({ locale, namespace: 'landing' });
  const puzzle = await getDailyPuzzle();

  if (!puzzle) return null;

  const href = `/practice/puzzle/${puzzle.id}`;
  const label = t('dashboard.dailyPuzzleTitle');
  const action = t('dashboard.dailyPuzzleAction');

  if (variant === 'compact') {
    return (
      <section className="space-y-4">
        <SectionTitle>{label}</SectionTitle>
        <div className="flex justify-center">
          {/* Board stays on the left even on mobile (no flex-col) so the card
              keeps its short banner height on every viewport. */}
          <div className="w-full max-w-xl bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="flex">
              <div className="w-32 sm:w-36 h-32 sm:h-36 flex-shrink-0 bg-muted">
                <ThemedBoardThumbnail fen={puzzle.fen} className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0 p-4 flex flex-col justify-center gap-3">
                <h4 className="text-base font-bold text-foreground line-clamp-2">{puzzle.title}</h4>
                <Link href={href} locale={locale} className="self-end">
                  <Button variant="primary" size="sm" className="rounded-full">
                    {action}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row">
        <div className="w-full sm:w-48 h-48 flex-shrink-0 bg-muted">
          <ThemedBoardThumbnail fen={puzzle.fen} className="w-full h-full" />
        </div>
        <div className="flex-1 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">
              {label}
            </h3>
            <h4 className="text-xl font-bold text-foreground line-clamp-1 mb-2">{puzzle.title}</h4>
            {puzzle.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {puzzle.description}
              </p>
            )}
          </div>
          <div className="flex justify-end">
            <Link href={href} locale={locale}>
              <Button variant="primary" size="sm" className="rounded-full px-6">
                {action}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
