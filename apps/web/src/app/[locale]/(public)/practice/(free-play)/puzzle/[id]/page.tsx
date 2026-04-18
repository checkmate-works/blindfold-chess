import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { Link } from '@/i18n/routing';
import { fenToPieceList, isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import { eq } from 'drizzle-orm';

import { db, puzzleSolutions } from '@/lib/db';
import { getPositionWithProfileById } from '@/lib/positions/queries';
import { resolveDisplayName } from '@/lib/users/display-name';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PuzzleAnswerForm } from '../_components/PuzzleAnswerForm';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    id: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });

  const row = await getPositionWithProfileById({ id, type: 'puzzle' });

  if (!row) {
    return { title: t('detail.title') };
  }

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `practice/puzzle/${id}`,
      title: row.position.title,
      description: t('description'),
    }),
    title: resolveTitle(row.position.title, locale),
  };
}

export default async function PuzzleDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  const row = await getPositionWithProfileById({ id, type: 'puzzle' });

  if (!row) {
    notFound();
  }

  const { position, profile } = row;
  const displayName = resolveDisplayName(profile);
  const isBlackToMove = isBlackToMoveFromFen(position.fen);
  const pieceList = fenToPieceList(position.fen);

  const solutions = await db
    .select({ solutionLine: puzzleSolutions.solutionLine })
    .from(puzzleSolutions)
    .where(eq(puzzleSolutions.positionId, position.id));

  const solutionLines = solutions.map((s) => s.solutionLine);

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

          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">
              {isBlackToMove ? t('detail.blackToMove') : t('detail.whiteToMove')}
            </p>
            <p className="text-sm text-foreground">
              <span className="font-medium">{t('detail.whitePiecesLabel')}:</span>{' '}
              {pieceList.white.length > 0 ? pieceList.white.join(' ') : t('detail.noPieces')}
            </p>
            <p className="text-sm text-foreground">
              <span className="font-medium">{t('detail.blackPiecesLabel')}:</span>{' '}
              {pieceList.black.length > 0 ? pieceList.black.join(' ') : t('detail.noPieces')}
            </p>
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

          {/* TODO: Add LikeButton and DeletePositionButton (same pattern as position-memory) */}
          <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground">
            <time dateTime={position.createdAt.toISOString()}>
              {position.createdAt.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </div>

          <SectionTitle>{t('detail.solveSection')}</SectionTitle>

          <PuzzleAnswerForm solutions={solutionLines} positionId={position.id} fen={position.fen} />
        </div>

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )}

        <Divider />

        <Breadcrumb
          items={[
            { label: tNav('practice'), href: '/practice' },
            { label: t('list.title'), href: '/practice/puzzle' },
            { label: position.title },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
