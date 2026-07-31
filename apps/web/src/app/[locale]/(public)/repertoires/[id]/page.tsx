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

import { formatMovesToPgn, getStartingFen } from '@blindfold-chess/features/chess-core';

import { getOptionalUser } from '@/lib/auth';
import { getPointBalanceSummary, getRepertoireVisibilityPaid } from '@/lib/points';
import { getRepertoireLikeMetaMap } from '@/lib/repertoires/like-queries';
import { getLinkedOpenings } from '@/lib/repertoires/opening-queries';
import { getRepertoireForViewer } from '@/lib/repertoires/queries';
import { replayRepertoireLine } from '@/lib/repertoires/replay-line';
import { resolveAuthorName } from '@/lib/users/display-name';

import { OpeningTag } from '@/app/[locale]/(public)/games/shared/_components/OpeningTag';
import { PositionAuthorHeader } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionAuthorHeader';
import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { MoveNotationText } from '@/app/[locale]/(public)/topics/_components/MoveNotationText';
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
import { RepertoireVisibilityControl } from '../_components/RepertoireVisibilityControl';
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

  // Owner-only visibility control needs the coins already paid on this course
  // (to preview each tier's incremental cost) and the owner's balance. Only for
  // a published tier — a `building` draft uses the publish banner instead.
  const visibilityInfo =
    isOwner && currentUser && repertoire.status !== 'building'
      ? {
          paid: await getRepertoireVisibilityPaid(currentUser.id, repertoire.id),
          balance: (await getPointBalanceSummary(currentUser.id)).total,
        }
      : null;

  // The openings this repertoire is linked to (n:n; empty for a non-opening
  // phase). Rendered as compact tag links (the game-card pill) out to each
  // opening's topic page.
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
    return { id: line.id, name: line.name, lineNo: line.lineNo, formatted, positions };
  });

  return (
    <PageLayout
      title={repertoire.name}
      locale={locale}
      breadcrumb={[{ label: t('title'), href: '/repertoires' }, { label: repertoire.name }]}
    >
      {/* Opening section heading, mirroring the line detail page (which opens
          with its line name as a SectionTitle). The list panel inside the
          viewer repeats "Lines" as its own card label, but the page still wants
          a top-level heading — a panel that opens straight into the board reads
          as unlabelled. */}
      <SectionTitle>{t('detail.linesHeading')}</SectionTitle>

      {isOwner && repertoire.status === 'building' && (
        <PublishRepertoireBanner id={repertoire.id} locale={locale} lineCount={lines.length} />
      )}

      <RepertoireLineViewer
        lines={viewerLines}
        side={repertoire.side}
        repertoireId={repertoire.id}
        locale={locale}
        isOwner={isOwner}
      />

      {/* Description sits below the board (where the line page puts its note),
          under its own heading — the page title already shows the name, so the
          heading names the section, not the kata. Omitted entirely (heading and
          all) when there's no description. */}
      {repertoire.description && (
        <section className="space-y-2">
          <SectionTitle>{t('detail.descriptionHeading')}</SectionTitle>
          <p className="whitespace-pre-wrap text-foreground">
            {/* A kata's lines run from its root — repertoire.startingFen, NULL
                meaning the standard start (the same denormalised root the card
                thumbnail uses). Move runs in the description branch from there. */}
            <MoveNotationText
              text={repertoire.description}
              locale={locale}
              fen={repertoire.startingFen ?? getStartingFen()}
            />
          </p>
        </section>
      )}

      {/* Metadata about the kata: the side / phase chips, then the openings it
          covers as compact tag links (the same pill the game cards use) rather
          than full board cards — they're a cross-reference, not worth the
          vertical space a card grid took. */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <RepertoireChips
            locale={locale}
            side={repertoire.side}
            phase={repertoire.phase}
            status={repertoire.status}
          />
          {visibilityInfo && repertoire.status !== 'building' && (
            <RepertoireVisibilityControl
              id={repertoire.id}
              locale={locale}
              current={repertoire.status}
              visibilityPaid={visibilityInfo.paid}
              spendableBalance={visibilityInfo.balance}
            />
          )}
        </div>
        {linkedOpenings.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {linkedOpenings.map((opening) => (
              <OpeningTag
                key={opening.id}
                slug={opening.slug}
                displayName={getOpeningDisplayName(tOpeningNames, opening.slug, opening.name)}
                ecoCode={opening.ecoCode}
                locale={locale}
                compact
              />
            ))}
          </div>
        )}
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
