import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { Link } from '@/i18n/routing';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';

import { getOptionalUser } from '@/lib/auth';
import { getLinkedChunksForPosition } from '@/lib/chunks/queries';
import { getPositionLikeMeta } from '@/lib/positions/like-queries';
import { getPositionWithProfileById } from '@/lib/positions/queries';
import { resolveDisplayName } from '@/lib/users/display-name';

import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { RelatedChunks } from '@/app/[locale]/_components/RelatedChunks';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { toggleLike } from '../_actions/toggleLike';
import { DeletePositionButton } from '../_components/DeletePositionButton';
import { PositionDetailBoard } from '../_components/single-position/PositionDetailBoard';
import { PositionStartForm } from '../_components/single-position/PositionStartForm';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    id: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });

  const row = await getPositionWithProfileById({ id, type: 'memory' });

  if (!row) {
    return { title: t('detail.title') };
  }

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `practice/position-memory/${id}`,
      title: row.position.title,
      description: t('description'),
    }),
    title: resolveTitle(row.position.title, locale),
  };
}

export default async function PositionDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  const row = await getPositionWithProfileById({ id, type: 'memory' });

  if (!row) {
    notFound();
  }

  const { position, profile } = row;
  const displayName = resolveDisplayName(profile);
  const isBlackToMove = isBlackToMoveFromFen(position.fen);

  const currentUser = await getOptionalUser();
  const [likeMeta, relatedChunks] = await Promise.all([
    getPositionLikeMeta(position.id, currentUser?.id),
    getLinkedChunksForPosition(position.id),
  ]);

  const authorBadge = (
    <>
      {profile?.avatarUrl ? (
        <Image
          src={profile.avatarUrl}
          alt={displayName}
          width={24}
          height={24}
          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
          unoptimized
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <span className={`font-medium text-foreground${profile?.username ? ' hover:underline' : ''}`}>
        {displayName}
      </span>
    </>
  );

  return (
    <div className="space-y-8">
      <PageTitle>{position.title}</PageTitle>

      <PagePanel>
        <div className="space-y-6">
          <SectionTitle>{t('detail.descriptionSection')}</SectionTitle>

          {position.description && (
            <p className="text-foreground whitespace-pre-wrap">{position.description}</p>
          )}

          <div className="max-w-md mx-auto">
            <PositionDetailBoard fen={position.fen} flipped={isBlackToMove} />
          </div>

          <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
            <span>{t('detail.createdBy')}</span>
            {profile?.username ? (
              <Link
                href={`/u/${profile.username}`}
                locale={locale}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {authorBadge}
              </Link>
            ) : (
              authorBadge
            )}
          </div>

          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
            <LikeButton
              postId={position.id}
              locale={locale}
              topicKey=""
              initialLikeCount={likeMeta.likeCount}
              initialLikedByMe={likeMeta.likedByMe}
              toggleLikeAction={toggleLike}
              i18nNamespace="practice.positionMemory"
            />
            <div className="flex items-center gap-4">
              {currentUser?.id === position.userId && (
                <DeletePositionButton positionId={position.id} locale={locale} />
              )}
              <time dateTime={position.createdAt.toISOString()}>
                {position.createdAt.toLocaleDateString(locale, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </div>
          </div>

          <SectionTitle>{t('detail.solveSection')}</SectionTitle>

          <PositionStartForm positionId={position.id} locale={locale} />
        </div>

        <RelatedChunks chunks={relatedChunks} locale={locale} />

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )}

        <Divider />

        <Breadcrumb
          items={[
            { label: tNav('practice'), href: '/practice' },
            { label: t('list.title'), href: '/practice/position-memory' },
            { label: position.title },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
