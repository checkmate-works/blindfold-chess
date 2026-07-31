import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { StepIndicator } from './StepIndicator';

const STEPS = [
  { key: 'position', label: 'Position' },
  { key: 'solution', label: 'Solution' },
  { key: 'preview', label: 'Preview' },
] as const;

afterEach(() => {
  cleanup();
});

describe('StepIndicator', () => {
  it('renders every step in the given order', () => {
    render(<StepIndicator ariaLabel="Steps" current="position" steps={STEPS} />);

    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['1Position', '›2Solution', '›3Preview']);
  });

  it('marks exactly the current step with aria-current="step"', () => {
    render(<StepIndicator ariaLabel="Steps" current="solution" steps={STEPS} />);

    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.getAttribute('aria-current'))).toEqual([null, 'step', null]);
  });

  it('styles preceding steps as done and following steps as upcoming', () => {
    render(<StepIndicator ariaLabel="Steps" current="solution" steps={STEPS} />);

    const [done, current, upcoming] = screen.getAllByRole('listitem').map((item) => {
      // Each item hides one or two spans from assistive tech: the "›"
      // separator (absent on the first step) and then the numbered bullet.
      const hidden = item.querySelectorAll('span[aria-hidden]');
      return hidden[hidden.length - 1]!.className;
    });
    expect(done).toContain('bg-muted');
    expect(current).toContain('bg-primary');
    expect(upcoming).toContain('border-border');
  });

  it('leaves every step unmarked when `current` matches no step', () => {
    render(<StepIndicator ariaLabel="Steps" current="unknown" steps={STEPS} />);

    const items = screen.getAllByRole('listitem');
    expect(items.every((item) => item.getAttribute('aria-current') === null)).toBe(true);
  });
});
