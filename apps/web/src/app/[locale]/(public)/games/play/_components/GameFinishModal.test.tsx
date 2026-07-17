import type { ReactNode } from 'react';

import { NextIntlClientProvider } from 'next-intl';

import { IntlAvailableContext } from '@/i18n/IntlAvailableContext';
import jaMessages from '@/messages/ja.json';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GameFinishModal } from './GameFinishModal';

vi.mock('@/app/[locale]/_components/HelpTourButton', () => ({
  HelpTourButton: () => null,
}));

vi.mock('@/app/[locale]/(public)/games/play/result/_components/CompactResultHeader', () => ({
  CompactResultHeader: ({ result }: { result: string }) => <div data-testid="result">{result}</div>,
}));

function renderModal(props: Partial<Parameters<typeof GameFinishModal>[0]> = {}): {
  onShare: () => void;
  onReview: () => void;
} {
  const onShare = vi.fn();
  const onReview = vi.fn();
  const ui: ReactNode = (
    <NextIntlClientProvider locale="ja" messages={jaMessages}>
      <IntlAvailableContext.Provider value={true}>
        <GameFinishModal
          isOpen
          onClose={vi.fn()}
          result="win"
          onReview={onReview}
          onRecall={vi.fn()}
          onRepertoireCheck={vi.fn()}
          {...props}
        />
      </IntlAvailableContext.Provider>
    </NextIntlClientProvider>
  );
  // `Modal` portals only after its mount effect runs, so a bare render()
  // returns nothing to query.
  act(() => {
    render(ui);
  });
  return { onShare, onReview };
}

const PROMO_TITLE = /昇格条件を満たしました/;

describe('GameFinishModal — promotion view', () => {
  it('offers publishing when this win would earn a rank', () => {
    renderModal({ promotionRankSlug: '1kyu', onShare: vi.fn() });

    expect(screen.getByText(/1級昇格条件を満たしました/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ゲームを公開する' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '公開しない' })).toBeInTheDocument();
  });

  it('replaces the three choice cards rather than sitting alongside them', () => {
    renderModal({ promotionRankSlug: '1kyu', onShare: vi.fn() });

    expect(screen.queryByText(jaMessages.play.finishModal.recall.title)).not.toBeInTheDocument();
    expect(
      screen.queryByText(jaMessages.play.finishModal.repertoireCheck.title)
    ).not.toBeInTheDocument();
  });

  it('routes "publish" to onShare and "don\'t publish" to onReview', async () => {
    const onShare = vi.fn();
    const onReview = vi.fn();
    act(() => {
      render(
        <NextIntlClientProvider locale="ja" messages={jaMessages}>
          <IntlAvailableContext.Provider value={true}>
            <GameFinishModal
              isOpen
              onClose={vi.fn()}
              result="win"
              onReview={onReview}
              onRecall={vi.fn()}
              onRepertoireCheck={vi.fn()}
              promotionRankSlug="1kyu"
              onShare={onShare}
            />
          </IntlAvailableContext.Provider>
        </NextIntlClientProvider>
      );
    });

    screen.getByRole('button', { name: 'ゲームを公開する' }).click();
    expect(onShare).toHaveBeenCalledTimes(1);

    // "Don't publish" is not a dismiss — it lands on the result screen, the
    // same place the Game Review card goes.
    screen.getByRole('button', { name: '公開しない' }).click();
    expect(onReview).toHaveBeenCalledTimes(1);
  });

  // The promise ("publish and you rank up") is only honest under conditions the
  // server will agree with. Each of these would make it a lie.
  describe('does not promise a promotion', () => {
    it('when no rank is pending', () => {
      renderModal({ promotionRankSlug: null, onShare: vi.fn() });
      expect(screen.queryByText(PROMO_TITLE)).not.toBeInTheDocument();
      expect(screen.getByText(jaMessages.play.finishModal.recall.title)).toBeInTheDocument();
    });

    it('when the game is already published — it has earned what it will earn', () => {
      renderModal({ promotionRankSlug: '1kyu', onShare: vi.fn(), published: true });
      expect(screen.queryByText(PROMO_TITLE)).not.toBeInTheDocument();
    });

    it('when there is no way to publish', () => {
      renderModal({ promotionRankSlug: '1kyu', onShare: undefined });
      expect(screen.queryByText(PROMO_TITLE)).not.toBeInTheDocument();
    });
  });
});
