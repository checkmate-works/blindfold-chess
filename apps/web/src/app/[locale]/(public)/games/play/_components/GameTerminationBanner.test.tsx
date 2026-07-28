import { NextIntlClientProvider } from 'next-intl';

import { IntlAvailableContext } from '@/i18n/IntlAvailableContext';
import jaMessages from '@/messages/ja.json';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { GameResult } from '../_lib/result-visuals';
import type { Termination } from '../_lib/termination';
import { GameTerminationBanner } from './GameTerminationBanner';

function renderBanner(termination: Termination, result: GameResult) {
  return render(
    <NextIntlClientProvider locale="ja" messages={jaMessages}>
      <IntlAvailableContext.Provider value={true}>
        <GameTerminationBanner termination={termination} result={result} />
      </IntlAvailableContext.Provider>
    </NextIntlClientProvider>
  );
}

describe('GameTerminationBanner', () => {
  it('names the reason and the outcome for a checkmate', () => {
    renderBanner('checkmate', 'win');

    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('チェックメイト');
    expect(banner).toHaveTextContent('あなたの勝利！');
  });

  it('says the player resigned rather than repeating "checkmate"', () => {
    renderBanner('resignation', 'loss');

    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('投了');
    expect(banner).not.toHaveTextContent('チェックメイト');
  });

  it('drops the redundant result clause on a draw', () => {
    renderBanner('draw', 'draw');

    expect(screen.getByRole('status').textContent?.trim()).toBe('引き分け');
  });

  it('keeps the outcome for a stalemate, whose reason is not the outcome', () => {
    renderBanner('stalemate', 'draw');

    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('ステイルメイト');
    expect(banner).toHaveTextContent('引き分け');
  });
});
