import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReplyForm } from './ReplyForm';

afterEach(() => {
  cleanup();
});

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

vi.mock('@/_hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: () => ({
    isBlocking: false,
    confirm: vi.fn(),
    cancel: vi.fn(),
  }),
}));

vi.mock('@/app/_components', () => ({
  Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <button {...props}>{children}</button>
  ),
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
  UnsavedChangesDialog: () => null,
  FormErrorBanner: ({ message }: { message?: string | null }) =>
    message ? <div data-testid="form-error-banner">{message}</div> : null,
}));

const mockCreateReplyAction = vi.fn();

describe('ReplyForm', () => {
  it('should render the form with content textarea', () => {
    render(
      <ReplyForm
        locale="en"
        topicKey="sicilian-defense"
        postId="post-1"
        createReplyAction={mockCreateReplyAction}
        i18nNamespace="topics.openings.reply"
      />
    );

    expect(screen.getByLabelText('contentLabel')).toBeDefined();
  });

  it('should render the submit button', () => {
    render(
      <ReplyForm
        locale="en"
        topicKey="sicilian-defense"
        postId="post-1"
        createReplyAction={mockCreateReplyAction}
        i18nNamespace="topics.openings.reply"
      />
    );

    expect(screen.getByText('submit')).toBeDefined();
  });

  it('should have required attribute on textarea', () => {
    render(
      <ReplyForm
        locale="en"
        topicKey="e4"
        postId="post-1"
        createReplyAction={mockCreateReplyAction}
        i18nNamespace="topics.squares.reply"
      />
    );

    const textarea = screen.getByLabelText('contentLabel');
    expect(textarea.getAttribute('required')).not.toBeNull();
  });

  it('should set maxLength=2000 on textarea (matches MAX_CONTENT_LENGTH)', () => {
    render(
      <ReplyForm
        locale="en"
        topicKey="e4"
        postId="post-1"
        createReplyAction={mockCreateReplyAction}
        i18nNamespace="topics.squares.reply"
      />
    );

    const textarea = screen.getByLabelText('contentLabel');
    expect(textarea.getAttribute('maxlength')).toBe('2000');
  });
});
