// @vitest-environment jsdom
import React from 'react';

import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Footer } from './Footer';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));

// Mock child component that uses client-side APIs
vi.mock('./LanguageSelector', () => ({
  LanguageSelector: () => React.createElement('div', { 'data-testid': 'language-selector' }),
}));

const mockT = (key: string) => key;

describe('Landing Footer', () => {
  it('renders the Get Started link pointing to onboarding', () => {
    render(<Footer locale="en" t={mockT as never} />);

    const link = screen.getByRole('link', { name: /getStarted/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/en/getting-started');
  });

  it('uses the correct locale in the getting-started', () => {
    render(<Footer locale="ja" t={mockT as never} />);

    const link = screen.getByRole('link', { name: /getStarted/ });
    expect(link).toHaveAttribute('href', '/ja/getting-started');
  });

  it('renders copyright text', () => {
    render(<Footer locale="en" t={mockT as never} />);

    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });
});
