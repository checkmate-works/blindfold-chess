import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiReview } from '@/lib/ai-review/types';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { AiReviewGenerationState } from '../_hooks/use-ai-review-generation';
import { AiReviewPanel } from './AiReviewPanel';

vi.mock('@/i18n/use-safe-translations');

vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/app/[locale]/_hooks/use-current-path-as-next', () => ({
  useCurrentPathAsNext: () => '/en/games/shared/x',
}));

let mockState: AiReviewGenerationState;
const mockStart = vi.fn();
const mockCancel = vi.fn();

vi.mock('../_hooks/use-ai-review-generation', () => ({
  useAiReviewGeneration: () => ({ state: mockState, start: mockStart, cancel: mockCancel }),
}));

const REVIEW: AiReview = {
  locale: 'en',
  content: {
    summary: 'A hard-fought game with one decisive slip.',
    momentComments: [
      { ply: 4, explanation: 'This dropped the knight.', lesson: 'Count the defenders first.' },
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
  gameId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  locale: 'en' as Locale,
  moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nd5'],
  startingFen: null,
  initialReview: null,
  onJumpToPly: vi.fn(),
};

describe('AiReviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = { phase: 'idle' };
  });

  it('renders the review when one is cached, with engine facts joined by ply', () => {
    render(<AiReviewPanel {...baseProps} initialReview={REVIEW} />);

    expect(screen.getByText('A hard-fought game with one decisive slip.')).toBeInTheDocument();
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
    const { unmount } = render(<AiReviewPanel {...baseProps} initialReview={REVIEW} />);
    expect(screen.queryByText('aiReview.languageNote')).not.toBeInTheDocument();
    unmount();

    render(<AiReviewPanel {...baseProps} initialReview={{ ...REVIEW, locale: 'ja' }} />);
    expect(screen.getByText('aiReview.languageNote')).toBeInTheDocument();
  });

  it('jumps the quick-peek preview when a moment header is clicked', () => {
    const onJumpToPly = vi.fn();
    render(<AiReviewPanel {...baseProps} initialReview={REVIEW} onJumpToPly={onJumpToPly} />);

    fireEvent.click(screen.getByText('3. Nd5'));
    expect(onJumpToPly).toHaveBeenCalledWith(4);
  });

  it('confirms before generating, and writes the review in the page language', () => {
    render(<AiReviewPanel {...baseProps} />);

    fireEvent.click(screen.getByText('aiReview.generateButton'));
    // The click opens the confirmation — nothing has started yet.
    expect(mockStart).not.toHaveBeenCalled();
    expect(screen.getByText('aiReview.confirm.message')).toBeInTheDocument();

    fireEvent.click(screen.getByText('aiReview.confirm.submit'));
    expect(mockStart).toHaveBeenCalledWith('en');
  });

  it('lets the author pick another language for the review', () => {
    render(<AiReviewPanel {...baseProps} />);

    fireEvent.click(screen.getByText('aiReview.generateButton'));
    fireEvent.change(screen.getByLabelText('aiReview.confirm.languageLabel'), {
      target: { value: 'ja' },
    });
    fireEvent.click(screen.getByText('aiReview.confirm.submit'));

    expect(mockStart).toHaveBeenCalledWith('ja');
  });

  it('starts nothing when the confirmation is dismissed', () => {
    render(<AiReviewPanel {...baseProps} />);

    fireEvent.click(screen.getByText('aiReview.generateButton'));
    fireEvent.click(screen.getByText('aiReview.confirm.cancel'));

    expect(mockStart).not.toHaveBeenCalled();
    expect(screen.queryByText('aiReview.confirm.message')).not.toBeInTheDocument();
  });

  it('shows analysis progress with a cancel control', () => {
    mockState = { phase: 'analyzing', done: 3, total: 6 };
    render(<AiReviewPanel {...baseProps} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    fireEvent.click(screen.getByText('aiReview.cancel'));
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  it('shows the LLM waiting state', () => {
    mockState = { phase: 'generating' };
    render(<AiReviewPanel {...baseProps} />);

    expect(screen.getByText('aiReview.generating')).toBeInTheDocument();
  });

  it('surfaces errors with a retry button', () => {
    mockState = { phase: 'error', error: 'rate_limited' };
    render(<AiReviewPanel {...baseProps} />);

    expect(screen.getByRole('alert')).toHaveTextContent('aiReview.errors.rate_limited');
    fireEvent.click(screen.getByText('aiReview.retry'));
    fireEvent.click(screen.getByText('aiReview.confirm.submit'));
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('renders the freshly generated review from the done phase', () => {
    mockState = { phase: 'done', review: REVIEW };
    render(<AiReviewPanel {...baseProps} />);

    expect(screen.getByText('A hard-fought game with one decisive slip.')).toBeInTheDocument();
  });
});
