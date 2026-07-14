import { Link } from '@/i18n/routing';

import type { ThemeOption } from '@/lib/themes/types';
import { buildGlossaryUrlForSlug } from '@/lib/themes/url';

import { TagCardContent } from '@/app/[locale]/_components/TagCardContent';
import type { Locale } from '@/app/[locale]/_lib/types';

type ChunkSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  representativeFen: string;
};

type Props = {
  themes: ThemeOption[];
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
          <RelatedTagCard
            key={`theme-${theme.id}`}
            kind="theme"
            href={buildGlossaryUrlForSlug(theme.slug) as '/glossary'}
            locale={locale}
            previewFen={theme.previewFen}
            label={theme.label}
            description={theme.definition}
            badgeText={labels.badgeTheme}
          />
        ))}
        {chunks.map((chunk) => (
          <RelatedTagCard
            key={`chunk-${chunk.id}`}
            kind="chunk"
            href={`/chunks/${chunk.slug}` as '/chunks/[slug]'}
            locale={locale}
            previewFen={chunk.representativeFen}
            label={chunk.title}
            description={chunk.description}
            badgeText={labels.badgeChunk}
          />
        ))}
      </div>
    </details>
  );
}

export type RelatedTagCardProps = {
  kind: 'theme' | 'chunk';
  /**
   * Destination when the card should be a link (detail page). Omit to render
   * a static, non-navigable card — e.g. the puzzle authoring preview, where
   * clicking through mid-author would trip the unsaved-changes guard.
   */
  href?: '/glossary' | '/chunks/[slug]';
  locale?: Locale;
  /**
   * `null` only on theme rows for abstract concepts that have no
   * canonical example position. Chunks always carry a representative
   * FEN, so callers pass that value here.
   */
  previewFen: string | null;
  label: string;
  description: string | null;
  badgeText: string;
};

/**
 * Link (or static) shell around the shared {@link TagCardContent}. The
 * thumbnail fallback for board-less tags ("No Image") lives in the shared
 * content, so this card renders identically to every other tag surface.
 */
export function RelatedTagCard({
  kind,
  href,
  locale,
  previewFen,
  label,
  description,
  badgeText,
}: RelatedTagCardProps) {
  const content = (
    <TagCardContent
      kind={kind}
      previewFen={previewFen}
      label={label}
      description={description}
      badgeText={badgeText}
    />
  );

  const baseClassName = 'flex items-start gap-3 p-3 rounded border border-border';

  if (!href) {
    return <div className={baseClassName}>{content}</div>;
  }

  return (
    <Link
      href={href}
      locale={locale}
      className={`${baseClassName} hover:bg-muted transition-colors`}
    >
      {content}
    </Link>
  );
}
