/**
 * Repertoire (型) — detail page. An interactive viewer of the repertoire's
 * lines (pick a line, step through its moves) plus a comment thread identical
 * to the puzzle / topics pages (topic_posts with topicType = 'repertoire').
 * Positions are precomputed server-side so the client viewer stays
 * chess.js-free.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getOptionalUser } from '@/lib/auth';
import { getRepertoireLikeMetaMap } from '@/lib/repertoires/like-queries';
import { getRepertoireForViewer } from '@/lib/repertoires/queries';
import { replayRepertoireLine } from '@/lib/repertoires/replay-line';
import { resolveAuthorName } from '@/lib/users/display-name';

import { PositionAuthorAttribution } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionAuthorAttribution';
import { formatMovesToPgn } from '@/app/[locale]/(public)/practice/(free-play)/recall/_lib/format-moves-to-pgn';
import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { toggleLike } from '../_actions/toggleLike';
import { DeleteRepertoireButton } from '../_components/DeleteRepertoireButton';
import type { RepertoireViewerLine } from '../_components/RepertoireLineViewer';
import { RepertoireLineViewer } from '../_components/RepertoireLineViewer';
import { RepertoireCommentsSection } from './_components/RepertoireCommentsSection';

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'Repertoires',
    path: 'repertoires',
    titleKey: 'detail.title',
    omitDescription: true,
  });
}

export default async function RepertoireDetailPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'Repertoires' });
  const tCommon = await getTranslations({ locale, namespace: 'Common' });
  const currentUser = await getOptionalUser();
  const sortParam = (await searchParams).sort;

  // Public (or owned) repertoires are viewable without login; only the owner
  // sees owner-only affordances (delete). Comments are read-only for anon.
  const data = await getRepertoireForViewer(id, currentUser?.id ?? null);
  if (!data) notFound();
  const { repertoire, lines, profile, isOwner } = data;

  const likeMeta = (await getRepertoireLikeMetaMap([repertoire.id], currentUser?.id)).get(
    repertoire.id
  ) ?? {
    likeCount: 0,
    likedByMe: false,
  };

  // Replay + format each line on the server (no chess.js in the client bundle).
  const viewerLines: RepertoireViewerLine[] = lines.map((line) => {
    const { sans, positions, startsAsBlack, startMoveNumber } = replayRepertoireLine(line);
    const formatted = formatMovesToPgn(sans, startsAsBlack, startMoveNumber);
    return { id: line.id, name: line.name, lineNo: line.seq + 1, formatted, positions };
  });

  return (
    <PageLayout
      title={repertoire.name}
      locale={locale}
      breadcrumb={[{ label: t('title'), href: '/repertoires' }, { label: repertoire.name }]}
    >
      <SectionTitle>{t('detail.linesHeading')}</SectionTitle>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-0.5">
          {t(`form.side_${repertoire.side}`)}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5">
          {t(`form.phase_${repertoire.phase}`)}
        </span>
        <span>{t('detail.lineCount', { count: lines.length })}</span>
      </div>

      {repertoire.description && (
        <p className="whitespace-pre-wrap text-foreground">{repertoire.description}</p>
      )}

      <RepertoireLineViewer
        lines={viewerLines}
        side={repertoire.side}
        repertoireId={repertoire.id}
        locale={locale}
      />

      <PositionAuthorAttribution
        profile={profile}
        displayName={resolveAuthorName(profile, { fallback: tCommon('deletedUser') })}
        createdByLabel={t('detail.createdBy')}
        locale={locale}
      />

      <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <LikeButton
          postId={repertoire.id}
          locale={locale}
          topicKey=""
          initialLikeCount={likeMeta.likeCount}
          initialLikedByMe={likeMeta.likedByMe}
          toggleLikeAction={toggleLike}
          i18nNamespace="Repertoires"
        />
        {isOwner && (
          <DeleteRepertoireButton id={repertoire.id} locale={locale} afterDelete="list" />
        )}
      </div>

      <RepertoireCommentsSection
        locale={locale}
        repertoireId={repertoire.id}
        sort={typeof sortParam === 'string' ? sortParam : undefined}
        currentUserId={currentUser?.id}
      />

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
