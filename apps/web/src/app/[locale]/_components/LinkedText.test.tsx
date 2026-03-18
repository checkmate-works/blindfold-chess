import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LinkedText } from './LinkedText';

describe('LinkedText', () => {
  it('should render plain text without any links', () => {
    render(<LinkedText text="Hello, world!" locale="en" />);
    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should render a link for an external URL', () => {
    render(<LinkedText text="Visit https://example.com for info" locale="en" />);
    const link = screen.getByRole('link');
    expect(link).toHaveTextContent('https://example.com');
    expect(link).toHaveAttribute('href', '/en/redirect?url=https%3A%2F%2Fexample.com');
  });

  it('should render external URLs through the cushion page', () => {
    render(<LinkedText text="Check https://lichess.org" locale="ja" />);
    const link = screen.getByRole('link');
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('/ja/redirect?url=');
  });

  it('should render internal URLs as direct links', () => {
    render(<LinkedText text="See https://blindfold-chess.online/topics" locale="en" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://blindfold-chess.online/topics');
  });

  it('should not route internal URLs through the cushion page', () => {
    render(<LinkedText text="See https://blindfold-chess.online/topics" locale="en" />);
    const link = screen.getByRole('link');
    const href = link.getAttribute('href') ?? '';
    expect(href).not.toContain('/redirect');
  });

  it('should render multiple links', () => {
    render(<LinkedText text="Visit https://example.com and https://lichess.org" locale="en" />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
  });

  it('should render surrounding text alongside links', () => {
    const { container } = render(
      <LinkedText text="Before https://example.com after" locale="en" />
    );
    expect(container.textContent).toBe('Before https://example.com after');
  });

  it('should have break-all class on links for long URL wrapping', () => {
    render(<LinkedText text="https://example.com" locale="en" />);
    const link = screen.getByRole('link');
    expect(link.className).toContain('break-all');
  });

  it('should have underline class on links', () => {
    render(<LinkedText text="https://example.com" locale="en" />);
    const link = screen.getByRole('link');
    expect(link.className).toContain('underline');
  });

  it('should render empty string without errors', () => {
    const { container } = render(<LinkedText text="" locale="en" />);
    expect(container.textContent).toBe('');
  });

  it('should use the locale parameter for cushion page URLs', () => {
    render(<LinkedText text="https://example.com" locale="ja" />);
    const link = screen.getByRole('link');
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('/ja/redirect');
  });

  it('should use "en" locale in cushion page URL when locale is en', () => {
    render(<LinkedText text="https://example.com" locale="en" />);
    const link = screen.getByRole('link');
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('/en/redirect');
  });

  it('should render text-only content without span wrappers', () => {
    const { container } = render(<LinkedText text="No links here" locale="en" />);
    // When there's only text, the component returns <>{text}</> directly
    expect(container.querySelector('span')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
  });

  it('should render text segments in spans when links are present', () => {
    const { container } = render(
      <LinkedText text="Before https://example.com after" locale="en" />
    );
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBeGreaterThanOrEqual(2);
  });

  it('should add rel="noopener noreferrer" to external links', () => {
    render(<LinkedText text="https://example.com" locale="en" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should not add rel attribute to internal links', () => {
    render(<LinkedText text="https://blindfold-chess.online/topics" locale="en" />);
    const link = screen.getByRole('link');
    expect(link).not.toHaveAttribute('rel');
  });
});
