import { type ReactNode, useLayoutEffect } from 'react';

import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useScrollToElement, useScrollToPageTop } from './use-scroll-to-element';

const ID = 'session';

/** Every scroll the hook or a stand-in for the router makes, in order. */
let events: string[];

function Session({
  showTarget = true,
  enabled = true,
}: {
  showTarget?: boolean;
  enabled?: boolean;
}) {
  useScrollToElement(ID, enabled);
  return showTarget ? <div id={ID}>session</div> : <div>skeleton outside the target</div>;
}

/**
 * Stands in for Next.js's layout router, whose scroll handling is a layout
 * effect of an ancestor of the page and so runs after the page's own layout
 * effects in the same commit.
 */
function RouterScrollReset({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    events.push('router-reset');
  });
  return <>{children}</>;
}

beforeEach(() => {
  events = [];
  // jsdom implements no scrolling; record the calls instead.
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    events.push(`align#${this.id}`);
  });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useScrollToElement', () => {
  it('aligns the element within the commit that first renders it, with no timer or frame', () => {
    render(<Session />);

    // Nothing has been advanced: the alignment happened before the browser
    // could paint the commit.
    expect(events).toEqual([`align#${ID}`]);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'instant',
      block: 'start',
    });
  });

  it('aligns again after an ancestor resets the scroll later in the same commit, before paint', async () => {
    render(
      <RouterScrollReset>
        <Session />
      </RouterScrollReset>
    );
    expect(events).toEqual([`align#${ID}`, 'router-reset']);

    // A microtask: runs before the browser regains control to paint.
    await Promise.resolve();
    expect(events).toEqual([`align#${ID}`, 'router-reset', `align#${ID}`]);
  });

  it('waits for the commit that renders the element when it is not there yet', () => {
    const { rerender } = render(<Session showTarget={false} />);
    expect(events).toEqual([]);

    rerender(<Session showTarget />);
    expect(events).toEqual([`align#${ID}`]);
  });

  it('defers until enabled, then aligns in that commit', () => {
    const { rerender } = render(<Session enabled={false} />);
    expect(events).toEqual([]);

    rerender(<Session enabled />);
    expect(events).toEqual([`align#${ID}`]);
  });

  it('aligns only once', async () => {
    const { rerender } = render(<Session />);
    await Promise.resolve();
    events = [];

    rerender(<Session />);
    await Promise.resolve();
    vi.runAllTimers();
    expect(events).toEqual([]);
  });
});

function ResultSkeleton() {
  useScrollToPageTop();
  return <div>result skeleton</div>;
}

describe('useScrollToPageTop', () => {
  it('scrolls the document to the top within the commit that mounts the caller', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    render(<ResultSkeleton />);

    // Nothing has been advanced: the reset happened before the browser could
    // paint the skeleton.
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    scrollTo.mockRestore();
  });

  it('does not scroll again when the caller re-renders', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    const { rerender } = render(<ResultSkeleton />);
    rerender(<ResultSkeleton />);

    expect(scrollTo).toHaveBeenCalledTimes(1);
    scrollTo.mockRestore();
  });
});
