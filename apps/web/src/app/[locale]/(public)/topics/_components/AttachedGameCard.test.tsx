import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AttachedGameCardData } from './AttachedGameCard';
import { AttachedGameCard } from './AttachedGameCard';

afterEach(() => {
  cleanup();
});

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

// MiniBoard pulls in chess-pieces / icons / GamePreferencesContext, none of
// which are relevant here. Stub it to a marker div so we can assert
// "thumbnail rendered" without exercising the chessboard rendering stack.
vi.mock('@/app/[locale]/(public)/topics/openings/_components/MiniBoard', () => ({
  MiniBoard: ({ fen }: { fen: string }) => <div data-testid="mini-board" data-fen={fen} />,
}));

// next/dynamic returns a stub that simply renders a placeholder. The lazy
// chess-core load is irrelevant for the structural / a11y / DOM tests
// here — what matters is that the summary card itself does not depend
// on chess-core at module-import time (verified separately further below).
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Stub = () => <div data-testid="lazy-replay-stub" />;
    return Stub;
  },
}));

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function makeAttachment(overrides: Partial<AttachedGameCardData> = {}): AttachedGameCardData {
  return {
    id: 'att-1',
    source: 'pgn',
    sourceUrl: null,
    sourceGameId: null,
    pgn: '[Event "x"]\n\n1. e4 e5',
    moveCount: 2,
    headerWhite: 'Alice',
    headerBlack: 'Bob',
    headerResult: '*',
    headerEvent: 'Test Cup',
    headerSite: null,
    headerDate: '2026.04.27',
    anonymized: false,
    attributionPlatform: null,
    attributionPath: null,
    finalFen: STARTING_FEN,
    ...overrides,
  };
}

describe('AttachedGameCard — DOM / a11y structure', () => {
  it('does NOT nest a <button> inside an <a> (M1 a11y fix verification)', () => {
    // Per BaseTopicPostCard's design, the click-to-detail <a> is a
    // sibling of `extraContent` (the AttachedGameCard). The card must
    // therefore never render its own interactive children inside an
    // anchor — even self-contained ones — so the rule "no button in
    // a link" must hold for the card on its own.
    const { container } = render(<AttachedGameCard attachment={makeAttachment()} />);
    expect(container.querySelectorAll('a button')).toHaveLength(0);
  });

  it('renders a thumbnail with the precomputed final FEN', () => {
    const att = makeAttachment({ finalFen: STARTING_FEN });
    const { getByTestId } = render(<AttachedGameCard attachment={att} />);
    const board = getByTestId('mini-board');
    expect(board.getAttribute('data-fen')).toBe(STARTING_FEN);
  });

  it('renders header text rows but NO <a href> for the [Site] PGN header (XSS / SPEC1 §7-4)', () => {
    const att = makeAttachment({
      source: 'pgn',
      headerSite: 'https://lichess.org/abcd1234',
    });
    const { container, queryByText } = render(<AttachedGameCard attachment={att} />);

    // The site value is shown as text…
    expect(queryByText('https://lichess.org/abcd1234')).not.toBeNull();
    // …but NOT as an anchor href.
    const anchors = Array.from(container.querySelectorAll('a'));
    const siteAnchor = anchors.find((a) =>
      (a.getAttribute('href') ?? '').includes('lichess.org/abcd1234')
    );
    expect(siteAnchor).toBeUndefined();
  });

  it('renders a chess.com attribution link rebuilt from attribution_path (NOT from sourceUrl)', () => {
    // The persisted sourceUrl is intentionally a hostile string to
    // verify the renderer never reads it back as an href. Only the
    // (platform, path) pair drives the rendered link.
    const att = makeAttachment({
      source: 'pgn',
      sourceUrl: 'https://evil.tld/payload',
      attributionPlatform: 'chesscom',
      attributionPath: '/game/live/12345',
    });
    const { container } = render(<AttachedGameCard attachment={att} />);

    const anchors = Array.from(container.querySelectorAll('a'));
    const chesscomAnchor = anchors.find(
      (a) => a.getAttribute('href') === 'https://www.chess.com/game/live/12345'
    );
    expect(chesscomAnchor).toBeDefined();
    expect(chesscomAnchor?.getAttribute('target')).toBe('_blank');
    const rel = chesscomAnchor?.getAttribute('rel') ?? '';
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
    // UGC link must NOT transfer PageRank to chess.com.
    expect(rel).toContain('nofollow');

    // The hostile sourceUrl must not have produced an anchor.
    const evilAnchor = anchors.find((a) => (a.getAttribute('href') ?? '').includes('evil.tld'));
    expect(evilAnchor).toBeUndefined();
  });

  it('does NOT render a chess.com attribution link when the platform/path pair is null', () => {
    // Pure PGN attachment (no off-platform attribution) — no chess.com
    // anchor should appear.
    const att = makeAttachment({
      source: 'pgn',
      attributionPlatform: null,
      attributionPath: null,
    });
    const { container } = render(<AttachedGameCard attachment={att} />);
    const anchors = Array.from(container.querySelectorAll('a'));
    expect(
      anchors.find((a) => (a.getAttribute('href') ?? '').includes('chess.com'))
    ).toBeUndefined();
  });

  it('renders a real <a> for Lichess-source attachments (canonical URL only)', () => {
    const att = makeAttachment({
      source: 'lichess',
      sourceGameId: 'abcd1234',
      sourceUrl: 'https://lichess.org/abcd1234',
      headerSite: 'https://malicious.example/?x=1',
    });
    const { container } = render(<AttachedGameCard attachment={att} />);

    const anchors = Array.from(container.querySelectorAll('a'));
    // The canonical Lichess URL must be linked.
    const lichessAnchor = anchors.find(
      (a) => a.getAttribute('href') === 'https://lichess.org/abcd1234'
    );
    expect(lichessAnchor).toBeDefined();
    // target=_blank with noopener noreferrer + UGC nofollow (Phase H L-1).
    // Same posture as the chess.com attribution link: a comment-attached
    // outbound link must not transfer PageRank to lichess.org via UGC.
    expect(lichessAnchor?.getAttribute('target')).toBe('_blank');
    const lichessRel = lichessAnchor?.getAttribute('rel') ?? '';
    expect(lichessRel).toContain('noopener');
    expect(lichessRel).toContain('noreferrer');
    expect(lichessRel).toContain('nofollow');

    // The hostile [Site] header value must NOT have been linked.
    const evilAnchor = anchors.find((a) =>
      (a.getAttribute('href') ?? '').includes('malicious.example')
    );
    expect(evilAnchor).toBeUndefined();
  });

  it('shows the anonymized note only when attachment.anonymized=true', () => {
    const { queryByText: queryWith } = render(
      <AttachedGameCard attachment={makeAttachment({ anonymized: true })} />
    );
    expect(queryWith('card.anonymizedNote')).not.toBeNull();

    cleanup();

    const { queryByText: queryWithout } = render(
      <AttachedGameCard attachment={makeAttachment({ anonymized: false })} />
    );
    expect(queryWithout('card.anonymizedNote')).toBeNull();
  });

  it('renders the player names and event header rows', () => {
    const att = makeAttachment({
      headerWhite: 'Alice',
      headerBlack: 'Bob',
      headerEvent: 'Test Cup',
      headerResult: '1-0',
    });
    const { container } = render(<AttachedGameCard attachment={att} />);
    const text = container.textContent ?? '';
    expect(text).toContain('Alice');
    expect(text).toContain('Bob');
    expect(text).toContain('Test Cup');
    // result "1-0" is shown when not '*'
    expect(text).toContain('1-0');
  });

  it('hides the result span when result is "*"', () => {
    const att = makeAttachment({
      headerResult: '*',
      headerWhite: 'Alice',
      headerBlack: 'Bob',
    });
    const { container } = render(<AttachedGameCard attachment={att} />);
    expect(container.textContent ?? '').not.toContain('*');
  });

  it('does NOT render the player-line <p> when both white and black are null', () => {
    const att = makeAttachment({
      headerWhite: null,
      headerBlack: null,
    });
    const { container, queryByText } = render(<AttachedGameCard attachment={att} />);
    // No "vs" connector text should appear when neither side is present.
    expect(queryByText(/vs/)).toBeNull();
    // The mini board still renders (it is the always-on visual anchor).
    expect(container.querySelector('[data-testid="mini-board"]')).not.toBeNull();
  });

  it('toggles the "Open replay" button label when clicked', () => {
    const { getByText } = render(<AttachedGameCard attachment={makeAttachment()} />);
    // Initial label
    const button = getByText('card.replayButton') as HTMLButtonElement;
    expect(button.tagName).toBe('BUTTON');

    fireEvent.click(button);
    expect(getByText('card.collapseButton')).not.toBeNull();
  });
});

// ─── M2 bundle isolation guard (static source check) ───
//
// The summary card MUST NOT statically import `chess-core` — that would
// pull chess.js into the chunk-page first-paint client bundle. The
// chess.js-bearing replay UI lives in a separate file (AttachedGameCardReplay)
// loaded lazily via `next/dynamic({ ssr: false })`. We pin this contract
// with a source-text grep so a future refactor that moves a chess-core
// import into the summary card surfaces here in CI rather than in a
// production bundle-size regression.
describe('AttachedGameCard — module graph contract (M2)', () => {
  it('does not statically import @blindfold-chess/features/chess-core', async () => {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const path = await import('node:path');

    const here = path.dirname(fileURLToPath(import.meta.url));
    const source = await readFile(path.join(here, 'AttachedGameCard.tsx'), 'utf8');

    // The replay sub-component IS allowed to import chess-core; the
    // summary card must not. Grep accepts both quote styles.
    expect(source).not.toMatch(/from\s+['"]@blindfold-chess\/features\/chess-core['"]/);
    expect(source).not.toMatch(/from\s+['"]chess\.js['"]/);
  });

  it('the replay sub-component IS allowed to import chess-core (sanity check)', async () => {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const path = await import('node:path');

    const here = path.dirname(fileURLToPath(import.meta.url));
    const replaySource = await readFile(path.join(here, 'AttachedGameCardReplay.tsx'), 'utf8');

    expect(replaySource).toMatch(/from\s+['"]@blindfold-chess\/features\/chess-core['"]/);
  });
});
