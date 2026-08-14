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
  viewerCanGenerate: true,
  gameIsEligible: true,
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
    expect(screen.getByText('aiReview.judgments.mistake')).toBeInTheDocument();
    expect(screen.getByText('+0.3 → -1.7')).toBeInTheDocument();
    expect(screen.getByText('Qd2')).toBeInTheDocument();
    expect(screen.getByText('This dropped the knight.')).toBeInTheDocument();
    // No generate CTA once a review exists.
    expect(screen.queryByText('aiReview.generateButton')).not.toBeInTheDocument();
  });

  it('jumps the quick-peek preview when a moment header is clicked', () => {
    const onJumpToPly = vi.fn();
    render(<AiReviewPanel {...baseProps} initialReview={REVIEW} onJumpToPly={onJumpToPly} />);

    fireEvent.click(screen.getByText('3. Nd5'));
    expect(onJumpToPly).toHaveBeenCalledWith(4);
  });

  it('offers generation to signed-in viewers and starts on click', () => {
    render(<AiReviewPanel {...baseProps} />);

    fireEvent.click(screen.getByText('aiReview.generateButton'));
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('shows a sign-in prompt instead of the CTA for anonymous viewers', () => {
    render(<AiReviewPanel {...baseProps} viewerCanGenerate={false} />);

    expect(screen.getByText('aiReview.signInPrompt')).toBeInTheDocument();
    expect(screen.queryByText('aiReview.generateButton')).not.toBeInTheDocument();
  });

  it('refuses ineligible games', () => {
    render(<AiReviewPanel {...baseProps} gameIsEligible={false} />);

    expect(screen.getByText('aiReview.notEligible')).toBeInTheDocument();
    expect(screen.queryByText('aiReview.generateButton')).not.toBeInTheDocument();
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
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('renders the freshly generated review from the done phase', () => {
    mockState = { phase: 'done', review: REVIEW };
    render(<AiReviewPanel {...baseProps} />);

    expect(screen.getByText('A hard-fought game with one decisive slip.')).toBeInTheDocument();
  });
});
