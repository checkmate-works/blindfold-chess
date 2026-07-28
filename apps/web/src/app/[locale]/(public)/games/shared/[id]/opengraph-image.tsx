import { getTranslations } from 'next-intl/server';
import { ImageResponse } from 'next/og';

import { isCheckmateFen, replayMoves } from '@blindfold-chess/features/chess-core';

import { renderBoardSvg } from '@/lib/board-svg/render-board-svg';
import { getGameById } from '@/lib/db/games-read';
import { playSettingsToThumbnailDisplay } from '@/lib/games/play-settings-thumbnail';
import { resolveLosingColor, resolveTerminationMark } from '@/lib/games/termination-mark';
import { loadOgFonts } from '@/lib/og/load-og-fonts';
import { UUID_RE } from '@/lib/validations/uuid';

import type { Locale } from '@/app/[locale]/_lib/types';

import { buildGameOgDescription } from './_lib/page-metadata';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Shared game';

const CARD_BG = '#161512';
const BRAND_COLOR = '#7f7f7f';
const TITLE_COLOR = '#fafafa';
const BODY_COLOR = '#bababa';
const BADGE_BG = '#2b2926';
const BOARD_SIZE = 512;
const PADDING = 48;

type Props = { params: Promise<{ locale: Locale; id: string }> };

export default async function Image({ params }: Props) {
  const { locale, id } = await params;

  if (!UUID_RE.test(id)) {
    return new Response('Not Found', { status: 404 });
  }
  const detail = await getGameById(id);
  if (!detail) {
    return new Response('Not Found', { status: 404 });
  }
  const { game, author } = detail;

  const positions = replayMoves(game.moves, game.startingFen ?? undefined);
  const lastPosition = positions[positions.length - 1];
  const flipped = game.playerColor === 'black';

  const boardSvg = renderBoardSvg({
    fen: lastPosition.fen,
    size: BOARD_SIZE,
    flipped,
    lastMove: lastPosition.lastMove ?? null,
    // The card shows the position the game ended on, so it carries the same
    // end-of-game badge as the replay it links to — otherwise a resigned game
    // previews as an ordinary midgame position.
    terminationMark: resolveTerminationMark({
      fen: lastPosition.fen,
      losingColor: resolveLosingColor(game.result, game.playerColor),
      isCheckmate: isCheckmateFen(lastPosition.fen),
    }),
  });
  const boardDataUri = `data:image/svg+xml;base64,${Buffer.from(boardSvg).toString('base64')}`;

  const [t, summary] = await Promise.all([
    getTranslations({ locale, namespace: 'sharedGames' }),
    buildGameOgDescription({ locale, game }),
  ]);

  const authorName = author?.displayName ?? author?.username ?? t('detail.guest');
  const blindfoldDisplay = playSettingsToThumbnailDisplay(game.playSettings, game.playerColor);
  const siteName = (await getTranslations({ locale, namespace: 'metadata' }))('siteName');

  const panelText = [
    siteName,
    game.title,
    authorName,
    summary,
    blindfoldDisplay && t('detail.ogBlindfoldBadge'),
  ]
    .filter(Boolean)
    .join(' ');
  // '…' (U+2026) is always requested too: satori silently appends it to a
  // `lineClamp`-truncated title, even though it never appears in `panelText`
  // itself — without its glyph in the subset, the clamped title's last
  // character renders as tofu instead of an ellipsis.
  const fonts = await loadOgFonts(`${panelText}…`);

  const board = (
    <img
      src={boardDataUri}
      width={BOARD_SIZE}
      height={BOARD_SIZE}
      alt=""
      style={{ display: 'flex', borderRadius: 8 }}
    />
  );

  // No usable fonts (e.g. Google Fonts unreachable) — a text-bearing layout
  // would render as tofu, so fall back to a board-only card instead of
  // failing the whole image.
  if (fonts.length === 0) {
    return new ImageResponse(
      <div
        style={{
          display: 'flex',
          width: size.width,
          height: size.height,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: CARD_BG,
        }}
      >
        {board}
      </div>,
      {
        ...size,
        headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
      }
    );
  }

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: size.width,
        height: size.height,
        padding: PADDING,
        backgroundColor: CARD_BG,
        fontFamily: 'Noto Sans JP',
      }}
    >
      {board}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          marginLeft: PADDING,
          flex: 1,
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: BRAND_COLOR }}>
          {siteName}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              display: 'block',
              lineClamp: 2,
              fontSize: 48,
              fontWeight: 700,
              lineHeight: 1.25,
              color: TITLE_COLOR,
            }}
          >
            {game.title}
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: BODY_COLOR }}>{authorName}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', fontSize: 24, color: BODY_COLOR }}>{summary}</div>
          {blindfoldDisplay && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                width: 'fit-content',
                padding: '8px 20px',
                borderRadius: 999,
                backgroundColor: BADGE_BG,
                color: BODY_COLOR,
                fontSize: 22,
              }}
            >
              {`\u{1F648} ${t('detail.ogBlindfoldBadge')}`}
            </div>
          )}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts,
      // Immutable would be wrong: `moves`/`result` never change, but the
      // author can edit `title` at any time.
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    }
  );
}
