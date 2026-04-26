import { Link } from '@/i18n/routing';

import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

import type { Locale } from '@/app/[locale]/_lib/types';

type ChunkSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  representativeFen: string;
};

type Props = {
  chunks: ChunkSummary[];
  locale: Locale;
};

/**
 * Collapsible section showing chunks (piece-coordination patterns) related
 * to a position. Uses the native `<details>/<summary>` HTML element so the
 * content is SSR-rendered and SEO-crawlable while initially hidden to avoid
 * spoiling the answer for the user.
 */
export function RelatedChunks({ chunks, locale }: Props) {
  if (chunks.length === 0) return null;

  return (
    <details className="group">
      <summary className="cursor-pointer select-none list-none flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <span className="transition-transform group-open:rotate-90">▶</span>
        <span>🧩 Chunks ({chunks.length})</span>
      </summary>

      <div className="mt-3 space-y-3">
        {chunks.map((chunk) => (
          <Link
            key={chunk.id}
            href={`/chunks/${chunk.slug}` as '/chunks/[slug]'}
            locale={locale}
            className="flex items-start gap-3 p-3 rounded border border-border hover:bg-muted transition-colors"
          >
            <BoardThumbnail fen={chunk.representativeFen} className="w-16 h-16 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{chunk.title}</p>
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
