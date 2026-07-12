import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PuzzleStepIndicator } from './PuzzleStepIndicator';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

afterEach(() => {
  cleanup();
});

describe('PuzzleStepIndicator', () => {
  it('renders the three create-flow steps in order', () => {
    render(<PuzzleStepIndicator flow="create" current="position" />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]!.textContent).toContain('stepPosition');
    expect(items[1]!.textContent).toContain('stepSolution');
    expect(items[2]!.textContent).toContain('stepPreview');
  });

  it('renders the three edit-flow steps in order', () => {
    render(<PuzzleStepIndicator flow="edit" current="solution" />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]!.textContent).toContain('stepPosition');
    expect(items[1]!.textContent).toContain('stepSolution');
    expect(items[2]!.textContent).toContain('stepPreview');
  });

  it('marks exactly the current step with aria-current="step"', () => {
    render(<PuzzleStepIndicator flow="create" current="solution" />);

    const items = screen.getAllByRole('listitem');
    expect(items[0]!.getAttribute('aria-current')).toBeNull();
    expect(items[1]!.getAttribute('aria-current')).toBe('step');
    expect(items[2]!.getAttribute('aria-current')).toBeNull();
  });
});
