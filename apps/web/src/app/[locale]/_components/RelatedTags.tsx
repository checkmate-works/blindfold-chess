import { Link } from '@/i18n/routing';

import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';
import { buildGlossaryUrlForSlug } from '@/lib/themes/url';

import type { Locale } from '@/app/[locale]/_lib/types';

type ChunkSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  representativeFen: string;
};

type ThemeSummary = {
  id: string;
  slug: string;
  label: string;
  definition: string | null;
  category: string;
  previewFen: string | null;
};

type Props = {
  themes: ThemeSummary[];
  chunks: ChunkSummary[];
  locale: Locale;
  labels: {
    sectionTitle: (count: number) => string;
    badgeTheme: string;
    badgeChunk: string;
  };
};

/**
 * Collapsible section showing the themes (curated glossary terms) and
 * chunks (UGC piece patterns) tagged on a position. Themes lead the
 * list because they're the standard vocabulary; chunks follow as
 * concrete pattern examples. Renders inside a native
 * `<details>/<summary>` so the content is SSR-rendered and crawlable
 * while initially hidden to avoid spoiling puzzle answers.
 */
export function RelatedTags({ themes, chunks, locale, labels }: Props) {
  const total = themes.length + chunks.length;
  if (total === 0) return null;

  return (
    <details className="group">
      <summary className="cursor-pointer select-none list-none flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <span className="transition-transform group-open:rotate-90">▶</span>
        <span>♟ {labels.sectionTitle(total)}</span>
      </summary>

      <div className="mt-3 space-y-3">
        {themes.map((theme) => (
          <Link
            key={`theme-${theme.id}`}
            href={buildGlossaryUrlForSlug(theme.slug) as '/glossary'}
            locale={locale}
            className="flex items-start gap-3 p-3 rounded border border-border hover:bg-muted transition-colors"
          >
            {theme.previewFen ? (
              <ThemedBoardThumbnail fen={theme.previewFen} className="w-16 h-16 shrink-0" />
            ) : (
              <span
                aria-hidden
                className="w-16 h-16 shrink-0 rounded-sm border border-dashed border-border"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] uppercase tracking-wider rounded px-1 bg-primary/10 text-primary">
                  {labels.badgeTheme}
                </span>
                <p className="text-sm font-medium truncate">{theme.label}</p>
              </div>
              {theme.definition && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {theme.definition}
                </p>
              )}
            </div>
          </Link>
        ))}
        {chunks.map((chunk) => (
          <Link
            key={`chunk-${chunk.id}`}
            href={`/chunks/${chunk.slug}` as '/chunks/[slug]'}
            locale={locale}
            className="flex items-start gap-3 p-3 rounded border border-border hover:bg-muted transition-colors"
          >
            <ThemedBoardThumbnail fen={chunk.representativeFen} className="w-16 h-16 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] uppercase tracking-wider rounded px-1 bg-secondary text-secondary-foreground">
                  {labels.badgeChunk}
                </span>
                <p className="text-sm font-medium truncate">{chunk.title}</p>
              </div>
              {chunk.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {chunk.description}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </details>
  );
}
