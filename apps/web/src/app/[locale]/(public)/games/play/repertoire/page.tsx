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

import { Button } from '@/app/_components';
import { formatMovesToPgn, formatPgnToText } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { getOptionalUser } from '@/lib/auth';
import { withReturnPath } from '@/lib/auth-return-path';
import { getCurrentReturnTarget } from '@/lib/current-return-target';
import { getRepertoireCardMeta } from '@/lib/repertoires/card-meta';
import { getRepertoireCheckReport } from '@/lib/repertoires/check-report';
import { listRepertoiresForUser } from '@/lib/repertoires/queries';

import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';
import { RepertoireListCard } from '@/app/[locale]/(public)/repertoires/_components/RepertoireListCard';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components/HelpTourButton';
import { HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { RepertoireCheckView } from './_components/RepertoireCheckView';
import {
  REPERTOIRE_CHECK_PATH,
  buildRepertoireCheckQuery,
  parseRepertoireCheckParams,
} from './_lib/check-url';

const REPERTOIRE_CHECK_HELP_TARGET = 'repertoire-check-help-target';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Per-user SSR page (reads the signed-in user's own repertoires and the
 * game's searchParams), so it must never be ISR-cached — the shared HTML
 * would leak one viewer's kata list to everyone. See
 * `src/lib/isr-user-scope-guard.test.ts`.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'play' });
  const title = t('repertoireCheck.title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/play/repertoire', title }),
    title: resolveTitle(title, locale),
  };
}

/**
 * Message + stacked full-width CTA(s), unadorned (no card/border) to match the
 * rest of the app's empty states (e.g. `/repertoires`'s own "no repertoires
 * yet" message) rather than boxing content in a bordered panel. No padding of
 * its own — the panel's `space-y-8` already sets the rhythm between this and
 * its siblings (the SectionTitle above, the "back" link below), the same as
 * the picker's card list; adding padding here on top of that doubled it.
 */
function EmptyState({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {children && <div className="flex flex-col gap-3">{children}</div>}
    </div>
  );
}

/** A full-width button-styled link — the shape every CTA on this page takes. */
function CtaLink({
  href,
  variant = 'primary',
  children,
}: {
  href: string;
  variant?: 'primary' | 'outline';
  children: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Button asChild variant={variant} size="lg" fullWidth>
        {children}
      </Button>
    </Link>
  );
}

export default async function RepertoireCheckPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, sp, user] = await Promise.all([
    getTranslations({ locale, namespace: 'play' }),
    searchParams,
    getOptionalUser(),
  ]);

  const {
    moves,
    playerColor,
    startingFen,
    gameId,
    repertoireId: selectedId,
  } = parseRepertoireCheckParams(sp);

  const helpSteps: HelpStep[] = [
    {
      targetId: REPERTOIRE_CHECK_HELP_TARGET,
      title: t('repertoireCheck.help.title'),
      description: t('repertoireCheck.help.description'),
      side: 'bottom',
      align: 'center',
    },
  ];

  /**
   * This page's own path with a kata selected — locale-less, since the picker
   * card's i18n Link adds the prefix itself.
   */
  const pickPathFor = (repertoireId: string) =>
    `${REPERTOIRE_CHECK_PATH}?${buildRepertoireCheckQuery({
      moves: moves ?? [],
      playerColor,
      startingFen,
      gameId,
      repertoireId,
    })}`;

  let content: React.ReactNode;
  if (!moves) {
    content = (
      <EmptyState message={t('repertoireCheck.invalid')}>
        <CtaLink href={`/${locale}/games/play`}>{t('repertoireCheck.backToPlay')}</CtaLink>
      </EmptyState>
    );
  } else if (!user) {
    // The moves being checked live entirely in this page's query string, so
    // dropping the return target here would lose the game the visitor just
    // finished — they would have to replay it to get back to this check.
    const signInHref = withReturnPath(`/${locale}/sign-in`, await getCurrentReturnTarget());
    content = (
      <EmptyState message={t('repertoireCheck.signInRequired')}>
        <CtaLink href={signInHref}>{t('repertoireCheck.signIn')}</CtaLink>
      </EmptyState>
    );
  } else {
    const report = await getRepertoireCheckReport({
      userId: user.id,
      moves,
      playerColor,
      startingFen,
    });
    const side = t(`repertoireCheck.side_${playerColor}`);
    // The game as move pairs — the replay view's move strip and the "turn
    // this game into a kata" CTA below share the same formatting.
    const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);
    const formattedGame = formatMovesToPgn(
      moves as AlgebraicNotation[],
      startsAsBlack,
      startMoveNumber
    );
    // Prefilled with this game's own PGN + side, so "register a kata" doubles
    // as "turn this game into one" — the common case when the reason nothing
    // applies is that no kata for this opening exists yet.
    const gamePgnText = formatPgnToText(formattedGame, startingFen);
    const newRepertoireHref = `/${locale}/repertoires/new?pgn=${encodeURIComponent(gamePgnText)}&side=${playerColor}`;
    const registerCtas = (
      <>
        <CtaLink href={newRepertoireHref}>{t('repertoireCheck.registerCta')}</CtaLink>
        <CtaLink href={`/${locale}/repertoires`} variant="outline">
          {t('repertoireCheck.viewRepertoires')}
        </CtaLink>
      </>
    );

    const selected = selectedId
      ? report.entries.find((entry) => entry.repertoire.id === selectedId)
      : undefined;

    if (selected) {
      content = (
        <RepertoireCheckView
          selected={selected}
          entries={report.entries}
          moves={moves}
          formatted={formattedGame}
          playerColor={playerColor}
          startingFen={startingFen}
          gameId={gameId}
          locale={locale}
        />
      );
    } else {
      // Whether there's something to pick or not, this is the "select a
      // kata" section — the heading stays put and only the body beneath it
      // changes (an empty-state message + CTAs, or the card list).
      let body: React.ReactNode;
      if (!report.hasRepertoiresForSide) {
        body = (
          <EmptyState message={t('repertoireCheck.noRepertoires', { side })}>
            {registerCtas}
          </EmptyState>
        );
      } else if (report.entries.length === 0) {
        body = (
          <EmptyState message={t('repertoireCheck.noneApplicable')}>{registerCtas}</EmptyState>
        );
      } else {
        // Pick which kata to check against — the same catalogue cards the
        // /repertoires list and the opening topic's Repertoires tab render,
        // just pointed at this page's replay view instead of the detail
        // page. The verdict stays unrevealed until the replay arrives at it.
        const applicableIds = new Set(report.entries.map((entry) => entry.repertoire.id));
        const [userCards, cardMeta] = await Promise.all([
          listRepertoiresForUser(user.id),
          getRepertoireCardMeta([...applicableIds], user.id),
        ]);
        const cards = userCards.filter((card) => applicableIds.has(card.repertoire.id));
        body = (
          <div className="space-y-3">
            {cards.map((card) => (
              <RepertoireListCard
                key={card.repertoire.id}
                card={card}
                meta={cardMeta(card.repertoire.id)}
                locale={locale}
                detailHref={pickPathFor(card.repertoire.id)}
              />
            ))}
          </div>
        );
      }
      content = (
        <>
          <SectionTitle>{t('repertoireCheck.selectHeading')}</SectionTitle>
          {body}
        </>
      );
    }
  }

  return (
    <PageLayout
      title={<span data-tour-id={REPERTOIRE_CHECK_HELP_TARGET}>{t('repertoireCheck.title')}</span>}
      titleAction={<HelpTourButton steps={helpSteps} label={t('repertoireCheck.help.label')} />}
      locale={locale}
    >
      {content}

      {gameId && (
        <p className="text-center">
          <Link
            href={`/${locale}/games/play/result?gameId=${gameId}`}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            {t('repertoireCheck.backToResult')}
          </Link>
        </p>
      )}
    </PageLayout>
  );
}
