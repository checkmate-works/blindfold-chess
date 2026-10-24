import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SocialAuthorProfile } from '@/lib/users/author-profile';

import { OnboardingWizard } from './OnboardingWizard';

// --- Mocks ---

vi.mock('@/i18n/use-safe-translations');

const mockSaveProfile = vi.fn();
vi.mock('../_actions/saveOnboardingProfile', () => ({
  saveOnboardingProfile: (...args: unknown[]) => mockSaveProfile(...args),
}));

// Each step stub exposes the callbacks the wizard hands it as buttons, and
// prints the props the tests care about, so the wizard's own wiring is what
// gets exercised rather than the steps' internals.
vi.mock('./ProfileStep', () => ({
  ProfileStep: ({
    currentAvatarUrl,
    country,
    onAvatarChange,
    onCountryChange,
    onSkip,
  }: {
    currentAvatarUrl: string | null;
    country: string;
    onAvatarChange: (url: string | null) => void;
    onCountryChange: (code: string) => void;
    onSkip: () => void;
  }) => (
    <div data-testid="step-profile">
      <span data-testid="profile-avatar">{currentAvatarUrl ?? '(none)'}</span>
      <span data-testid="profile-country">{country || '(none)'}</span>
      <button type="button" onClick={() => onAvatarChange('https://cdn/new.png')}>
        upload-avatar
      </button>
      <button type="button" onClick={() => onCountryChange('FR')}>
        pick-country
      </button>
      <button type="button" onClick={onSkip}>
        skip-profile
      </button>
    </div>
  ),
}));

vi.mock('./JoinAnnouncementStep', () => ({
  JoinAnnouncementStep: ({
    member,
    answer,
    onAnswered,
    onNext,
  }: {
    member: SocialAuthorProfile;
    answer: 'posted' | 'declined' | null;
    onAnswered: (answer: 'posted' | 'declined') => void;
    onNext: () => void;
  }) => (
    <div data-testid="step-announcement">
      <span data-testid="announcement-avatar">{member.avatarUrl ?? '(none)'}</span>
      <span data-testid="announcement-country">{member.country ?? '(none)'}</span>
      <span data-testid="announcement-answer">{answer ?? '(unanswered)'}</span>
      <button
        type="button"
        onClick={() => {
          onAnswered('posted');
          onNext();
        }}
      >
        answer-post
      </button>
    </div>
  ),
}));

vi.mock('./HelpTourStep', () => ({
  HelpTourStep: () => <div data-testid="step-help-tour" />,
}));

vi.mock('./StepIndicator', () => ({
  StepIndicator: ({ count, currentStepIndex }: { count: number; currentStepIndex: number }) => (
    <div data-testid="step-indicator">
      {currentStepIndex + 1}/{count}
    </div>
  ),
}));

// --- Helpers ---

const member: SocialAuthorProfile = {
  username: 'alice',
  displayName: 'Alice',
  avatarUrl: null,
  country: 'JP',
  flair: null,
};

function renderWizard(canAnnounce: boolean) {
  render(
    <OnboardingWizard
      locale="en"
      member={member}
      currentBio={null}
      canAnnounce={canAnnounce}
      beltSlide={<div data-testid="step-belt" />}
    />
  );
}

const indicator = () => screen.getByTestId('step-indicator').textContent;
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

// --- Tests ---

describe('OnboardingWizard', () => {
  beforeEach(() => {
    mockSaveProfile.mockReset();
    mockSaveProfile.mockResolvedValue({ success: true });
  });

  it('runs profile → announcement → help tour → belt when the question is open', async () => {
    renderWizard(true);

    expect(indicator()).toBe('1/4');
    expect(screen.getByTestId('step-profile')).toBeInTheDocument();

    click('skip-profile');
    expect(indicator()).toBe('2/4');
    expect(screen.getByTestId('step-announcement')).toBeInTheDocument();
    // The announcement step answers with its own buttons: no shared next.
    expect(screen.queryByRole('button', { name: 'nav.next' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'nav.saveAndNext' })).toBeNull();

    click('answer-post');
    expect(indicator()).toBe('3/4');
    expect(screen.getByTestId('step-help-tour')).toBeInTheDocument();

    click('nav.next');
    expect(indicator()).toBe('4/4');
    expect(screen.getByTestId('step-belt')).toBeInTheDocument();
    // The belt slide carries its own exit links.
    expect(screen.queryByRole('button', { name: 'nav.next' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'nav.back' })).toBeNull();
  });

  it('leaves the announcement step out when the question is closed', () => {
    renderWizard(false);

    expect(indicator()).toBe('1/3');

    click('skip-profile');
    expect(indicator()).toBe('2/3');
    expect(screen.getByTestId('step-help-tour')).toBeInTheDocument();
    expect(screen.queryByTestId('step-announcement')).toBeNull();
  });

  it('keeps the step list fixed after the announcement is answered', () => {
    renderWizard(true);

    click('skip-profile');
    click('answer-post');
    expect(indicator()).toBe('3/4');

    // Going back shows the answer, not the question — and still four steps.
    click('nav.back');
    expect(indicator()).toBe('2/4');
    expect(screen.getByTestId('announcement-answer').textContent).toBe('posted');
  });

  it('returns to the profile step from the announcement step', () => {
    renderWizard(true);

    click('skip-profile');
    expect(screen.getByTestId('step-announcement')).toBeInTheDocument();

    click('nav.back');
    expect(indicator()).toBe('1/4');
    expect(screen.getByTestId('step-profile')).toBeInTheDocument();
  });

  it('previews the avatar the member just uploaded', () => {
    renderWizard(true);

    click('upload-avatar');
    expect(screen.getByTestId('profile-avatar').textContent).toBe('https://cdn/new.png');

    click('skip-profile');
    expect(screen.getByTestId('announcement-avatar').textContent).toBe('https://cdn/new.png');
  });

  it('previews the stored country, so skipping the profile step discards the select', () => {
    renderWizard(true);

    click('pick-country');
    expect(screen.getByTestId('profile-country').textContent).toBe('FR');

    click('skip-profile');
    expect(mockSaveProfile).not.toHaveBeenCalled();
    expect(screen.getByTestId('announcement-country').textContent).toBe('JP');
  });

  it('previews the new country once the profile step has saved it', async () => {
    renderWizard(true);

    click('pick-country');
    click('nav.saveAndNext');

    await waitFor(() => expect(screen.getByTestId('step-announcement')).toBeInTheDocument());
    expect(mockSaveProfile).toHaveBeenCalledWith({ country: 'FR', bio: '' });
    expect(screen.getByTestId('announcement-country').textContent).toBe('FR');
  });

  it('stays on the profile step and keeps the old country when saving fails', async () => {
    mockSaveProfile.mockResolvedValue({ error: 'unexpected_error' });
    renderWizard(true);

    click('pick-country');
    click('nav.saveAndNext');

    expect(await screen.findByText('saveError')).toBeInTheDocument();
    expect(screen.getByTestId('step-profile')).toBeInTheDocument();

    click('skip-profile');
    expect(screen.getByTestId('announcement-country').textContent).toBe('JP');
  });
});
