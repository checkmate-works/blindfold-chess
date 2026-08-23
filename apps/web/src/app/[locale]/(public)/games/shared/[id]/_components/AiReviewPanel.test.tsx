import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiReview } from '@/lib/ai-review/types';

import { GlossaryTermModalProvider } from '@/app/[locale]/_components/glossary-term/GlossaryTermModalProvider';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { AiReviewGenerationState } from '../_hooks/use-ai-review-generation';
import { AiReviewPanel } from './AiReviewPanel';

/** The principle the fixture review names, as the page would embed it. */
const PRINCIPLE_TERMS = {
  'count-attackers-and-defenders': {
    slug: 'count-attackers-and-defenders',
    name: 'Count attackers and defenders',
    definition: 'Before a capture or a fight for a square, count the attackers and the defenders',
    href: '/en/glossary/count-attackers-and-defenders',
  },
};

function renderPanel(ui: React.ReactElement) {
  return render(
    <GlossaryTermModalProvider terms={PRINCIPLE_TERMS} viewDetailsLabel="View">
      {ui}
    </GlossaryTermModalProvider>
  );
}

vi.mock('@/i18n/use-safe-translations');

vi.mock('@/i18n/routing');

vi.mock('@/app/[locale]/_hooks/use-current-path-as-next', () => ({
  useCurrentPathAsNext: () => '/en/games/shared/x',
}));

// The generation run is the page's (see GameReview); the panel only renders
// whatever state it is handed.
let mockState: AiReviewGenerationState;
const mockStart = vi.fn();
const mockCancel = vi.fn();

const REVIEW: AiReview = {
  locale: 'en',
  content: {
    summary: ['A hard-fought game with one decisive slip.'],
    momentComments: [
      {
        ply: 4,
        explanation: 'This dropped the knight.',
        lesson: 'Count the defenders first.',
        principle: 'count_attackers_and_defenders',
      },
    ],
    strengths: ['Solid opening play.'],
    weaknesses: ['Tactical oversights in the middlegame.'],
    advice: ['Practice counting attackers and defenders.'],
  },
  moments: [
    {
      ply: 4,
      san: 'Nd5',
      moveNumber: 3,
      color: 'white',
      evalBefore: 30,
      evalAfter: -170,
      cpLoss: 200,
      bestMoveSan: 'Qd2',
      judgment: 'mistake',
    },
  ],
  summaryStats: {
    totalPlies: 10,
    playerColor: 'white',
    avgCpLossPlayer: 45,
    judgmentCountsPlayer: { best: 3, good: 1, inaccuracy: 0, mistake: 1, blunder: 0 },
  },
  model: 'gpt-5-mini',
  createdAt: '2026-08-14T00:00:00.000Z',
};

const baseProps = {
  locale: 'en' as Locale,
  review: null,
  // The subscribed author — the viewer every generation-flow case below is
  // about. The gated variants override this.
  generation: { kind: 'allowed' } as const,
  onStart: mockStart,
  onCancel: mockCancel,
  onJumpToPly: vi.fn(),
};

describe('AiReviewPanel', () => {
  beforeEach(() => {
    mockState = { phase: 'idle' };
  });

  it('renders the review when one is cached, with engine facts joined by ply', () => {
    renderPanel(<AiReviewPanel {...baseProps} generationState={mockState} review={REVIEW} />);

    expect(screen.getByText('A hard-fought game with one decisive slip.')).toBeInTheDocument();
    // The principle is a glossary link in the viewer's language, in the
    // moment's own callout — the review carries no separate tally.
    const links = screen.getAllByRole('link', { name: 'Count attackers and defenders' });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/en/glossary/count-attackers-and-defenders');
    expect(screen.getByText('3. Nd5')).toBeInTheDocument();
    // The grade shows as chess notation, named for assistive tech.
    const grade = screen.getByRole('img', { name: 'aiReview.judgments.mistake' });
    expect(grade).toHaveTextContent('?');
    expect(screen.getByText('+0.3 → -1.7')).toBeInTheDocument();
    expect(screen.getByText('Qd2')).toBeInTheDocument();
    expect(screen.getByText('This dropped the knight.')).toBeInTheDocument();
    // No generate CTA once a review exists.
    expect(screen.queryByText('aiReview.generateButton')).not.toBeInTheDocument();
  });

  it('labels a review written in another language, and only then', () => {
    const { unmount } = renderPanel(
      <AiReviewPanel {...baseProps} generationState={mockState} review={REVIEW} />
    );
    expect(screen.queryByText('aiReview.languageNote')).not.toBeInTheDocument();
    unmount();

    renderPanel(
      <AiReviewPanel
        {...baseProps}
        generationState={mockState}
        review={{ ...REVIEW, locale: 'ja' }}
      />
    );
    expect(screen.getByText('aiReview.languageNote')).toBeInTheDocument();
  });

  it('jumps the quick-peek preview when a moment header is clicked', () => {
    const onJumpToPly = vi.fn();
    renderPanel(
      <AiReviewPanel
        {...baseProps}
        generationState={mockState}
        review={REVIEW}
        onJumpToPly={onJumpToPly}
      />
    );

    fireEvent.click(screen.getByText('3. Nd5'));
    expect(onJumpToPly).toHaveBeenCalledWith(4);
  });

  it('explains the coin price, with both ways to pay, when the balance cannot cover it', () => {
    renderPanel(
      <AiReviewPanel
        {...baseProps}
        generationState={mockState}
        generation={{ kind: 'insufficient_balance', cost: 1, balance: 0 }}
      />
    );

    expect(screen.getByText('aiReview.upsell.title')).toBeInTheDocument();
    // Asserted loosely: the locale prefix is next-intl's to add, and it does
    // not do so outside a request context.
    expect(screen.getByText('aiReview.upsell.coinCta').closest('a')).toHaveAttribute(
      'href',
      expect.stringContaining('/coin')
    );
    expect(screen.getByText('aiReview.upsell.cta').closest('a')).toHaveAttribute(
      'href',
      expect.stringContaining('/pricing')
    );
    expect(screen.queryByText('aiReview.generateButton')).not.toBeInTheDocument();
  });

  it('prices the generate button and shows the balance for a coin payer, and not for a subscriber', () => {
    const { unmount } = renderPanel(
      <AiReviewPanel
        {...baseProps}
        generationState={mockState}
        generation={{ kind: 'payable', cost: 1, balance: 2 }}
      />
    );
    // The price is on the CTA itself, before anything opens.
    expect(screen.getByRole('button', { name: 'aiReview.generateButtonPaid' })).toBeInTheDocument();
    expect(screen.getByText('aiReview.balance')).toBeInTheDocument();
    expect(screen.queryByText('aiReview.generateButton')).not.toBeInTheDocument();
    unmount();

    renderPanel(<AiReviewPanel {...baseProps} generationState={mockState} />);
    expect(screen.getByRole('button', { name: 'aiReview.generateButton' })).toBeInTheDocument();
    expect(screen.queryByText('aiReview.balance')).not.toBeInTheDocument();
  });

  it('prices the retry too — the refunded run is paid for again', () => {
    mockState = { phase: 'error', error: 'llm_error' };
    renderPanel(
      <AiReviewPanel
        {...baseProps}
        generationState={mockState}
        generation={{ kind: 'payable', cost: 1, balance: 2 }}
      />
    );
    expect(screen.getByRole('button', { name: 'aiReview.retryPaid' })).toBeInTheDocument();
    expect(screen.queryByText('aiReview.retry')).not.toBeInTheDocument();
  });

  it('states the coin price in the confirmation for a coin payer, and not for a subscriber', () => {
    const { unmount } = renderPanel(
      <AiReviewPanel
        {...baseProps}
        generationState={mockState}
        generation={{ kind: 'payable', cost: 1, balance: 2 }}
      />
    );
    fireEvent.click(screen.getByText('aiReview.generateButtonPaid'));
    expect(screen.getByText('aiReview.confirm.cost')).toBeInTheDocument();
    unmount();

    renderPanel(<AiReviewPanel {...baseProps} generationState={mockState} />);
    fireEvent.click(screen.getByText('aiReview.generateButton'));
    expect(screen.queryByText('aiReview.confirm.cost')).not.toBeInTheDocument();
  });

  it('shows the accepted notice for a queued job, whatever the offer', () => {
    mockState = { phase: 'queued', job: { id: 'job-1', locale: 'en' } };
    renderPanel(
      <AiReviewPanel
        {...baseProps}
        generationState={mockState}
        generation={{ kind: 'insufficient_balance', cost: 1, balance: 0 }}
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('aiReview.queued.title');
    expect(screen.queryByText('aiReview.generateButton')).not.toBeInTheDocument();
    expect(screen.queryByText('aiReview.upsell.title')).not.toBeInTheDocument();
  });

  // The review is public once published; only spending on a new one is gated.
  it('shows a cached review to an unentitled viewer, with no upsell over it', () => {
    render(
      <AiReviewPanel
        {...baseProps}
        generationState={mockState}
        review={REVIEW}
        generation={{ kind: 'insufficient_balance', cost: 1, balance: 0 }}
      />
    );

    expect(screen.getByText('A hard-fought game with one decisive slip.')).toBeInTheDocument();
    expect(screen.queryByText('aiReview.upsell.title')).not.toBeInTheDocument();
  });

  it('offers nothing at all to a viewer with no generation offer', () => {
    renderPanel(<AiReviewPanel {...baseProps} generationState={mockState} generation={null} />);

    expect(screen.getByText('aiReview.notGenerated')).toBeInTheDocument();
    expect(screen.queryByText('aiReview.generateButton')).not.toBeInTheDocument();
    expect(screen.queryByText('aiReview.upsell.title')).not.toBeInTheDocument();
  });

  it('confirms before generating, and writes the review in the page language', () => {
    renderPanel(<AiReviewPanel {...baseProps} generationState={mockState} />);

    fireEvent.click(screen.getByText('aiReview.generateButton'));
    // The click opens the confirmation — nothing has started yet.
    expect(mockStart).not.toHaveBeenCalled();
    expect(screen.getByText('aiReview.confirm.message')).toBeInTheDocument();

    fireEvent.click(screen.getByText('aiReview.confirm.submit'));
    expect(mockStart).toHaveBeenCalledWith('en');
  });

  it('lets the author pick another language for the review', () => {
    renderPanel(<AiReviewPanel {...baseProps} generationState={mockState} />);

    fireEvent.click(screen.getByText('aiReview.generateButton'));
    fireEvent.change(screen.getByLabelText('aiReview.confirm.languageLabel'), {
      target: { value: 'ja' },
    });
    fireEvent.click(screen.getByText('aiReview.confirm.submit'));

    expect(mockStart).toHaveBeenCalledWith('ja');
  });

  it('starts nothing when the confirmation is dismissed', () => {
    renderPanel(<AiReviewPanel {...baseProps} generationState={mockState} />);

    fireEvent.click(screen.getByText('aiReview.generateButton'));
    fireEvent.click(screen.getByText('aiReview.confirm.cancel'));

    expect(mockStart).not.toHaveBeenCalled();
    expect(screen.queryByText('aiReview.confirm.message')).not.toBeInTheDocument();
  });

  it('shows analysis progress with a cancel control', () => {
    mockState = { phase: 'analyzing', done: 3, total: 6 };
    renderPanel(<AiReviewPanel {...baseProps} generationState={mockState} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    fireEvent.click(screen.getByText('aiReview.cancel'));
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  it('shows the submitting state between the sweep and the acceptance', () => {
    mockState = { phase: 'submitting' };
    renderPanel(<AiReviewPanel {...baseProps} generationState={mockState} />);

    expect(screen.getByText('aiReview.submitting')).toBeInTheDocument();
  });

  it('surfaces errors with a retry button', () => {
    mockState = { phase: 'error', error: 'rate_limited' };
    renderPanel(<AiReviewPanel {...baseProps} generationState={mockState} />);

    expect(screen.getByRole('alert')).toHaveTextContent('aiReview.errors.rate_limited');
    fireEvent.click(screen.getByText('aiReview.retry'));
    fireEvent.click(screen.getByText('aiReview.confirm.submit'));
    expect(mockStart).toHaveBeenCalledTimes(1);
  });
});

describe('AiReviewPanel — key moment grade filter', () => {
  /** Three grades across four moments, so every filter branch has something. */
  const MULTI_GRADE: AiReview = {
    ...REVIEW,
    content: {
      ...REVIEW.content,
      momentComments: [2, 4, 6, 8].map((ply) => ({
        ply,
        explanation: `explanation-${ply}`,
        lesson: `lesson-${ply}`,
        principle: 'other' as const,
      })),
    },
    moments: (['inaccuracy', 'mistake', 'blunder', 'inaccuracy'] as const).map(
      (judgment, index) => ({
        ...REVIEW.moments[0],
        ply: (index + 1) * 2,
        san: `San${index}`,
        moveNumber: index + 1,
        judgment,
      })
    ),
  };

  const grade = (name: string) => screen.getByRole('button', { name: new RegExp(name) });

  beforeEach(() => {
    mockState = { phase: 'idle' };
  });

  it('offers one toggle per grade present, with its count, all on by default', () => {
    renderPanel(<AiReviewPanel {...baseProps} generationState={mockState} review={MULTI_GRADE} />);

    const group = screen.getByRole('group');
    expect(
      Array.from(group.querySelectorAll('button')).map((b) => b.textContent?.trim())
      // glyph + (screen-reader-only) grade name + count.
    ).toEqual([
      '?!aiReview.judgments.inaccuracy2',
      '?aiReview.judgments.mistake1',
      '??aiReview.judgments.blunder1',
    ]);
    // No `good` / `best` bucket — the review never selects those as moments.
    expect(screen.getAllByText(/^explanation-/)).toHaveLength(4);
  });

  it('hides the moments of a grade that is toggled off, and brings them back', () => {
    renderPanel(<AiReviewPanel {...baseProps} generationState={mockState} review={MULTI_GRADE} />);

    fireEvent.click(grade('aiReview.judgments.inaccuracy'));
    expect(grade('aiReview.judgments.inaccuracy')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByText(/^explanation-/).map((el) => el.textContent)).toEqual([
      'explanation-4',
      'explanation-6',
    ]);

    fireEvent.click(grade('aiReview.judgments.inaccuracy'));
    expect(screen.getAllByText(/^explanation-/)).toHaveLength(4);
  });

  it('explains an empty list rather than showing a bare heading', () => {
    renderPanel(<AiReviewPanel {...baseProps} generationState={mockState} review={MULTI_GRADE} />);

    for (const judgment of ['inaccuracy', 'mistake', 'blunder']) {
      fireEvent.click(grade(`aiReview.judgments.${judgment}`));
    }
    expect(screen.queryByText(/^explanation-/)).toBeNull();
    expect(screen.getByText('aiReview.noMomentsForGrades')).toBeInTheDocument();
  });

  it('omits the filter when every moment shares one grade', () => {
    renderPanel(<AiReviewPanel {...baseProps} generationState={mockState} review={REVIEW} />);
    expect(screen.queryByRole('group')).toBeNull();
  });
});
