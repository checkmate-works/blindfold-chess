import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { getDailyPosition } from '@/lib/positions/queries';
import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';

import { Button } from './Button';

type Props = {
  locale: string;
};

/**
 * "Daily Puzzle" card — one puzzle per day, linking to its practice page.
 *
 * Async Server Component, so it must NOT be re-exported from the
 * `_components` barrel; import it by path. Rendered on the signed-in
 * dashboard (`/`) and at the top of the practice index (`/[locale]/practice`);
 * both share the same puzzle for the day because `getDailyPosition` is seeded
 * on the UTC date.
 *
 * Copy still lives under the `landing` i18n namespace, where the card was
 * first introduced. Kept there deliberately: renaming the keys would mean
 * touching every locale file for no user-visible gain.
 */
export async function DailyPuzzleCard({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'landing' });
  const puzzle = await getDailyPosition({ type: 'puzzle' });

  if (!puzzle) return null;

  return (
    <div className="w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row">
        <div className="w-full sm:w-48 h-48 flex-shrink-0 bg-muted">
          <ThemedBoardThumbnail fen={puzzle.fen} className="w-full h-full" />
        </div>
        <div className="flex-1 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">
              {t('dashboard.dailyPuzzleTitle')}
            </h3>
            <h4 className="text-xl font-bold text-foreground line-clamp-1 mb-2">{puzzle.title}</h4>
            {puzzle.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {puzzle.description}
              </p>
            )}
          </div>
          <div className="flex justify-end">
            <Link href={`/practice/puzzle/${puzzle.id}`} locale={locale}>
              <Button variant="primary" size="sm" className="rounded-full px-6">
                {t('dashboard.dailyPuzzleAction')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
