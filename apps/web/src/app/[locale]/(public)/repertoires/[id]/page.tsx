/**
 * Repertoire (型) — detail page. An interactive viewer of the repertoire's
 * lines: pick a line on the left, step through its moves on the board (the same
 * controls + numbered move list the game screens use). Positions are
 * precomputed server-side so the client viewer stays chess.js-free.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { parsePgn, replayMoves } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { getAuthenticatedUser } from '@/lib/auth';
import { getRepertoireLikeMetaMap } from '@/lib/repertoires/like-queries';
import { getRepertoireForUser } from '@/lib/repertoires/queries';
import { resolveDisplayName } from '@/lib/users/display-name';

import { formatMovesToPgn } from '@/app/[locale]/(public)/games/play/postmortem/_lib/format-moves-to-pgn';
import { PositionAuthorAttribution } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionAuthorAttribution';
import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { toggleLike } from '../_actions/toggleLike';
import { DeleteRepertoireButton } from '../_components/DeleteRepertoireButton';
import type { RepertoireViewerLine } from '../_components/RepertoireLineViewer';
import { RepertoireLineViewer } from '../_components/RepertoireLineViewer';

type Props = { params: Promise<{ locale: Locale; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'Repertoires',
    path: 'repertoires',
    titleKey: 'detail.title',
    noIndex: true,
    omitDescription: true,
  });
}

export default async function RepertoireDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'Repertoires' });
  const user = await getAuthenticatedUser();

  const data = await getRepertoireForUser(id, user.id);
  if (!data) notFound();
  const { repertoire, lines, profile } = data;

  const likeMeta = (await getRepertoireLikeMetaMap([repertoire.id], user.id)).get(
    repertoire.id
  ) ?? {
    likeCount: 0,
    likedByMe: false,
  };

  // Replay + format each line on the server (no chess.js in the client bundle).
  const viewerLines: RepertoireViewerLine[] = lines.map((line) => {
    let sans: string[] = [];
    try {
      sans = parsePgn(line.pgn);
    } catch {
      sans = [];
    }
    const positions = replayMoves(sans, line.startingFen ?? undefined).map((p) => ({
      fen: p.fen,
      lastMove: p.lastMove ?? null,
    }));
    const startField = line.startingFen?.split(' ');
    const startsAsBlack = startField?.[1] === 'b';
    const startMoveNumber = startField ? Number(startField[5]) || 1 : 1;
    const formatted = formatMovesToPgn(sans as AlgebraicNotation[], startsAsBlack, startMoveNumber);
    return { id: line.id, name: line.name, formatted, positions };
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

      <RepertoireLineViewer lines={viewerLines} side={repertoire.side} />

      <PositionAuthorAttribution
        profile={profile}
        displayName={resolveDisplayName(profile)}
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
        <DeleteRepertoireButton id={repertoire.id} locale={locale} afterDelete="list" />
      </div>
    </PageLayout>
  );
}
