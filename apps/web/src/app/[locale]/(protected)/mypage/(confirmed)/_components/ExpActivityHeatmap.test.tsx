import * as matchers from '@testing-library/jest-dom/matchers';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExpActivityHeatmap } from './ExpActivityHeatmap';

expect.extend(matchers);

vi.mock('@/i18n/routing');
vi.mock('@/i18n/use-safe-translations');

describe('ExpActivityHeatmap', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('lays out the recent days from the server’s instant, not the client clock', () => {
    // The client is already a UTC day past the server's render.
    vi.useFakeTimers({ now: new Date('2026-04-03T00:30:00Z'), toFake: ['Date'] });

    render(
      <ExpActivityHeatmap
        data={{
          daily: { '2026-04-02': 40 },
          dailyByModule: {},
          asOf: '2026-04-02T23:59:00.000Z',
        }}
        legendLess="Less"
        legendMore="More"
      />
    );

    expect(screen.getAllByTitle('2026-04-02: 40 Exp').length).toBeGreaterThan(0);
    expect(screen.queryAllByTitle(/^2026-04-03:/)).toHaveLength(0);
  });
});
