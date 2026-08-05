import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HoverPrefetchLink } from './HoverPrefetchLink';

// Surface the `prefetch` prop as a DOM attribute so the strategy Next would
// apply is assertable — that value is the whole point of this component.
vi.mock('next/link', () => ({
  default: ({
    href,
    prefetch,
    children,
    ...props
  }: {
    href: string;
    prefetch?: boolean | null;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} data-prefetch={String(prefetch)} {...props}>
      {children}
    </a>
  ),
}));

describe('HoverPrefetchLink', () => {
  it('opts out of prefetching until the pointer shows intent', () => {
    render(<HoverPrefetchLink href="/en/practice">Practice</HoverPrefetchLink>);

    expect(screen.getByRole('link')).toHaveAttribute('data-prefetch', 'false');
  });

  it('restores the default strategy on hover', () => {
    render(<HoverPrefetchLink href="/en/practice">Practice</HoverPrefetchLink>);
    const link = screen.getByRole('link');

    fireEvent.mouseEnter(link);

    expect(link).toHaveAttribute('data-prefetch', 'null');
  });

  it('restores the default strategy on touch', () => {
    render(<HoverPrefetchLink href="/en/practice">Practice</HoverPrefetchLink>);
    const link = screen.getByRole('link');

    fireEvent.touchStart(link);

    expect(link).toHaveAttribute('data-prefetch', 'null');
  });

  it('still calls the pointer handlers a caller supplied', () => {
    const onMouseEnter = vi.fn();
    const onTouchStart = vi.fn();
    render(
      <HoverPrefetchLink
        href="/en/practice"
        onMouseEnter={onMouseEnter}
        onTouchStart={onTouchStart}
      >
        Practice
      </HoverPrefetchLink>
    );
    const link = screen.getByRole('link');

    fireEvent.mouseEnter(link);
    fireEvent.touchStart(link);

    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onTouchStart).toHaveBeenCalledTimes(1);
  });
});
