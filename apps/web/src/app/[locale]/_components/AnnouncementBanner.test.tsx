import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnouncementBanner } from './AnnouncementBanner';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

describe('AnnouncementBanner', () => {
  const defaultProps = {
    id: 'ann-123',
    title: 'New feature released!',
    href: '/en/announcements/new-feature',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset document.cookie
    document.cookie = 'dismissed-announcement=; max-age=0';
  });

  it('should render the announcement title', () => {
    render(<AnnouncementBanner {...defaultProps} />);

    expect(screen.getByText('New feature released!')).toBeInTheDocument();
  });

  it('should render a link with the correct href', () => {
    render(<AnnouncementBanner {...defaultProps} />);

    const link = screen.getByText('New feature released!');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/en/announcements/new-feature');
  });

  it('should have role="status" on the container', () => {
    render(<AnnouncementBanner {...defaultProps} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render a close button with aria-label "Close"', () => {
    render(<AnnouncementBanner {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    expect(closeButton).toBeInTheDocument();
  });

  it('should set dismissed-announcement cookie when close button is clicked', () => {
    render(<AnnouncementBanner {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);

    expect(document.cookie).toContain('dismissed-announcement=ann-123');
  });

  it('should call router.refresh when close button is clicked', () => {
    render(<AnnouncementBanner {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('should set cookie with correct max-age of 30 days', () => {
    // Spy on document.cookie setter to capture the exact value
    const cookieSetter = vi.fn();
    const originalDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!;

    Object.defineProperty(document, 'cookie', {
      get: originalDescriptor.get,
      set: cookieSetter,
      configurable: true,
    });

    render(<AnnouncementBanner {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);

    const thirtyDaysInSeconds = 60 * 60 * 24 * 30;
    expect(cookieSetter).toHaveBeenCalledWith(
      expect.stringContaining(`max-age=${thirtyDaysInSeconds}`)
    );
    expect(cookieSetter).toHaveBeenCalledWith(expect.stringContaining('SameSite=Lax'));
    expect(cookieSetter).toHaveBeenCalledWith(expect.stringContaining('path=/'));

    // Restore original cookie descriptor
    Object.defineProperty(document, 'cookie', originalDescriptor);
  });

  it('should render with different props correctly', () => {
    render(
      <AnnouncementBanner
        id="ann-456"
        title="Important update"
        href="/ja/announcements/important-update"
      />
    );

    const link = screen.getByText('Important update');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/ja/announcements/important-update');
  });

  it('should set cookie with the correct announcement id', () => {
    const cookieSetter = vi.fn();
    const originalDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!;

    Object.defineProperty(document, 'cookie', {
      get: originalDescriptor.get,
      set: cookieSetter,
      configurable: true,
    });

    render(<AnnouncementBanner id="ann-789" title="Test" href="/test" />);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);

    expect(cookieSetter).toHaveBeenCalledWith(
      expect.stringContaining('dismissed-announcement=ann-789')
    );

    Object.defineProperty(document, 'cookie', originalDescriptor);
  });
});
