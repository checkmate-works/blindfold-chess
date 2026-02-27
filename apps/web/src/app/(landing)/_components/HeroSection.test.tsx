// @vitest-environment jsdom
import React from 'react';

import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HeroSection } from './HeroSection';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => React.createElement('img', props),
}));

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));

// Mock child components that use client-side APIs
vi.mock('./LanguageSelector', () => ({
  LanguageSelector: () => React.createElement('div', { 'data-testid': 'language-selector' }),
}));

vi.mock('./ScrollIndicator', () => ({
  ScrollIndicator: () => React.createElement('div', { 'data-testid': 'scroll-indicator' }),
}));

const mockT = (key: string) => key;

describe('HeroSection', () => {
  it('renders the Get Started link pointing to onboarding', () => {
    render(<HeroSection locale="en" t={mockT as never} />);

    const link = screen.getByRole('link', { name: /getStarted/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/en/getting-started');
  });

  it('uses the correct locale in the getting-started', () => {
    render(<HeroSection locale="ja" t={mockT as never} />);

    const link = screen.getByRole('link', { name: /getStarted/ });
    expect(link).toHaveAttribute('href', '/ja/getting-started');
  });

  it('renders the go-to-top link pointing to the locale root', () => {
    render(<HeroSection locale="en" t={mockT as never} />);

    const link = screen.getByRole('link', { name: /goToTop/ });
    expect(link).toHaveAttribute('href', '/en');
  });
});
