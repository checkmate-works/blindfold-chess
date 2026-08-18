import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NewOpeningPostForm } from './NewOpeningPostForm';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/en/topics/openings/italian-game',
}));

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: (namespace: string) => {
    const translations: Record<string, Record<string, string>> = {
      'topics.openings.newPostForm': {
        preferenceLabel: 'Preference',
        proficiencyLabel: 'Proficiency',
        contentLabel: 'Content',
        contentPlaceholder: 'Write your thoughts...',
        submit: 'Submit',
        submitting: 'Submitting...',
        'preferenceLabels.1': 'Hate',
        'preferenceLabels.2': 'Dislike',
        'preferenceLabels.3': 'Neutral',
        'preferenceLabels.4': 'Like',
        'preferenceLabels.5': 'Love',
        'proficiencyLabels.1': 'Beginner',
        'proficiencyLabels.2': 'Novice',
        'proficiencyLabels.3': 'Intermediate',
        'proficiencyLabels.4': 'Advanced',
        'proficiencyLabels.5': 'Expert',
        contentOrRatingRequired: 'Content or rating is required',
        contentTooLong: 'Content too long',
        invalidOpening: 'Invalid opening',
        error: 'An error occurred',
        signInRequired: 'Sign in required',
        rateLimited: 'Rate limited',
      },
      unsavedChanges: {
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Are you sure you want to leave?',
        confirm: 'Leave',
        cancel: 'Stay',
      },
    };
    const t = (key: string) => translations[namespace]?.[key] ?? key;
    t.has = (key: string) => key in (translations[namespace] ?? {});
    return t;
  },
}));

vi.mock('next-navigation-guard', () => ({
  useNavigationGuard: () => ({
    active: false,
    accept: vi.fn(),
    reject: vi.fn(),
  }),
}));

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useActionState: (_action: unknown, initialState: unknown): [unknown, () => void, boolean] => [
      initialState,
      vi.fn(),
      false,
    ],
  };
});

describe('NewOpeningPostForm', () => {
  it('should render preference rating input', () => {
    render(<NewOpeningPostForm locale="en" slug="french-defense" />);
    expect(screen.getByText('Preference')).toBeInTheDocument();
  });

  it('should render proficiency rating input', () => {
    render(<NewOpeningPostForm locale="en" slug="french-defense" />);
    expect(screen.getByText('Proficiency')).toBeInTheDocument();
  });

  it('should render content textarea', () => {
    render(<NewOpeningPostForm locale="en" slug="french-defense" />);
    expect(screen.getByLabelText('Content')).toBeInTheDocument();
  });

  it('should render submit button', () => {
    render(<NewOpeningPostForm locale="en" slug="french-defense" />);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  describe('submit button state', () => {
    it('should be disabled when no input is provided', () => {
      render(<NewOpeningPostForm locale="en" slug="french-defense" />);
      const submitBtn = screen.getByRole('button', { name: 'Submit' });
      expect(submitBtn).toBeDisabled();
    });

    it('should become enabled when content is typed', () => {
      render(<NewOpeningPostForm locale="en" slug="french-defense" />);
      const textarea = screen.getByLabelText('Content');
      fireEvent.change(textarea, { target: { value: 'Some content' } });

      const submitBtn = screen.getByRole('button', { name: 'Submit' });
      expect(submitBtn).toBeEnabled();
    });

    it('should remain disabled when only whitespace is typed in content', () => {
      render(<NewOpeningPostForm locale="en" slug="french-defense" />);
      const textarea = screen.getByLabelText('Content');
      fireEvent.change(textarea, { target: { value: '   ' } });

      const submitBtn = screen.getByRole('button', { name: 'Submit' });
      expect(submitBtn).toBeDisabled();
    });

    it('should become enabled when preference rating is selected', () => {
      render(<NewOpeningPostForm locale="en" slug="french-defense" />);
      const preferenceStars = screen.getByLabelText('4 - Like');
      fireEvent.click(preferenceStars);

      const submitBtn = screen.getByRole('button', { name: 'Submit' });
      expect(submitBtn).toBeEnabled();
    });

    it('should become enabled when proficiency rating is selected', () => {
      render(<NewOpeningPostForm locale="en" slug="french-defense" />);
      const proficiencyStar = screen.getByLabelText('3 - Intermediate');
      fireEvent.click(proficiencyStar);

      const submitBtn = screen.getByRole('button', { name: 'Submit' });
      expect(submitBtn).toBeEnabled();
    });

    it('should become disabled again when preference rating is toggled off and nothing else is set', () => {
      render(<NewOpeningPostForm locale="en" slug="french-defense" />);
      const star = screen.getByLabelText('4 - Like');
      fireEvent.click(star); // Select
      fireEvent.click(star); // Deselect

      const submitBtn = screen.getByRole('button', { name: 'Submit' });
      expect(submitBtn).toBeDisabled();
    });

    it('should remain enabled when content is set and preference is toggled off', () => {
      render(<NewOpeningPostForm locale="en" slug="french-defense" />);
      const textarea = screen.getByLabelText('Content');
      fireEvent.change(textarea, { target: { value: 'Some content' } });
      const star = screen.getByLabelText('4 - Like');
      fireEvent.click(star); // Select
      fireEvent.click(star); // Deselect

      const submitBtn = screen.getByRole('button', { name: 'Submit' });
      expect(submitBtn).toBeEnabled();
    });

    it('should remain enabled when both ratings are set but content is empty', () => {
      render(<NewOpeningPostForm locale="en" slug="french-defense" />);
      fireEvent.click(screen.getByLabelText('4 - Like'));
      fireEvent.click(screen.getByLabelText('3 - Intermediate'));

      const submitBtn = screen.getByRole('button', { name: 'Submit' });
      expect(submitBtn).toBeEnabled();
    });

    it('should become disabled when content is typed and then cleared', () => {
      render(<NewOpeningPostForm locale="en" slug="french-defense" />);
      const textarea = screen.getByLabelText('Content');
      fireEvent.change(textarea, { target: { value: 'Some content' } });
      fireEvent.change(textarea, { target: { value: '' } });

      const submitBtn = screen.getByRole('button', { name: 'Submit' });
      expect(submitBtn).toBeDisabled();
    });
  });
});
