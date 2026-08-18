import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AttachmentActions } from './BasePostForm';
import { ReplyForm } from './ReplyForm';

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => {
    // Render `{username}` interpolation literally so the test can assert
    // the param flows through. The real translator would resolve a
    // template like "Replying to {username}" here.
    const t = (key: string, params?: Record<string, unknown>) => {
      if (params) {
        const paramStr = Object.entries(params)
          .map(([k, v]) => `${k}=${String(v)}`)
          .join(',');
        return `${key}(${paramStr})`;
      }
      return key;
    };
    return Object.assign(t, { has: () => true });
  },
}));

// Mock BasePostForm so the ReplyForm test exercises only the wrapper
// logic (action binding + replying-to UI) without dragging in
// AttachmentModal / useActionState / Textarea machinery — those have
// their own coverage in BasePostForm consumers.
const mockBasePostForm = vi.fn();
vi.mock('./BasePostForm', () => ({
  BasePostForm: (props: Record<string, unknown>) => {
    mockBasePostForm(props);
    const beforeContent =
      typeof props.beforeContent === 'function'
        ? (props.beforeContent as (markDirty: () => void) => React.ReactNode)(() => undefined)
        : null;
    return (
      <div data-testid="base-post-form" data-translation-namespace={props.translationNamespace}>
        {beforeContent}
      </div>
    );
  },
}));

const mockPgnAction = vi.fn();
const mockFenAction = vi.fn();

const baseProps = {
  locale: 'en',
  topicKey: 'sicilian-defense',
  postId: 'post-1',
  attachmentActions: { pgn: mockPgnAction, fen: mockFenAction },
  i18nNamespace: 'topics.openings.replies',
};

describe('ReplyForm', () => {
  afterEach(() => {
    mockBasePostForm.mockClear();
    mockPgnAction.mockClear();
    mockFenAction.mockClear();
  });

  it('should delegate to BasePostForm with reply-tuned props', () => {
    render(<ReplyForm {...baseProps} />);

    expect(mockBasePostForm).toHaveBeenCalledTimes(1);
    const props = mockBasePostForm.mock.calls[0][0];
    expect(props.translationNamespace).toBe('topics.openings.replies');
    expect(props.textareaRows).toBe(4);
    expect(props.emitReplyPermissionField).toBe(false);
    expect(props.attachmentActions).toBeDefined();
    expect(typeof props.attachmentActions.pgn).toBe('function');
    expect(typeof props.attachmentActions.fen).toBe('function');
  });

  it('should bind (locale, topicKey, postId) into both attachment actions', () => {
    render(<ReplyForm {...baseProps} />);

    const props = mockBasePostForm.mock.calls[0][0] as { attachmentActions: AttachmentActions };
    const fd = new FormData();
    void props.attachmentActions.pgn({}, fd);
    void props.attachmentActions.fen({}, fd);

    // The bound actions should call through with the curried args.
    expect(mockPgnAction).toHaveBeenCalledWith('en', 'sicilian-defense', 'post-1', {}, fd);
    expect(mockFenAction).toHaveBeenCalledWith('en', 'sicilian-defense', 'post-1', {}, fd);
  });

  it('should render the replying-to header when replyToId + replyToUsername are provided', () => {
    render(<ReplyForm {...baseProps} replyToId="reply-99" replyToUsername="alice" />);

    // The translation mock formats the key + params as `key(k=v,...)` so
    // we can assert both the i18n key flows through and the username
    // param is forwarded into it.
    expect(screen.getByText('replyingTo(username=alice)')).toBeDefined();
    // The replyToId hidden input is part of the beforeContent payload.
    const hidden = document.querySelector('input[name="replyToId"]') as HTMLInputElement | null;
    expect(hidden).not.toBeNull();
    expect(hidden?.value).toBe('reply-99');
  });

  it('should not render the replying-to header for top-level replies', () => {
    render(<ReplyForm {...baseProps} />);

    expect(screen.queryByText(/replyingTo/)).toBeNull();
    const hidden = document.querySelector('input[name="replyToId"]');
    expect(hidden).toBeNull();
  });

  it('should call onCancelReply when the cancel "x" is clicked', () => {
    const onCancelReply = vi.fn();
    render(
      <ReplyForm
        {...baseProps}
        replyToId="reply-99"
        replyToUsername="alice"
        onCancelReply={onCancelReply}
      />
    );

    const cancelBtn = screen.getByLabelText('cancelReply');
    fireEvent.click(cancelBtn);
    expect(onCancelReply).toHaveBeenCalledTimes(1);
  });

  it('should forward enableSpoilerToggle through to BasePostForm', () => {
    render(<ReplyForm {...baseProps} enableSpoilerToggle />);

    const props = mockBasePostForm.mock.calls[0][0];
    expect(props.enableSpoilerToggle).toBe(true);
  });
});
