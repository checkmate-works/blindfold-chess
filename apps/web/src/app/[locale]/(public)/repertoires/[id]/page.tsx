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

import { formatMovesToPgn } from '@blindfold-chess/features/chess-core';

import { getOptionalUser } from '@/lib/auth';
import { getRepertoireLikeMetaMap } from '@/lib/repertoires/like-queries';
import { getLinkedOpenings } from '@/lib/repertoires/opening-queries';
import { getRepertoireForViewer } from '@/lib/repertoires/queries';
import { replayRepertoireLine } from '@/lib/repertoires/replay-line';
import { resolveAuthorName } from '@/lib/users/display-name';

import { PositionAuthorHeader } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionAuthorHeader';
import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { OpeningCard } from '@/app/[locale]/(public)/topics/openings/_components';
import { getOpeningDisplayName } from '@/app/[locale]/(public)/topics/openings/_lib/get-opening-display-name';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { toggleLike } from '../_actions/toggleLike';
import { RepertoireActionsMenu } from '../_components/RepertoireActionsMenu';
import { RepertoireChips } from '../_components/RepertoireChips';
import type { RepertoireViewerLine } from '../_components/RepertoireLineViewer';
import { RepertoireLineViewer } from '../_components/RepertoireLineViewer';
import { PublishRepertoireBanner } from './_components/PublishRepertoireBanner';
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

  // The openings this repertoire is linked to (n:n; empty for a non-opening
  // phase). Rendered as the same cards the topics pages use, linking out to
  // each opening's topic page.
  const linkedOpenings = await getLinkedOpenings(repertoire.id);
  const tOpeningNames = await getTranslations({ locale, namespace: 'topics.openings.names' });

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
      {/* The kata's name as the panel's opening section heading (mirroring the
          line detail page), with the description sitting under it as the
          overview. No "Lines" title here: the list panel inside the viewer
          carries that heading, and repeating it above the board would label
          the board — not the list — with it. */}
      <SectionTitle>{repertoire.name}</SectionTitle>

      {isOwner && repertoire.status === 'building' && (
        <PublishRepertoireBanner id={repertoire.id} locale={locale} lineCount={lines.length} />
      )}

      {repertoire.description && (
        <p className="whitespace-pre-wrap text-foreground">{repertoire.description}</p>
      )}

      <RepertoireLineViewer
        lines={viewerLines}
        side={repertoire.side}
        repertoireId={repertoire.id}
        locale={locale}
        isOwner={isOwner}
      />

      {/* Below the board: the openings this repertoire covers (each card links
          to its topic page), then the side / phase / line-count summary. Both
          are context ABOUT the repertoire — the board is what the reader came
          for, so neither is worth pushing it down the page. */}
      {linkedOpenings.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {linkedOpenings.map((opening) => (
            <OpeningCard
              key={opening.id}
              opening={opening}
              displayName={getOpeningDisplayName(tOpeningNames, opening.slug, opening.name)}
              locale={locale}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <RepertoireChips
          locale={locale}
          side={repertoire.side}
          phase={repertoire.phase}
          status={repertoire.status}
        />
        <span>{t('detail.lineCount', { count: lines.length })}</span>
      </div>

      <PositionAuthorHeader
        profile={profile}
        displayName={resolveAuthorName(profile, { fallback: tCommon('deletedUser') })}
        createdByLabel={t('detail.createdBy')}
        locale={locale}
        createdAt={repertoire.createdAt}
        edited={repertoire.updatedAt.getTime() - repertoire.createdAt.getTime() > 1000}
        editedLabel={t('detail.edited')}
        menu={isOwner ? <RepertoireActionsMenu id={repertoire.id} locale={locale} /> : undefined}
      />

      <div className="flex items-center text-xs text-muted-foreground">
        <LikeButton
          postId={repertoire.id}
          locale={locale}
          topicKey=""
          initialLikeCount={likeMeta.likeCount}
          initialLikedByMe={likeMeta.likedByMe}
          toggleLikeAction={toggleLike}
          i18nNamespace="Repertoires"
        />
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
