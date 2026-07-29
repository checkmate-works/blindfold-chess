import type { Metadata } from 'next';
import { getMessages, getTranslations } from 'next-intl/server';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { SITE_URL } from '@/config';
import { negotiateLocale } from '@/i18n/negotiate-locale';
import {
  getFenAfterMoves,
  getStartingFen,
  isCheckmateFen,
} from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { getGameById } from '@/lib/db/games-read';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';
import { gameUsedNotablePlaySettings } from '@/lib/games/play-settings-log';
import { decodeGameShortId } from '@/lib/games/short-id';
import { resolveLosingColor, resolveTerminationMark } from '@/lib/games/termination-mark';
import { resolveDisplayName } from '@/lib/users/display-name';
import { UUID_RE } from '@/lib/validations/uuid';

import { parseEmbedParams } from '../../_lib/embed-params';
import { EmbedProviders } from '../../_lib/providers';
import { EmbedGameReplay } from './_components/EmbedGameReplay';

type SearchParams = Record<string, string | string[] | undefined>;

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<SearchParams>;
};

/** Namespaces the widget's client components read — see the render below. */
const CLIENT_NAMESPACES = ['embed', 'Common'] as const;

async function loadGame(code: string) {
  const id = UUID_RE.test(code) ? code.toLowerCase() : decodeGameShortId(code);
  if (!id) return null;
  // `getGameById` is React-cached, so `generateMetadata` and the page body
  // share one query.
  return getGameById(id);
}

/**
 * Embeddable game replay (棋譜の埋め込みプレイヤー).
 *
 * @description
 * A chrome-less replay of one public game, sized to be dropped into somebody
 * else's article with an `<iframe>` — the format every other chess platform
 * offers, and the one thing a shared link and a downloadable GIF cannot do:
 * the reader steps through the game inside the post. What is embedded is a
 * *blindfold* game, shown as its player could see it, which is the part no
 * general chess server can render.
 *
 * @flow
 * `/embed/g/<code>` takes the same code as the `/g/<code>` share link, so an
 * embed URL is derivable from a link someone already holds (a raw UUID works
 * too). Everything about the display is a query param — see
 * `_lib/embed-params.ts`, which also explains why none of them can fail.
 *
 * Deliberately outside `app/[locale]`: readers arrive at the host page with
 * their own languages, and a locale baked into the URL by whoever copied the
 * embed code would impose the blogger's language on all of them. The locale
 * is negotiated per request, as `/g/<code>` does, with `?lang=` as the
 * override for a blogger who wants their article's language pinned.
 *
 * The framing headers that make this path embeddable live in
 * `@/lib/security/framing`; the bare document around it is `../../layout.tsx`.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const detail = await loadGame((await params).code);
  // Never reaches a search result — the segment is `noindex` (see the layout)
  // — but it names the tab when a reader opens the frame on its own.
  return { title: detail?.game.title };
}

export default async function EmbedGamePage({ params, searchParams }: Props) {
  const [{ code }, rawSearchParams, requestHeaders] = await Promise.all([
    params,
    searchParams,
    headers(),
  ]);

  const detail = await loadGame(code);
  if (!detail) notFound();

  const { game, author } = detail;
  const options = parseEmbedParams(rawSearchParams);
  const locale = options.lang ?? negotiateLocale(requestHeaders.get('accept-language'));

  const [messages, tMetadata, tPlay] = await Promise.all([
    getMessages({ locale }),
    getTranslations({ locale, namespace: 'metadata' }),
    getTranslations({ locale, namespace: 'play' }),
  ]);

  const moves = game.moves as AlgebraicNotation[];
  const startingFen = game.startingFen ?? getStartingFen();
  const finalFen = getFenAfterMoves(startingFen, game.moves);

  // Only the final position carries the mark, and the widget only draws it
  // there. Resolved here because every input is already server-side.
  const terminationMark = resolveTerminationMark({
    fen: finalFen,
    losingColor: resolveLosingColor(game.result, game.playerColor),
    isCheckmate: isCheckmateFen(finalFen),
  });

  // Reproducing the player's view only means something for a game that hid
  // something. For a sighted game the two views are the same board, so the
  // widget offers no toggle rather than a control that appears to do nothing.
  const canReproduce =
    game.playSettings != null &&
    gameUsedNotablePlaySettings(game.playSettings, game.playSettingsLog);

  // `?ply=` counts half-moves applied; the replay cursor counts positions,
  // where -1 is the opening board. An over-long value lands on the final
  // position (the hook clamps) rather than failing the embed.
  const initialIndex = options.ply === undefined ? -1 : options.ply - 1;

  return (
    <EmbedProviders
      locale={locale}
      // Only the namespaces this widget reads. The full dictionary is ~90 of
      // them; shipping it into every article that embeds a game would dwarf
      // the widget itself.
      messages={Object.fromEntries(
        CLIENT_NAMESPACES.map((namespace) => [namespace, messages[namespace]])
      )}
    >
      <EmbedGameReplay
        moves={moves}
        startingFen={startingFen}
        finalFen={finalFen}
        playerSide={game.playerColor}
        flipped={
          options.orientation ? options.orientation === 'black' : game.playerColor === 'black'
        }
        initialIndex={initialIndex}
        boardTheme={options.theme ?? DEFAULT_BOARD_THEME}
        playSettings={game.playSettings ?? null}
        playSettingsLog={game.playSettingsLog ?? null}
        reproduceByDefault={options.view === 'played' && canReproduce}
        canReproduce={canReproduce}
        terminationMark={terminationMark}
        terminationMarkLabel={
          terminationMark ? tPlay(`finishedGame.termination.${terminationMark.kind}`) : ''
        }
        attribution={{
          title: game.title,
          author: author ? resolveDisplayName(author) : null,
          // Campaign-tagged so embed referrals are countable, and pointed at
          // the canonical page rather than `/g/<code>`: the reader is one
          // click from the game itself, with no redirect hop.
          href: `${SITE_URL}/${locale}/games/shared/${game.id}?utm_source=embed&utm_medium=iframe`,
          siteName: tMetadata('siteName'),
        }}
      />
    </EmbedProviders>
  );
}
