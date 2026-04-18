import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EnvironmentRibbon } from './EnvironmentRibbon';

/**
 * Tests for EnvironmentRibbon.
 *
 * The most important property this test suite guarantees is:
 *   **Production MUST NEVER render the ribbon.**
 *
 * `NODE_ENV` is `'test'` when Vitest runs, which would unconditionally hide
 * the ribbon. Every test therefore overrides both `VERCEL_ENV` and `NODE_ENV`
 * explicitly so we actually exercise the production / preview / dev branches
 * instead of tripping the blanket "test" guard.
 *
 * Mutating `process.env` is the standard Node pattern; a `beforeEach` snapshot
 * + `afterEach` restore keeps tests isolated.
 */

const RIBBON_TEST_ID = 'environment-ribbon';

describe('EnvironmentRibbon', () => {
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Start each test from a known-clean slate.
    delete process.env.VERCEL_ENV;
    // NODE_ENV is read-only in the type system but is a plain string at runtime.
    // Tests override it intentionally.
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
  });

  afterEach(() => {
    cleanup();
    if (originalVercelEnv === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = originalVercelEnv;
    }
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
  });

  describe('production environment (CRITICAL)', () => {
    it('does NOT render when VERCEL_ENV=production and NODE_ENV=production', () => {
      process.env.VERCEL_ENV = 'production';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      const { container } = render(<EnvironmentRibbon />);
      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByTestId(RIBBON_TEST_ID)).toBeNull();
      expect(screen.queryByText('LOCAL')).toBeNull();
      expect(screen.queryByText('PREVIEW')).toBeNull();
    });

    it('does NOT render when VERCEL_ENV=production even if NODE_ENV is unexpectedly not production', () => {
      // Defensive: even if something odd happens, VERCEL_ENV=production wins.
      process.env.VERCEL_ENV = 'production';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';

      const { container } = render(<EnvironmentRibbon />);
      expect(container).toBeEmptyDOMElement();
    });

    it('does NOT render when NODE_ENV=production and VERCEL_ENV is missing (self-hosted / non-Vercel prod)', () => {
      // If a production build somehow lacks VERCEL_ENV (e.g. self-hosted),
      // NODE_ENV=production alone must still prevent us from flashing "LOCAL".
      delete process.env.VERCEL_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      const { container } = render(<EnvironmentRibbon />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('preview environment', () => {
    it('renders the PREVIEW ribbon when VERCEL_ENV=preview', () => {
      process.env.VERCEL_ENV = 'preview';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      render(<EnvironmentRibbon />);

      expect(screen.getByTestId(RIBBON_TEST_ID)).toBeInTheDocument();
      expect(screen.getByText('PREVIEW')).toBeInTheDocument();
      expect(screen.queryByText('LOCAL')).toBeNull();
    });

    it('applies yellow color classes on the PREVIEW ribbon', () => {
      process.env.VERCEL_ENV = 'preview';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      render(<EnvironmentRibbon />);

      const label = screen.getByText('PREVIEW');
      expect(label.className).toContain('bg-yellow-400');
    });
  });

  describe('local / development environment', () => {
    it('renders the LOCAL ribbon when VERCEL_ENV is unset (pure local dev)', () => {
      delete process.env.VERCEL_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';

      render(<EnvironmentRibbon />);

      expect(screen.getByTestId(RIBBON_TEST_ID)).toBeInTheDocument();
      expect(screen.getByText('LOCAL')).toBeInTheDocument();
      expect(screen.queryByText('PREVIEW')).toBeNull();
    });

    it('renders the LOCAL ribbon when VERCEL_ENV=development', () => {
      process.env.VERCEL_ENV = 'development';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';

      render(<EnvironmentRibbon />);

      expect(screen.getByText('LOCAL')).toBeInTheDocument();
    });

    it('applies green color classes on the LOCAL ribbon', () => {
      delete process.env.VERCEL_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';

      render(<EnvironmentRibbon />);

      const label = screen.getByText('LOCAL');
      expect(label.className).toContain('bg-green-500');
    });
  });

  describe('test environment', () => {
    it('does NOT render when NODE_ENV=test (prevents Playwright/E2E interference)', () => {
      delete process.env.VERCEL_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'test';

      const { container } = render(<EnvironmentRibbon />);
      expect(container).toBeEmptyDOMElement();
    });

    it('does NOT render when NODE_ENV=test even if VERCEL_ENV=preview (E2E against a preview-like setup)', () => {
      // Extra belt-and-braces: if a future E2E run (Playwright) spins up a
      // preview-like process with VERCEL_ENV=preview, NODE_ENV=test must still
      // suppress the ribbon so the ribbon does not occlude UI under test.
      process.env.VERCEL_ENV = 'preview';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'test';

      const { container } = render(<EnvironmentRibbon />);
      expect(container).toBeEmptyDOMElement();
    });

    it('does NOT render when NODE_ENV=test and VERCEL_ENV=production (production gate wins)', () => {
      // Production is the most critical branch — even under tests the ribbon
      // must stay hidden.
      process.env.VERCEL_ENV = 'production';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'test';

      const { container } = render(<EnvironmentRibbon />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('unknown environment (fail-safe)', () => {
    it('does NOT render for an unrecognized VERCEL_ENV value', () => {
      process.env.VERCEL_ENV = 'staging';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';

      const { container } = render(<EnvironmentRibbon />);
      expect(container).toBeEmptyDOMElement();
    });

    it('does NOT render when VERCEL_ENV is an empty string (treated as unknown, not as unset)', () => {
      // Boundary case: an empty string is NOT strictly `undefined`, so the
      // `=== undefined` branch does not fire. We expect the else-branch
      // fail-safe to suppress rendering.
      process.env.VERCEL_ENV = '';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';

      const { container } = render(<EnvironmentRibbon />);
      expect(container).toBeEmptyDOMElement();
    });

    it('does NOT render when VERCEL_ENV=development but NODE_ENV=production (defensive guard)', () => {
      // The local-dev branch explicitly requires `nodeEnv !== 'production'`.
      // This combination is odd in practice, but it protects against a
      // self-hosted production build that happens to set VERCEL_ENV=development.
      process.env.VERCEL_ENV = 'development';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      const { container } = render(<EnvironmentRibbon />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('preview takes precedence over NODE_ENV heuristics', () => {
    it('renders the PREVIEW ribbon when VERCEL_ENV=preview even if NODE_ENV=development', () => {
      // VERCEL_ENV is the sole discriminator between preview and production,
      // so the PREVIEW branch must not be gated on NODE_ENV.
      process.env.VERCEL_ENV = 'preview';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';

      render(<EnvironmentRibbon />);

      expect(screen.getByText('PREVIEW')).toBeInTheDocument();
      expect(screen.queryByText('LOCAL')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('marks the ribbon as aria-hidden so it is ignored by assistive tech', () => {
      process.env.VERCEL_ENV = 'preview';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      render(<EnvironmentRibbon />);

      expect(screen.getByTestId(RIBBON_TEST_ID)).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
