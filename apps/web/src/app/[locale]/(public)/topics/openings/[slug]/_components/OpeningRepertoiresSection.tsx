import { getTranslations } from 'next-intl/server';

import { EMPTY_REPLY_META, getReplyMetaMap } from '@/lib/db/reply-meta-queries';
import { getRepertoireLikeMetaMap } from '@/lib/repertoires/like-queries';
import type { RepertoireSort } from '@/lib/repertoires/queries';
import { listPublicRepertoiresForOpening } from '@/lib/repertoires/queries';

import { toggleLike } from '@/app/[locale]/(public)/repertoires/_actions/toggleLike';
import { CatalogListCard } from '@/app/[locale]/_components/CatalogListCard';
import type { Locale } from '@/app/[locale]/_lib/types';

/** How many repertoires the strip shows. There is no public index to link on to. */
const MAX_REPERTOIRES = 6;

type Props = {
  locale: Locale;
  slug: string;
  sort: RepertoireSort;
  currentUserId?: string;
};

/**
 * The repertoires (型) that cover this opening — the same catalogue card the
 * /repertoires list uses, so a reader studying an opening can jump straight
 * into someone's prepared lines. The panel behind the "Repertoires" tab; the
 * tab row owns the heading, so this renders cards only.
 */
export async function OpeningRepertoiresSection({ locale, slug, sort, currentUserId }: Props) {
  const rows = await listPublicRepertoiresForOpening(slug, MAX_REPERTOIRES, sort);
  if (rows.length === 0) return null;

  const t = await getTranslations({ locale, namespace: 'Repertoires' });

  const ids = rows.map((r) => r.repertoire.id);
  const [likeMetaMap, replyMetaMap] = await Promise.all([
    getRepertoireLikeMetaMap(ids, currentUserId),
    getReplyMetaMap('repertoire', ids),
  ]);

  return (
    <section className="space-y-3">
      <div className="space-y-3">
        {rows.map(({ repertoire, profile, thumbnailFen }) => (
          <CatalogListCard
            key={repertoire.id}
            id={repertoire.id}
            fen={thumbnailFen}
            title={repertoire.name}
            description={repertoire.description}
            createdAt={repertoire.createdAt}
            profile={profile}
            likeMeta={likeMetaMap.get(repertoire.id) ?? { likeCount: 0, likedByMe: false }}
            replyMeta={replyMetaMap.get(repertoire.id) ?? EMPTY_REPLY_META}
            detailHref={`/repertoires/${repertoire.id}`}
            i18nNamespace="Repertoires"
            toggleLikeAction={toggleLike}
            justNowLabel={t('justNow')}
            locale={locale}
            topicKey={repertoire.id}
            badge={
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {t(`form.side_${repertoire.side}`)}
              </span>
            }
          />
        ))}
      </div>
    </section>
  );
}
