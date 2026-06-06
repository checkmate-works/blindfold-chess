/**
 * Lines (型) — list page.
 *
 * @description
 * A user's repertoire trees (UGC, modelled on games): opening lines, checkmate
 * patterns, or any memorized continuation from a fixed position. Each row is
 * one tree imported as PGN-with-variations. The feature is concealed only by
 * not being linked from global nav while it is built out; the list lives under
 * (public) so an anonymous visitor simply sees the empty state.
 *
 * Cards reuse the shared `CatalogListCard` so they carry the same board
 * thumbnail, author, like, and comment affordances as the puzzle /
 * position-memory catalogs — lines are likeable/commentable via the same
 * polymorphic `likes` / `topic_posts` infrastructure (`targetType` /
 * `topicType` = `'line'`).
 *
 * @flow
 * 1. List the signed-in user's lines, newest first, with like + comment meta.
 * 2. The "Import" CTA (signed-in only) routes to /lines/new to paste a PGN.
 * 3. Each card links to /lines/[id].
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { getStartingFen } from '@blindfold-chess/features/chess-core';
import { FaPlus } from 'react-icons/fa';

import { getOptionalUser } from '@/lib/auth';
import { EMPTY_REPLY_META, getReplyMetaMap } from '@/lib/db/reply-meta-queries';
import { getLineLikeMetaMap } from '@/lib/lines/like-queries';
import { listLinesForUser } from '@/lib/lines/queries';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { CatalogListCard } from '@/app/[locale]/_components/CatalogListCard';
import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { toggleLike } from './_actions/toggleLike';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'Lines', path: 'lines', noIndex: true });
}

export default async function LinesPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Lines' });
  const user = await getOptionalUser();
  const rows = user ? await listLinesForUser(user.id) : [];

  const lineIds = rows.map((r) => r.line.id);
  const [likeMetaMap, replyMetaMap] = lineIds.length
    ? await Promise.all([getLineLikeMetaMap(lineIds, user?.id), getReplyMetaMap('line', lineIds)])
    : [new Map(), new Map()];

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <SectionTitle>{t('sectionTitle')}</SectionTitle>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">{t('empty')}</p>
      ) : (
        <GamePreferencesProvider>
          <div className="space-y-3">
            {rows.map(({ line, profile }) => (
              <CatalogListCard
                key={line.id}
                id={line.id}
                fen={line.startingFen ?? getStartingFen()}
                title={line.name}
                description={null}
                createdAt={line.createdAt}
                profile={profile}
                likeMeta={likeMetaMap.get(line.id) ?? { likeCount: 0, likedByMe: false }}
                replyMeta={replyMetaMap.get(line.id) ?? EMPTY_REPLY_META}
                detailHref={`/lines/${line.id}`}
                i18nNamespace="Lines"
                toggleLikeAction={toggleLike}
                justNowLabel={t('justNow')}
                locale={locale}
                topicKey={line.id}
                badge={
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {t(`form.side_${line.side}`)}
                  </span>
                }
              />
            ))}
          </div>
        </GamePreferencesProvider>
      )}

      {user && (
        <div className="py-4">
          <Link href="/lines/new" locale={locale}>
            <Button asChild variant="primary" size="lg" icon={<FaPlus />} fullWidth>
              {t('importCta')}
            </Button>
          </Link>
        </div>
      )}
    </PageLayout>
  );
}
