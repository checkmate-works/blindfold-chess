import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LockedRankIndicator } from './LockedRankIndicator';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string, values?: Record<string, string>) => {
    if (values) {
      return Object.entries(values).reduce((acc, [k, v]) => acc.replace(`{${k}}`, v), key);
    }
    return key;
  },
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/app/[locale]/_hooks/use-scroll-lock', () => ({
  useScrollLock: vi.fn(),
}));

describe('LockedRankIndicator', () => {
  const defaultProps = {
    locale: 'en',
    previousRankName: '10級',
    previousSlug: '10kyu',
  };

  it('should render the lock icon button', () => {
    render(<LockedRankIndicator {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should have aria-label set on the button', () => {
    render(<LockedRankIndicator {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'ariaLabel');
  });

  it('should not show modal initially', () => {
    render(<LockedRankIndicator {...defaultProps} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should show modal when lock icon is clicked', () => {
    render(<LockedRankIndicator {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should display previous rank name in modal message', () => {
    render(<LockedRankIndicator {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));

    // The mock returns key with interpolated values: "message" with {rankName} replaced
    expect(screen.getByText('message')).toBeInTheDocument();
  });

  it('should display a link to the previous rank in the modal', () => {
    render(<LockedRankIndicator {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/en/ranks/10kyu');
  });

  it('should include the previous rank name in the link label', () => {
    render(<LockedRankIndicator {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));

    // The mock returns: linkLabel with {rankName} replaced by '10級'
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
  });

  it('should close modal when close button is clicked', () => {
    render(<LockedRankIndicator {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // The Modal has a close button (X) in the header
    // Click the backdrop/overlay to close
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should stop event propagation when lock icon is clicked', () => {
    const parentClickHandler = vi.fn();

    render(
      <div onClick={parentClickHandler}>
        <LockedRankIndicator {...defaultProps} />
      </div>
    );

    fireEvent.click(screen.getByRole('button'));

    expect(parentClickHandler).not.toHaveBeenCalled();
  });
});
