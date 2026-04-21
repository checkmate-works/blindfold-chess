import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MoveInputSkeleton } from './MoveInputSkeleton';

// The `Skeleton` barrel in `@/app/[locale]/_components` transitively imports
// at least one `server-only` module (e.g. via `UserAvatar` / server-aware
// components re-exported there). Stub the barrel with a minimal `Skeleton`
// that mirrors the real one's output shape so jsdom tests can load the
// client component under test without pulling server-only code.
vi.mock('@/app/[locale]/_components', () => ({
  Skeleton: ({
    className = '',
    disableAnimation: _disableAnimation,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { disableAnimation?: boolean }) => (
    <div aria-hidden className={`rounded-md bg-muted ${className}`.trim()} {...props} />
  ),
}));

afterEach(() => {
  cleanup();
});

/**
 * The `ModeSwitchSkeleton` has a distinctive structural signature: an inner
 * `<div class="rounded-md border border-border p-2">` wrapping a single `h-4
 * w-4` shape. We detect it structurally instead of by testid so the test
 * does not require modifying the implementation component.
 */
function hasModeSwitchSkeleton(container: HTMLElement): boolean {
  return container.querySelector('div.rounded-md.border.border-border.p-2') !== null;
}

describe('MoveInputSkeleton', () => {
  describe("mode='button'", () => {
    it('renders ModeSwitchSkeleton as a sibling when hasModeSwitch=true', () => {
      const { container } = render(
        <MoveInputSkeleton mode="button" variant="initial" hasModeSwitch={true} />
      );

      expect(hasModeSwitchSkeleton(container)).toBe(true);
    });

    it('does NOT render ModeSwitchSkeleton when hasModeSwitch=false', () => {
      const { container } = render(
        <MoveInputSkeleton mode="button" variant="initial" hasModeSwitch={false} />
      );

      expect(hasModeSwitchSkeleton(container)).toBe(false);
    });

    it('does NOT render ModeSwitchSkeleton when hasModeSwitch is omitted (default false)', () => {
      const { container } = render(<MoveInputSkeleton mode="button" variant="initial" />);

      expect(hasModeSwitchSkeleton(container)).toBe(false);
    });

    it('wraps the card and switcher in a flex flex-col gap-6 container when hasModeSwitch=true', () => {
      const { container } = render(
        <MoveInputSkeleton mode="button" variant="initial" hasModeSwitch={true} />
      );

      // The outermost element is the flex flex-col gap-6 wrapper that
      // contains both the card skeleton and the switcher.
      const root = container.firstElementChild;
      expect(root).not.toBeNull();
      expect(root?.className).toContain('flex');
      expect(root?.className).toContain('flex-col');
      expect(root?.className).toContain('gap-6');
      expect(root?.children.length).toBe(2);
    });
  });

  describe("mode='text'", () => {
    it('renders ModeSwitchSkeleton when hasModeSwitch=true (regression guard)', () => {
      const { container } = render(
        <MoveInputSkeleton mode="text" variant="initial" hasModeSwitch={true} />
      );

      expect(hasModeSwitchSkeleton(container)).toBe(true);
    });

    it('does NOT render ModeSwitchSkeleton when hasModeSwitch=false', () => {
      const { container } = render(
        <MoveInputSkeleton mode="text" variant="initial" hasModeSwitch={false} />
      );

      expect(hasModeSwitchSkeleton(container)).toBe(false);
    });
  });

  describe("mode='select'", () => {
    it('renders ModeSwitchSkeleton when hasModeSwitch=true (regression guard)', () => {
      const { container } = render(
        <MoveInputSkeleton mode="select" variant="initial" hasModeSwitch={true} />
      );

      expect(hasModeSwitchSkeleton(container)).toBe(true);
    });

    it('does NOT render ModeSwitchSkeleton when hasModeSwitch=false', () => {
      const { container } = render(
        <MoveInputSkeleton mode="select" variant="initial" hasModeSwitch={false} />
      );

      expect(hasModeSwitchSkeleton(container)).toBe(false);
    });
  });

  describe('aria semantics', () => {
    it("variant='initial' exposes a polite live region on the outer wrapper", () => {
      const { container } = render(
        <MoveInputSkeleton mode="button" variant="initial" hasModeSwitch={true} />
      );

      const root = container.firstElementChild;
      expect(root?.getAttribute('role')).toBe('status');
      expect(root?.getAttribute('aria-live')).toBe('polite');
      expect(root?.getAttribute('aria-busy')).toBe('true');
    });

    it("variant='ai-turn' hides the skeleton from assistive tech", () => {
      const { container } = render(
        <MoveInputSkeleton mode="button" variant="ai-turn" hasModeSwitch={true} />
      );

      const root = container.firstElementChild;
      expect(root?.getAttribute('aria-hidden')).toBe('true');
      expect(root?.hasAttribute('role')).toBe(false);
      expect(root?.hasAttribute('aria-live')).toBe(false);
    });
  });
});
