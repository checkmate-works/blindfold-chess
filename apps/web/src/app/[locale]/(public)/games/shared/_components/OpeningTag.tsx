import { Link } from '@/i18n/routing';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  /** Opening slug — links to the opening's topic page. */
  slug: string;
  /** Localized opening name (already resolved by the caller). */
  displayName: string;
  /** ECO classification code, shown as a muted prefix. */
  ecoCode: string;
  locale: Locale;
  /**
   * Compact pill for dense lists (gallery card badge). Default is the roomier
   * detail-page variant.
   */
  compact?: boolean;
};

/**
 * The opening a game played, rendered as a link to that opening's topic page
 * (`/topics/openings/<slug>`) — connecting a recorded game to the opening's
 * discussion/learning content. Presentational only; the caller resolves the
 * localized name (via `topics.openings.names`) and passes it in.
 */
export function OpeningTag({ slug, displayName, ecoCode, locale, compact }: Props) {
  return (
    <Link
      href={`/topics/openings/${slug}`}
      locale={locale}
      title={`${displayName} (${ecoCode})`}
      className={
        compact
          ? 'inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          : 'inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      }
    >
      <span className="font-mono text-muted-foreground">{ecoCode}</span>
      <span className={compact ? 'min-w-0 max-w-[10rem] truncate' : 'font-medium'}>
        {displayName}
      </span>
    </Link>
  );
}
