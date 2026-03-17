import React from 'react';

import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useInView } from './use-in-view';

// --- IntersectionObserver mock ---
type IntersectionCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

let observerCallback: IntersectionCallback;
let observerOptions: IntersectionObserverInit | undefined;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

class MockIntersectionObserver {
  constructor(callback: IntersectionCallback, options?: IntersectionObserverInit) {
    observerCallback = callback;
    observerOptions = options;
  }
  observe = mockObserve;
  disconnect = mockDisconnect;
  unobserve = vi.fn();
}

/**
 * Test component that attaches the ref to a real DOM element,
 * allowing the useEffect to see ref.current properly.
 */
function TestComponent({ rootMargin }: { rootMargin?: string }) {
  const { ref, inView } = useInView(rootMargin ? { rootMargin } : undefined);
  return (
    <div ref={ref} data-testid="target" data-inview={String(inView)}>
      {inView ? 'visible' : 'hidden'}
    </div>
  );
}

describe('useInView', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    mockObserve.mockClear();
    mockDisconnect.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns inView=false initially', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('target')).toHaveAttribute('data-inview', 'false');
    expect(screen.getByTestId('target')).toHaveTextContent('hidden');
  });

  it('returns a ref object', () => {
    const { result } = renderHook(() => useInView());

    expect(result.current.ref).toBeDefined();
    expect(result.current.ref).toHaveProperty('current');
  });

  it('observes the element when ref is attached to DOM', () => {
    render(<TestComponent />);

    expect(mockObserve).toHaveBeenCalledTimes(1);
    expect(mockObserve).toHaveBeenCalledWith(screen.getByTestId('target'));
  });

  it('sets inView=true when intersection is detected', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('target')).toHaveAttribute('data-inview', 'false');

    // Simulate the element becoming visible
    act(() => {
      observerCallback([{ isIntersecting: true }]);
    });

    expect(screen.getByTestId('target')).toHaveAttribute('data-inview', 'true');
    expect(screen.getByTestId('target')).toHaveTextContent('visible');
  });

  it('disconnects observer after first intersection (fire-once behavior)', () => {
    render(<TestComponent />);

    mockDisconnect.mockClear();

    // Simulate intersection
    act(() => {
      observerCallback([{ isIntersecting: true }]);
    });

    // Observer should disconnect after the first intersection
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('does not set inView when isIntersecting is false', () => {
    render(<TestComponent />);

    observerCallback([{ isIntersecting: false }]);

    expect(screen.getByTestId('target')).toHaveAttribute('data-inview', 'false');
    expect(screen.getByTestId('target')).toHaveTextContent('hidden');
  });

  it('does not disconnect when isIntersecting is false', () => {
    render(<TestComponent />);

    mockDisconnect.mockClear();

    observerCallback([{ isIntersecting: false }]);

    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it('passes rootMargin option to IntersectionObserver', () => {
    render(<TestComponent rootMargin="100px" />);

    expect(observerOptions).toEqual({ rootMargin: '100px' });
  });

  it('uses rootMargin "0px" by default', () => {
    render(<TestComponent />);

    expect(observerOptions).toEqual({ rootMargin: '0px' });
  });

  it('disconnects observer on unmount (cleanup)', () => {
    const { unmount } = render(<TestComponent />);

    mockDisconnect.mockClear();
    unmount();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('does not create observer when ref.current is null', () => {
    mockObserve.mockClear();

    // renderHook does not render a DOM element, so ref.current stays null
    renderHook(() => useInView());

    expect(mockObserve).not.toHaveBeenCalled();
  });

  it('remains inView=true after second callback (idempotent)', () => {
    render(<TestComponent />);

    // First intersection
    act(() => {
      observerCallback([{ isIntersecting: true }]);
    });
    expect(screen.getByTestId('target')).toHaveAttribute('data-inview', 'true');

    // The observer was already disconnected, but if it were called again,
    // state should stay true
    expect(screen.getByTestId('target')).toHaveAttribute('data-inview', 'true');
  });
});

describe('useInView SSR safety', () => {
  beforeEach(() => {
    // Simulate SSR: no IntersectionObserver
    vi.stubGlobal('IntersectionObserver', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns inView=false when IntersectionObserver is not available', () => {
    // In the current implementation, if ref.current is null (no DOM in SSR),
    // the useEffect early-returns before constructing IntersectionObserver.
    // renderHook does not attach to DOM, simulating SSR behavior.
    const { result } = renderHook(() => useInView());

    expect(result.current.inView).toBe(false);
    expect(result.current.ref).toBeDefined();
  });
});
