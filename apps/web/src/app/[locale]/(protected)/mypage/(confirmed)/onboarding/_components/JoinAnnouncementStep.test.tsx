import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SocialAuthorProfile } from '@/lib/users/author-profile';

import { JoinAnnouncementStep } from './JoinAnnouncementStep';

// --- Mocks ---

const mockDecide = vi.fn();
vi.mock('../_actions/decideJoinAnnouncement', () => ({
  decideJoinAnnouncement: (...args: unknown[]) => mockDecide(...args),
}));

vi.mock('@/app/[locale]/(public)/(home)/_components/MemberJoinedCard', () => ({
  MemberJoinedCardPreview: ({ member }: { member: { username: string } }) => (
    <div data-testid="member-joined-preview">{member.username}</div>
  ),
}));

// The identity translator echoes keys, so a message with an argument comes
// back as the key alone and the `days` value has to be checked on the call.
const mockTranslate = vi.fn((key: string) => key);
vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => Object.assign(mockTranslate, { has: () => true }),
}));

// --- Helpers ---

const member: SocialAuthorProfile = {
  username: 'alice',
  displayName: 'Alice',
  avatarUrl: null,
  country: 'JP',
  flair: null,
};

type Answer = Parameters<typeof JoinAnnouncementStep>[0]['answer'];

function renderStep({ answer = null }: { answer?: Answer } = {}) {
  const onAnswered = vi.fn<(answer: NonNullable<Answer>) => void>();
  const onNext = vi.fn<() => void>();
  render(
    <JoinAnnouncementStep
      locale="en"
      member={member}
      answer={answer}
      onAnswered={onAnswered}
      onNext={onNext}
    />
  );
  return { onAnswered, onNext };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const postButton = () => screen.getByRole('button', { name: 'post' });
const declineButton = () => screen.getByRole('button', { name: 'decline' });

// --- Tests ---

describe('JoinAnnouncementStep', () => {
  beforeEach(() => {
    mockDecide.mockReset();
    mockTranslate.mockClear();
  });

  it('shows the card preview and promises the 30-day retention', () => {
    renderStep();

    expect(screen.getByTestId('member-joined-preview').textContent).toBe('alice');
    expect(screen.getByText('retentionNote')).toBeInTheDocument();
    expect(mockTranslate).toHaveBeenCalledWith('retentionNote', { days: 30 });
    expect(screen.getByText('deleteNote')).toBeInTheDocument();
  });

  it('asks with two buttons and no default while unanswered', () => {
    renderStep();

    expect(postButton()).toBeInTheDocument();
    expect(declineButton()).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'next' })).toBeNull();
    expect(screen.queryByText('postedMessage')).toBeNull();
    expect(screen.queryByText('declinedMessage')).toBeNull();
  });

  it('posts, then reports "posted" and advances', async () => {
    mockDecide.mockResolvedValue({ success: true, outcome: 'announced' });
    const { onAnswered, onNext } = renderStep();

    fireEvent.click(postButton());

    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(mockDecide).toHaveBeenCalledWith({ announce: true });
    expect(onAnswered).toHaveBeenCalledWith('posted');
    expect(onAnswered.mock.invocationCallOrder[0]).toBeLessThan(onNext.mock.invocationCallOrder[0]);
  });

  it('declines, then reports "declined" and advances', async () => {
    mockDecide.mockResolvedValue({ success: true, outcome: 'declined' });
    const { onAnswered, onNext } = renderStep();

    fireEvent.click(declineButton());

    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(mockDecide).toHaveBeenCalledWith({ announce: false });
    expect(onAnswered).toHaveBeenCalledWith('declined');
  });

  it('reports the recorded outcome, not the button, when another tab answered first', async () => {
    // This tab pressed "don't post", but the card is already live.
    mockDecide.mockResolvedValue({ success: true, outcome: 'announced' });
    const { onAnswered, onNext } = renderStep();

    fireEvent.click(declineButton());

    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(onAnswered).toHaveBeenCalledWith('posted');
  });

  it('keeps asking and shows the error when the action fails', async () => {
    mockDecide.mockResolvedValue({ error: 'unexpected_error' });
    const { onAnswered, onNext } = renderStep();

    fireEvent.click(postButton());

    expect(await screen.findByText('error')).toBeInTheDocument();
    expect(postButton()).not.toBeDisabled();
    expect(declineButton()).not.toBeDisabled();
    expect(onAnswered).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('shows the outcome and a single next button once answered', () => {
    const { onNext } = renderStep({ answer: 'posted' });

    expect(screen.getByText('postedMessage')).toBeInTheDocument();
    expect(screen.queryByText('declinedMessage')).toBeNull();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent('next');

    fireEvent.click(buttons[0]);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('shows the declined outcome once declined', () => {
    renderStep({ answer: 'declined' });

    expect(screen.getByText('declinedMessage')).toBeInTheDocument();
    expect(screen.queryByText('postedMessage')).toBeNull();
  });

  it('disables both buttons while the answer is in flight', async () => {
    const pending = deferred<{ success: true; outcome: 'announced' }>();
    mockDecide.mockReturnValue(pending.promise);
    const { onNext } = renderStep();

    fireEvent.click(postButton());

    // The pressed button swaps its label for a spinner, so count by role.
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
      for (const button of buttons) expect(button).toBeDisabled();
    });
    expect(onNext).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve({ success: true, outcome: 'announced' });
      await pending.promise;
    });
    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
  });
});
