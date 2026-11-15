// @vitest-environment jsdom
/**
 * The pair must stay two real links that open in a new tab — one per URL —
 * so a viewer can pick the snapshot or the sequence, and middle-click or copy
 * either. Translations resolve through the mocked safe-translations fallback
 * (echoes the key), so assertions use the stable keys.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LichessAnalysisButtons } from './LichessAnalysisButtons';

vi.mock('@/i18n/use-safe-translations');

const URLS = {
  position: 'https://lichess.org/analysis/8/8/8/8/8/8/8/k6K_w_-_-_0_1',
  game: 'https://lichess.org/analysis/pgn/e4_e5#2',
};

describe('LichessAnalysisButtons', () => {
  it('renders a position link and a game link, each opening its own URL in a new tab', () => {
    render(<LichessAnalysisButtons urls={URLS} />);

    const group = screen.getByRole('group', { name: /analyzeOnLichess/ });
    expect(group).toBeTruthy();

    const position = screen.getByRole('link', { name: /lichessAnalysis\.position$/ });
    const game = screen.getByRole('link', { name: /lichessAnalysis\.game$/ });

    expect(position.getAttribute('href')).toBe(URLS.position);
    expect(game.getAttribute('href')).toBe(URLS.game);
    for (const link of [position, game]) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
  });
});
