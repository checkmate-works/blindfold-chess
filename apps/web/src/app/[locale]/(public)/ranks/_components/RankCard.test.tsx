import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RankCard } from './RankCard';

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

const baseProps = {
  slug: '9kyu',
  locale: 'en',
  beltColor: '#fbbf24',
  rankName: '9級',
  requirementLabels: ['Score 80+ in Coordinate Quiz'],
  requirementsHeading: 'Requirements',
  comingSoonLabel: 'Coming Soon',
};

describe('RankCard', () => {
  describe('when state is "locked"', () => {
    const lockedProps = {
      ...baseProps,
      state: 'locked' as const,
      previousRankName: '10級',
      previousSlug: '10kyu',
    };

    it('should render as a link', () => {
      render(<RankCard {...lockedProps} />);

      const link = screen.getByRole('link', { name: /9級/ });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/en/ranks/9kyu');
    });

    it('should not display a smoke overlay', () => {
      const { container } = render(<RankCard {...lockedProps} />);

      // Check that no overlay with backdrop-blur or bg-foreground/30 exists
      const overlays = container.querySelectorAll('[class*="backdrop-blur"]');
      expect(overlays.length).toBe(0);
    });

    it('should render the lock icon (via LockedRankIndicator)', () => {
      render(<RankCard {...lockedProps} />);

      // LockedRankIndicator renders a button with aria-label
      const lockButton = screen.getByRole('button', { name: 'ariaLabel' });
      expect(lockButton).toBeInTheDocument();
    });

    it('should render a chevron icon', () => {
      const { container } = render(<RankCard {...lockedProps} />);

      // HiChevronRight has aria-hidden="true"
      const chevrons = container.querySelectorAll('[aria-hidden="true"]');
      expect(chevrons.length).toBeGreaterThan(0);
    });

    it('should not render the lock icon when previousRankName is missing', () => {
      render(<RankCard {...baseProps} state="locked" />);

      expect(screen.queryByRole('button', { name: 'ariaLabel' })).not.toBeInTheDocument();
    });
  });

  describe('when state is "achieved"', () => {
    const achievedProps = {
      ...baseProps,
      state: 'achieved' as const,
    };

    it('should render as a link', () => {
      render(<RankCard {...achievedProps} />);

      const link = screen.getByRole('link', { name: /9級/ });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/en/ranks/9kyu');
    });

    it('should render the check circle icon', () => {
      const { container } = render(<RankCard {...achievedProps} />);

      // HiCheckCircle renders with text-emerald-500 class
      const checkIcon = container.querySelector('.text-emerald-500');
      expect(checkIcon).toBeInTheDocument();
    });

    it('should render a chevron icon', () => {
      const { container } = render(<RankCard {...achievedProps} />);

      const chevrons = container.querySelectorAll('[aria-hidden="true"]');
      expect(chevrons.length).toBeGreaterThan(0);
    });

    it('should not display a smoke overlay', () => {
      const { container } = render(<RankCard {...achievedProps} />);

      const overlays = container.querySelectorAll('[class*="backdrop-blur"]');
      expect(overlays.length).toBe(0);
    });
  });

  describe('when state is "next"', () => {
    const nextProps = {
      ...baseProps,
      state: 'next' as const,
    };

    it('should render as a link', () => {
      render(<RankCard {...nextProps} />);

      const link = screen.getByRole('link', { name: /9級/ });
      expect(link).toBeInTheDocument();
    });

    it('should render only a chevron icon (no check, no lock)', () => {
      const { container } = render(<RankCard {...nextProps} />);

      // No check icon
      const checkIcon = container.querySelector('.text-emerald-500');
      expect(checkIcon).not.toBeInTheDocument();

      // No lock button
      expect(screen.queryByRole('button', { name: 'ariaLabel' })).not.toBeInTheDocument();

      // Has chevron
      const chevrons = container.querySelectorAll('[aria-hidden="true"]');
      expect(chevrons.length).toBeGreaterThan(0);
    });

    it('should not display a smoke overlay', () => {
      const { container } = render(<RankCard {...nextProps} />);

      const overlays = container.querySelectorAll('[class*="backdrop-blur"]');
      expect(overlays.length).toBe(0);
    });
  });

  describe('when state is "coming-soon"', () => {
    const comingSoonProps = {
      ...baseProps,
      state: 'coming-soon' as const,
    };

    it('should not render as a link', () => {
      render(<RankCard {...comingSoonProps} />);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('should display a Coming Soon overlay', () => {
      const { container } = render(<RankCard {...comingSoonProps} />);

      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
      const overlays = container.querySelectorAll('[class*="backdrop-blur"]');
      expect(overlays.length).toBe(1);
    });
  });

  describe('belt color rendering', () => {
    it('should render the belt color bar', () => {
      const { container } = render(<RankCard {...baseProps} state="next" />);

      const colorBar = container.querySelector('[style*="background-color"]');
      expect(colorBar).toBeInTheDocument();
    });

    it('should add border for white belt', () => {
      const { container } = render(<RankCard {...baseProps} state="next" beltColor="#ffffff" />);

      const colorBar = container.querySelector('[style*="border-bottom"]');
      expect(colorBar).toBeInTheDocument();
    });
  });

  describe('requirements rendering', () => {
    it('should render requirements when labels are provided', () => {
      render(<RankCard {...baseProps} state="next" />);

      expect(screen.getByText('Requirements')).toBeInTheDocument();
      expect(screen.getByText('Score 80+ in Coordinate Quiz')).toBeInTheDocument();
    });

    it('should not render requirements section when labels are empty', () => {
      render(<RankCard {...baseProps} state="next" requirementLabels={[]} />);

      expect(screen.queryByText('Requirements')).not.toBeInTheDocument();
    });
  });
});
