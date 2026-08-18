// @vitest-environment jsdom
import { Suspense, act, lazy } from 'react';

import { hydrateRoot } from 'react-dom/client';
import { renderToReadableStream } from 'react-dom/server.browser';
import { afterEach, describe, expect, it } from 'vitest';

import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

import { GamePreferencesProvider, useGamePreferences } from './GamePreferencesContext';
import { PREFERENCES_STORAGE_KEY } from './game-preferences-persistence';

/**
 * Regression test for the home-feed thumbnails intermittently keeping the
 * default board theme.
 *
 * The provider reads localStorage in a mount effect, so the server renders
 * every board with the default theme. The home feed streams inside a
 * `<Suspense>` boundary *below* the provider and hydrates whenever its HTML
 * arrives — sometimes after that effect has already loaded the user's theme.
 * React does not repair attribute differences it meets while hydrating, so a
 * card that hydrated with the loaded theme against default-theme HTML kept
 * the default colours for good. `useGamePreferences` now hands hydrating
 * consumers the server's state and re-renders them once afterwards; see its
 * TSDoc.
 *
 * The test reproduces the exact ordering: stream the fully resolved HTML on
 * the server, hydrate on the client with the boundary's content still
 * pending (a `lazy` that resolves later), let the provider load the stored
 * theme, and only then let the boundary hydrate.
 */

const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function ThemedThumbnail() {
  const { preferences } = useGamePreferences();
  return <BoardThumbnail fen={FEN} boardTheme={preferences.boardTheme} />;
}

async function readStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let html = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return html;
    html += decoder.decode(value, { stream: true });
  }
}

function firstSquareClass(container: HTMLElement): string {
  return container.querySelector('.grid')?.firstElementChild?.className ?? '';
}

describe('useGamePreferences under hydration', () => {
  afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('patches the stored theme into a boundary that hydrates after the provider loaded it', async () => {
    const stream = await renderToReadableStream(
      <GamePreferencesProvider>
        <Suspense fallback={null}>
          <ThemedThumbnail />
        </Suspense>
      </GamePreferencesProvider>
    );
    await stream.allReady;
    const html = await readStream(stream);
    // Precondition: the server has no localStorage, so it painted the default.
    expect(html).toContain('color-board-lichess-light');

    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ boardTheme: 'chesscom' }));

    let deliverBoundary!: (module: { default: typeof ThemedThumbnail }) => void;
    const LateThumbnail = lazy(
      () =>
        new Promise<{ default: typeof ThemedThumbnail }>((resolve) => {
          deliverBoundary = resolve;
        })
    );

    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    const recoverableErrors: unknown[] = [];
    await act(async () => {
      hydrateRoot(
        container,
        <GamePreferencesProvider>
          <Suspense fallback={null}>
            <LateThumbnail />
          </Suspense>
        </GamePreferencesProvider>,
        { onRecoverableError: (error) => recoverableErrors.push(error) }
      );
    });
    // The provider's mount effect has run: it now holds `chesscom`, while the
    // boundary is still dehydrated with `lichess` markup.
    expect(firstSquareClass(container)).toContain('color-board-lichess-light');

    await act(async () => {
      deliverBoundary({ default: ThemedThumbnail });
    });

    expect(firstSquareClass(container)).toContain('color-board-chesscom-light');
    expect(recoverableErrors).toEqual([]);
  });
});
