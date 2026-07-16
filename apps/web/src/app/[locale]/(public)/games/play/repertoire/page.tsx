/**
 * Kata Check (型チェック)
 *
 * @description Checks a finished game's opening against the repertoires (型)
 * the signed-in user OWNS for the colour they played (never another user's).
 * The player picks which kata to check against; the game then replays on a
 * board (behind a Play button) and halts where it left the kata — or where
 * the prepared line ran out — revealing the verdict: on kata, the player's
 * own deviation, or an unprepared opponent move. A kata whose very first
 * prepared move the game didn't play is left out of the picker entirely (it
 * says nothing useful about this game); when that leaves no applicable kata,
 * the page offers to turn the game itself into a new repertoire instead.
 * @flow Game finishes → the finish modal's Kata card deep-links here with the
 * game's SAN moves in the URL (like Recall, the page has no game-loading
 * logic) → pick a kata (`?repertoire=`) → server precomputes the replay
 * positions + verdict, the client viewer animates to the stop point.
 * Anonymous visitors get a sign-in prompt; a user with no applicable kata for
 * the side gets a "register a kata" CTA prefilled with this game's own PGN.
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

import {
  formatMovesToPgn,
  formatPgnToText,
  replayMoves,
} from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { getOptionalUser } from '@/lib/auth';
import { getRepertoireCardMeta } from '@/lib/repertoires/card-meta';
import type { KataEntry } from '@/lib/repertoires/kata-report';
import { getKataReport } from '@/lib/repertoires/kata-report';
import { listRepertoiresForUser } from '@/lib/repertoires/queries';

import { RepertoireListCard } from '@/app/[locale]/(public)/repertoires/_components/RepertoireListCard';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components/HelpTourButton';
import { HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { KataVerdict } from './_components/KataReplayViewer';
import { KataReplayViewer } from './_components/KataReplayViewer';
import { KATA_STATUS_BADGE, KATA_STATUS_KEY, type KataStatus } from './_lib/kata-status';

const KATA_HELP_TARGET = 'kata-help-target';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'play' });
  const title = t('kataPage.title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/play/repertoire', title }),
    title: resolveTitle(title, locale),
  };
}

/** The `moves` param is the same JSON SAN array the Recall deep-link carries. */
function parseMoves(param: string | string[] | undefined): string[] | null {
  if (typeof param !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(param);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((m) => typeof m === 'string')) {
      return parsed;
    }
  } catch {
    // Malformed JSON → treated as missing.
  }
  return null;
}

const PRIMARY_LINK =
  'inline-block rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors';
const SECONDARY_LINK =
  'inline-block rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors';

function EmptyState({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-6 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {children && <div className="flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

function StatusBadge({ status, label }: { status: KataStatus; label: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${KATA_STATUS_BADGE[status]}`}>
      {label}
    </span>
  );
}

export default async function KataPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'play' });
  const sp = await searchParams;

  const moves = parseMoves(sp.moves);
  const playerColor = sp.color === 'black' ? 'black' : 'white';
  const startingFen = typeof sp.fen === 'string' && sp.fen ? sp.fen : undefined;
  const gameId = typeof sp.gameId === 'string' && sp.gameId ? sp.gameId : undefined;
  const selectedId = typeof sp.repertoire === 'string' && sp.repertoire ? sp.repertoire : undefined;

  // Formatted once here (not per-branch) so both the replay view and the
  // "turn this game into a kata" CTA below share the same move formatting.
  const startField = startingFen?.split(' ');
  const startsAsBlack = startField?.[1] === 'b';
  const startMoveNumber = startField ? Number(startField[5]) || 1 : 1;
  const formattedGame = moves
    ? formatMovesToPgn(moves as AlgebraicNotation[], startsAsBlack, startMoveNumber)
    : [];

  const helpSteps: HelpStep[] = [
    {
      targetId: KATA_HELP_TARGET,
      title: t('kataPage.help.title'),
      description: t('kataPage.help.description'),
      side: 'bottom',
      align: 'center',
    },
  ];

  /**
   * This page's own path, with or without a kata selected — locale-less, since
   * the picker card's i18n Link adds the prefix itself; plain next/link call
   * sites prepend `/${locale}` explicitly.
   */
  const pathFor = (repertoireId?: string) => {
    const p = new URLSearchParams();
    if (typeof sp.moves === 'string') p.set('moves', sp.moves);
    p.set('color', playerColor);
    if (startingFen) p.set('fen', startingFen);
    if (gameId) p.set('gameId', gameId);
    if (repertoireId) p.set('repertoire', repertoireId);
    return `/games/play/repertoire?${p.toString()}`;
  };

  const user = await getOptionalUser();

  let content: React.ReactNode;
  if (!moves) {
    content = (
      <EmptyState message={t('kataPage.invalid')}>
        <Link href={`/${locale}/games/play`} className={PRIMARY_LINK}>
          {t('kataPage.backToPlay')}
        </Link>
      </EmptyState>
    );
  } else if (!user) {
    content = (
      <EmptyState message={t('kataPage.signInRequired')}>
        <Link href={`/${locale}/sign-in`} className={PRIMARY_LINK}>
          {t('kataPage.signIn')}
        </Link>
      </EmptyState>
    );
  } else {
    const report = await getKataReport({ userId: user.id, moves, playerColor, startingFen });
    const side = t(`kataPage.side_${playerColor}`);
    // Prefilled with this game's own PGN + side, so "register a kata" doubles
    // as "turn this game into one" — the common case when the reason nothing
    // applies is that no kata for this opening exists yet.
    const gamePgnText = formatPgnToText(formattedGame, startingFen);
    const newRepertoireHref = `/${locale}/repertoires/new?pgn=${encodeURIComponent(gamePgnText)}&side=${playerColor}`;
    const registerCtas = (
      <>
        <Link href={newRepertoireHref} className={PRIMARY_LINK}>
          {t('kataPage.registerCta')}
        </Link>
        <Link href={`/${locale}/repertoires`} className={SECONDARY_LINK}>
          {t('kataPage.viewRepertoires')}
        </Link>
      </>
    );

    const selected = selectedId
      ? report.entries.find((entry) => entry.repertoire.id === selectedId)
      : undefined;

    if (!report.hasRepertoiresForSide) {
      content = (
        <EmptyState message={t('kataPage.noRepertoires', { side })}>{registerCtas}</EmptyState>
      );
    } else if (report.entries.length === 0) {
      content = <EmptyState message={t('kataPage.noneApplicable')}>{registerCtas}</EmptyState>;
    } else if (!selected) {
      // Pick which kata to check against — the same catalogue cards the
      // /repertoires list and the opening topic's Repertoires tab render, just
      // pointed at this page's replay view instead of the detail page. The
      // verdict stays unrevealed until the replay arrives at it.
      const applicableIds = new Set(report.entries.map((entry) => entry.repertoire.id));
      const cards = (await listRepertoiresForUser(user.id)).filter((card) =>
        applicableIds.has(card.repertoire.id)
      );
      const cardMeta = await getRepertoireCardMeta([...applicableIds], user.id);
      content = (
        <>
          <SectionTitle>{t('kataPage.selectHeading')}</SectionTitle>
          <div className="space-y-3">
            {cards.map((card) => (
              <RepertoireListCard
                key={card.repertoire.id}
                card={card}
                meta={cardMeta(card.repertoire.id)}
                locale={locale}
                detailHref={pathFor(card.repertoire.id)}
              />
            ))}
          </div>
        </>
      );
    } else {
      content = renderReplay({
        selected,
        entries: report.entries,
        moves,
        formatted: formattedGame,
        playerColor,
        startingFen,
        locale,
        t,
        pathFor,
      });
    }
  }

  return (
    <PageLayout
      title={<span data-tour-id={KATA_HELP_TARGET}>{t('kataPage.title')}</span>}
      titleAction={<HelpTourButton steps={helpSteps} label={t('kataPage.help.label')} />}
      locale={locale}
    >
      {content}

      {gameId && (
        <p className="text-center">
          <Link
            href={`/${locale}/games/play/result?gameId=${gameId}`}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            {t('kataPage.backToResult')}
          </Link>
        </p>
      )}
    </PageLayout>
  );
}

/**
 * The replay view for one chosen kata, laid out like the repertoire detail
 * page: the board column on the left (name + verdict badge above the same
 * board chrome), and a side menu of the other applicable katas on the right
 * for switching without going back to the picker. Positions and move
 * formatting are precomputed here so the viewer stays chess.js-free.
 */
function renderReplay({
  selected,
  entries,
  moves,
  formatted,
  playerColor,
  startingFen,
  locale,
  t,
  pathFor,
}: {
  selected: KataEntry;
  entries: KataEntry[];
  moves: string[];
  formatted: ReturnType<typeof formatMovesToPgn>;
  playerColor: 'white' | 'black';
  startingFen: string | undefined;
  locale: string;
  t: (key: string, values?: Record<string, string | number>) => string;
  pathFor: (repertoireId?: string) => string;
}) {
  const { repertoire, result } = selected;
  const status = result.status as KataStatus;

  const positions = replayMoves(moves as AlgebraicNotation[], startingFen).map((p) => ({
    fen: p.fen,
    lastMove: p.lastMove ?? null,
  }));

  const stopPly = result.divergence
    ? result.divergence.ply
    : (result.enteredAtPly ?? 0) + result.followedPlies;

  const verdict: KataVerdict = result.divergence
    ? {
        status,
        // The FEN before the diverging move carries the full-move number directly.
        moveNo: Number(result.divergence.fen.split(' ')[5]) || 1,
        played: result.divergence.played,
        expected: result.divergence.expected.join(' / '),
      }
    : { status, moveNo: null };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/${locale}/repertoires/${repertoire.id}`}
            className="text-base font-semibold text-foreground hover:underline"
          >
            {repertoire.name}
          </Link>
          <StatusBadge status={status} label={t(`kataPage.status.${KATA_STATUS_KEY[status]}`)} />
        </div>

        {/* Keyed by repertoire so switching via the side menu remounts the
            viewer — same-route search-param navigation would otherwise keep
            the previous kata's playback state (overlay dismissed, verdict
            revealed). */}
        <KataReplayViewer
          key={repertoire.id}
          positions={positions}
          formatted={formatted}
          side={playerColor}
          stopPly={stopPly}
          verdict={verdict}
        />
      </div>

      {/* The other applicable katas sit in the right column, the same place
          (and styling) the repertoire detail page puts its line list. */}
      <ul className="space-y-1 lg:col-span-1">
        {entries.map((entry) => {
          const isSelected = entry.repertoire.id === repertoire.id;
          return (
            <li key={entry.repertoire.id}>
              <Link
                href={`/${locale}${pathFor(entry.repertoire.id)}`}
                className={`block w-full truncate rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-link-primary/10 font-medium text-link-primary'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {entry.repertoire.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
