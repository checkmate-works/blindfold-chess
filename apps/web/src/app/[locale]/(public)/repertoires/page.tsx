/**
 * Repertoires (型) — list page (route slug /repertoires).
 *
 * @description
 * A user's repertoire courses (UGC, modelled on games): opening / middlegame /
 * endgame studies. Each card is one repertoire (name, side, phase); its lines
 * (variations) live inside it. The feature is concealed only by not being
 * linked from global nav while it is built out; the list lives under (public)
 * so an anonymous visitor simply sees the empty state.
 *
 * Cards reuse the shared `CatalogListCard` so they carry the same board
 * thumbnail, author, like, and comment affordances as the puzzle /
 * position-memory catalogs — repertoires are likeable/commentable via the same
 * polymorphic infrastructure (`targetType` / `topicType` = `'repertoire'`).
 *
 * @flow
 * 1. List the signed-in user's repertoires, newest first, with like + comment meta.
 * 2. The "Import" CTA (signed-in only) routes to /repertoires/new to paste a PGN.
 * 3. Each card links to /repertoires/[id].
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaPlus } from 'react-icons/fa';

import { getOptionalUser } from '@/lib/auth';
import { EMPTY_REPLY_META, getReplyMetaMap } from '@/lib/db/reply-meta-queries';
import { getRepertoireLikeMetaMap } from '@/lib/repertoires/like-queries';
import { listRepertoiresForUser } from '@/lib/repertoires/queries';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { CatalogListCard } from '@/app/[locale]/_components/CatalogListCard';
import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { toggleLike } from './_actions/toggleLike';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'Repertoires',
    path: 'repertoires',
    noIndex: true,
  });
}

export default async function RepertoiresPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Repertoires' });
  const user = await getOptionalUser();
  const rows = user ? await listRepertoiresForUser(user.id) : [];

  const ids = rows.map((r) => r.repertoire.id);
  const [likeMetaMap, replyMetaMap] = ids.length
    ? await Promise.all([
        getRepertoireLikeMetaMap(ids, user?.id),
        getReplyMetaMap('repertoire', ids),
      ])
    : [new Map(), new Map()];

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <SectionTitle>{t('sectionTitle')}</SectionTitle>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">{t('empty')}</p>
      ) : (
        <GamePreferencesProvider>
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
                  <span className="flex flex-wrap gap-1">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {t(`form.side_${repertoire.side}`)}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {t(`form.phase_${repertoire.phase}`)}
                    </span>
                  </span>
                }
              />
            ))}
          </div>
        </GamePreferencesProvider>
      )}

      {user && (
        <div className="py-4">
          <Link href="/repertoires/new" locale={locale}>
            <Button asChild variant="primary" size="lg" icon={<FaPlus />} fullWidth>
              {t('importCta')}
            </Button>
          </Link>
        </div>
      )}
    </PageLayout>
  );
}
