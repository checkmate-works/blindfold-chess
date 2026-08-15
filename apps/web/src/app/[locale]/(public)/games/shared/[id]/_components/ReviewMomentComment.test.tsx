import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ReviewMoment } from '@/lib/ai-review/types';

import type { Locale } from '@/app/[locale]/_lib/types';

import { ReviewMomentComment } from './ReviewMomentComment';

vi.mock('@/i18n/use-safe-translations');

const MOMENT: ReviewMoment = {
  ply: 7,
  san: 'Nd5',
  moveNumber: 4,
  color: 'white',
  evalBefore: 30,
  evalAfter: -170,
  cpLoss: 200,
  bestMoveSan: 'Qd2',
  judgment: 'mistake',
};

const props = {
  moment: MOMENT,
  createdAt: new Date('2026-08-14T00:00:00.000Z'),
  locale: 'en' as Locale,
};

describe('ReviewMomentComment', () => {
  it('reads as a comment from the AI: name, timestamp, verdict, prose', () => {
    render(
      <ReviewMomentComment
        {...props}
        comment={{ ply: 7, explanation: 'Hung the knight.', lesson: 'Count first.' }}
      />
    );

    expect(screen.getByText('aiReview.tab')).toBeInTheDocument();
    expect(screen.getByRole('time')).toHaveAttribute('datetime', '2026-08-14T00:00:00.000Z');
    expect(screen.getByRole('img', { name: 'aiReview.judgments.mistake' })).toHaveTextContent('?');
    expect(screen.getByText('+0.3 → -1.7')).toBeInTheDocument();
    // The recommendation is marked with the bulb rather than captioned, so
    // the words survive only as the icon's accessible name.
    expect(screen.getByTitle('aiReview.bestMoveLabel')).toBeInTheDocument();
    expect(screen.getByText('Qd2')).toBeInTheDocument();
    expect(screen.getByText('Hung the knight.')).toBeInTheDocument();
    expect(screen.getByText('Count first.')).toBeInTheDocument();
  });

  it('collapses to its header and back, like any other thread root', () => {
    render(
      <ReviewMomentComment
        {...props}
        comment={{ ply: 7, explanation: 'Hung the knight.', lesson: 'Count first.' }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'aiReview.collapseAriaLabel' }));
    // Who spoke and when stays; what they said folds away.
    expect(screen.getByText('aiReview.tab')).toBeInTheDocument();
    expect(screen.queryByText('Hung the knight.')).toBeNull();
    expect(screen.queryByText('+0.3 → -1.7')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'aiReview.expandAriaLabel' }));
    expect(screen.getByText('Hung the knight.')).toBeInTheDocument();
  });

  it('offers none of a real comment’s actions beyond that', () => {
    render(
      <ReviewMomentComment
        {...props}
        comment={{ ply: 7, explanation: 'Hung the knight.', lesson: 'Count first.' }}
      />
    );
    // Nothing else here acts on a `game_comments` row — no like, no reply.
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'aiReview.collapseAriaLabel',
    ]);
  });

  it('still carries the engine facts when the review wrote no prose for a moment', () => {
    render(<ReviewMomentComment {...props} />);

    expect(screen.getByText('+0.3 → -1.7')).toBeInTheDocument();
    expect(screen.queryByText('Hung the knight.')).toBeNull();
  });
});
