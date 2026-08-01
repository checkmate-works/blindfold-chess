import { getTranslations } from 'next-intl/server';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';

import type { ChunkLinkedRepertoire } from '@/lib/repertoires/chunk-links';

import { RepertoireListCard } from '@/app/[locale]/(public)/repertoires/_components/RepertoireListCard';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { ChunkDetailData } from '../_lib/load-chunk-detail';

/**
 * The Kata tab panel of the chunk detail page: public kata (repertoires) whose
 * positions link this chunk — the reverse of the line page's chunk section,
 * mirroring the Games tab. Each card is the same {@link RepertoireListCard}
 * the /repertoires catalog renders, with one chunk-specific addition in the
 * meta row: a chip per linked position, deep-linking to where the chunk
 * applies (`/repertoires/<id>/lines/<lineNo>?move=<ply>` — the `?move=` param
 * the line page reads, same shape as the link-notification's deep link).
 * Non-public kata never reach this list (see `listRepertoiresLinkingChunk`),
 * so the panel is identical for every viewer.
 */
export async function ChunkRepertoiresTab({
  locale,
  repertoires,
  cardMeta,
}: {
  locale: Locale;
  repertoires: ChunkLinkedRepertoire[];
  cardMeta: ChunkDetailData['relatedRepertoiresCardMeta'];
}) {
  const [t, tChunks] = await Promise.all([
    getTranslations({ locale, namespace: 'topics.chunks' }),
    getTranslations({ locale, namespace: 'chunks' }),
  ]);

  if (repertoires.length === 0) {
    return (
      <div className="text-center">
        <p className="text-sm text-muted-foreground">{t('relatedRepertoires.empty')}</p>
        <div className="mt-4 flex justify-center">
          <Link href="/repertoires" locale={locale}>
            <Button variant="outline" size="sm">
              {t('relatedRepertoires.browseCta')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {tChunks('detail.relatedRepertoiresDescription')}
      </p>
      <div className="mt-4 space-y-3">
        {repertoires.map((card) => (
          <RepertoireListCard
            key={card.repertoire.id}
            card={card}
            meta={cardMeta(card.repertoire.id)}
            locale={locale}
            metaRow={
              <div className="flex flex-wrap gap-1.5">
                {card.positions.map((p) => (
                  <Link
                    key={p.positionKey}
                    href={`/repertoires/${card.repertoire.id}/lines/${p.lineNo}?move=${p.ply}`}
                    locale={locale}
                    className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t('relatedRepertoires.lineMoveLabel', { line: p.lineNo, n: p.ply })}
                  </Link>
                ))}
              </div>
            }
          />
        ))}
      </div>
    </>
  );
}
