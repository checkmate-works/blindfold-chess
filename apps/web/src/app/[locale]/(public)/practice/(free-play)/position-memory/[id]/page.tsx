import { cache } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { and, eq, isNull } from 'drizzle-orm';

import { db, positions, profiles } from '@/lib/db';
import { UUID_RE } from '@/lib/validations/uuid';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PositionStartForm } from '../_components/PositionStartForm';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    id: string;
  }>;
};

/**
 * Fetch a memory position with its author profile.
 * Wrapped with `React.cache` for per-request deduplication —
 * shared between `generateMetadata` and the page component.
 */
const getPositionWithProfile = cache(async (id: string) => {
  if (!UUID_RE.test(id)) return null;

  const [row] = await db
    .select({
      position: positions,
      profile: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(positions)
    .leftJoin(profiles, eq(positions.userId, profiles.id))
    .where(and(eq(positions.id, id), eq(positions.type, 'memory'), isNull(positions.deletedAt)))
    .limit(1);

  return row ?? null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });

  const row = await getPositionWithProfile(id);

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

  const row = await getPositionWithProfile(id);

  if (!row) {
    notFound();
  }

  const { position, profile } = row;
  const displayName = profile?.displayName || profile?.username || 'Anonymous';
  const isBlackToMove = position.fen.split(' ')[1] === 'b';

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
            <AnimatedChessBoard
              initialFen={position.fen}
              showCoordinates={true}
              flipped={isBlackToMove}
            />
          </div>

          <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
            <span>{t('detail.createdBy')}</span>
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
            <span className="font-medium text-foreground">{displayName}</span>
          </div>

          <div className="text-xs text-muted-foreground text-right">
            <time dateTime={position.createdAt.toISOString()}>
              {position.createdAt.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </div>

          <SectionTitle>{t('detail.solveSection')}</SectionTitle>

          <PositionStartForm positionId={position.id} locale={locale} />
        </div>

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
