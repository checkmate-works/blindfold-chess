/**
 * Repertoire (型) — detail page. An interactive viewer of the repertoire's
 * lines (pick a line, step through its moves) plus a comment thread identical
 * to the puzzle / topics pages (topic_posts with topicType = 'repertoire').
 * Positions are precomputed server-side so the client viewer stays
 * chess.js-free.
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { formatMovesToPgn, getStartingFen } from '@blindfold-chess/features/chess-core';

import { getOptionalUser } from '@/lib/auth';
import { getPointBalanceSummary, getRepertoireVisibilityPaid } from '@/lib/points';
import { getRepertoireLikeMetaMap } from '@/lib/repertoires/like-queries';
import { getLinkedOpenings } from '@/lib/repertoires/opening-queries';
import { getRepertoireForViewer } from '@/lib/repertoires/queries';
import { replayRepertoireLine } from '@/lib/repertoires/replay-line';
import { truncate } from '@/lib/text';
import { resolveAuthorName } from '@/lib/users/display-name';

import { OpeningTag } from '@/app/[locale]/(public)/games/shared/_components/OpeningTag';
import { PositionAuthorHeader } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionAuthorHeader';
import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { MoveNotationText } from '@/app/[locale]/(public)/topics/_components/MoveNotationText';
import { getOpeningDisplayName } from '@/app/[locale]/(public)/topics/openings/_lib/get-opening-display-name';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { toggleLike } from '../_actions/toggleLike';
import { RepertoireActionsMenu } from '../_components/RepertoireActionsMenu';
import { RepertoireChips } from '../_components/RepertoireChips';
import { RepertoireDraftBadge } from '../_components/RepertoireDraftBadge';
import type { RepertoireViewerLine } from '../_components/RepertoireLineViewer';
import { RepertoireLineViewer } from '../_components/RepertoireLineViewer';
import { RepertoireVisibilityControl } from '../_components/RepertoireVisibilityControl';
import { RepertoireCommentsSection } from './_components/RepertoireCommentsSection';

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Cut-off for the meta description built from the author's free-text course
 * description (`REPERTOIRE_DESCRIPTION_MAX` allows 2000 chars). Search results
 * show roughly 150–160 characters; anything past that is dead weight.
 */
const META_DESCRIPTION_MAX = 160;

/**
 * The course description is a multi-line textarea; its newlines and blank
 * lines survive into the `content` attribute verbatim, so collapse runs of
 * whitespace into single spaces before truncating (otherwise the cut-off can
 * also land inside a run of blank lines and spend the budget on nothing).
 */
function toMetaDescription(text: string | null): string | undefined {
  return truncate(text?.replace(/\s+/g, ' ').trim(), META_DESCRIPTION_MAX) || undefined;
}

/**
 * The course's own name is the title — kata names routinely carry the opening
 * they cover ("London System", "クイーンズギャンビット"), which is the whole
 * search value of this page; a shared static "Kata" title threw that away and
 * made every course's tab/SERP entry indistinguishable. The canonical must
 * likewise point at this course, not at the `/repertoires` list (which is what
 * the shared static metadata emitted — telling Google every detail page was a
 * duplicate of the index, i.e. not worth indexing at all).
 *
 * The row is fetched through the same viewer-gated query the page body uses
 * (React-cached, so this costs no extra round-trip). A course the viewer can't
 * see gets the generic title and `noindex` — the page body 404s anyway — and
 * so do the non-`public` tiers, which are deliberately absent from the sitemap.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Repertoires' });

  const currentUser = await getOptionalUser();
  const data = await getRepertoireForViewer(id, currentUser?.id ?? null);
  if (!data) {
    return {
      title: resolveTitle(t('detail.title'), locale),
      robots: { index: false, follow: false },
    };
  }

  const { repertoire } = data;
  const title = repertoire.name;
  const description = toMetaDescription(repertoire.description);

  return {
    ...generateCanonicalMetadata({ locale, path: `repertoires/${id}`, title, description }),
    title: resolveTitle(title, locale),
    ...(description && { description }),
    ...(repertoire.status !== 'public' && { robots: { index: false, follow: false } }),
  };
}

export default async function RepertoireDetailPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const [t, tCommon, currentUser, { sort: sortParam }] = await Promise.all([
    getTranslations({ locale, namespace: 'Repertoires' }),
    getTranslations({ locale, namespace: 'Common' }),
    getOptionalUser(),
    searchParams,
  ]);

  // Public (or owned) repertoires are viewable without login; only the owner
  // sees owner-only affordances (delete). Comments are read-only for anon.
  const data = await getRepertoireForViewer(id, currentUser?.id ?? null);
  if (!data) notFound();
  const { repertoire, lines, profile, isOwner } = data;

  // Owner-only visibility control needs the coins already paid on this course
  // (to preview each tier's incremental cost) and the owner's balance. Only for
  // a published tier — a `building` draft publishes from the "⋯" menu (or the
  // edit form's draft toggle) instead. The linked openings (n:n; empty for a
  // non-opening phase, rendered as compact tag links out to each opening's
  // topic page) and the like meta are independent of it, so all of these
  // resolve in one round.
  const [visibilityPair, linkedOpenings, tOpeningNames, likeMetaMap] = await Promise.all([
    isOwner && currentUser && repertoire.status !== 'building'
      ? Promise.all([
          getRepertoireVisibilityPaid(currentUser.id, repertoire.id),
          getPointBalanceSummary(currentUser.id),
        ])
      : null,
    getLinkedOpenings(repertoire.id),
    getTranslations({ locale, namespace: 'topics.openings.names' }),
    getRepertoireLikeMetaMap([repertoire.id], currentUser?.id),
  ]);
  const visibilityInfo = visibilityPair
    ? { paid: visibilityPair[0], balance: visibilityPair[1].total }
    : null;

  const likeMeta = likeMetaMap.get(repertoire.id) ?? {
    likeCount: 0,
    likedByMe: false,
  };

  // Replay + format each line on the server (no chess.js in the client bundle).
  const viewerLines: RepertoireViewerLine[] = lines.map((line) => {
    const { sans, positions, startsAsBlack, startMoveNumber } = replayRepertoireLine(line);
    const formatted = formatMovesToPgn(sans, startsAsBlack, startMoveNumber);
    return {
      id: line.id,
      name: line.name,
      lineNo: line.lineNo,
      chapterName: line.chapterName,
      formatted,
      positions,
    };
  });

  return (
    <PageLayout
      title={repertoire.name}
      /* Draft state belongs next to the title, where the chunk detail page
         also puts it — it qualifies the whole page, not the side/phase
         metadata row further down (which keeps the visibility chips, since
         those sit beside the control that changes them). */
      titleAction={
        repertoire.status === 'building' ? (
          <RepertoireDraftBadge label={t('status.building')} hint={t('status.buildingHint')} />
        ) : undefined
      }
      locale={locale}
      breadcrumb={[{ label: t('title'), href: '/repertoires' }, { label: repertoire.name }]}
    >
      {/* Opening section heading, mirroring the line detail page (which opens
          with its line name as a SectionTitle). The list panel inside the
          viewer repeats "Lines" as its own card label, but the page still wants
          a top-level heading — a panel that opens straight into the board reads
          as unlabelled. */}
      <SectionTitle>{t('detail.linesHeading')}</SectionTitle>

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
            // The draft badge is rendered next to the page title instead.
            status={repertoire.status === 'building' ? undefined : repertoire.status}
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
        menu={
          isOwner ? (
            <RepertoireActionsMenu
              id={repertoire.id}
              locale={locale}
              status={repertoire.status}
              lineCount={lines.length}
            />
          ) : undefined
        }
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
