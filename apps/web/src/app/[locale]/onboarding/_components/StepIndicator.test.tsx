// @vitest-environment jsdom
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { StepIndicator } from './StepIndicator';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

describe('StepIndicator', () => {
  describe('rendering steps', () => {
    it('renders the correct number of step indicators', () => {
      const steps = [
        { id: 'step1', label: 'Step 1' },
        { id: 'step2', label: 'Step 2' },
        { id: 'step3', label: 'Step 3' },
      ];

      render(<StepIndicator steps={steps} currentStepIndex={0} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders a single step without connector', () => {
      const steps = [{ id: 'step1', label: 'Step 1' }];

      const { container } = render(<StepIndicator steps={steps} currentStepIndex={0} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      // No connector line should exist for a single step
      const connectors = container.querySelectorAll('.w-8.h-0\\.5');
      expect(connectors.length).toBe(0);
    });

    it('renders connectors between steps (count = steps.length - 1)', () => {
      const steps = [
        { id: 'step1', label: 'Step 1' },
        { id: 'step2', label: 'Step 2' },
        { id: 'step3', label: 'Step 3' },
      ];

      const { container } = render(<StepIndicator steps={steps} currentStepIndex={0} />);

      const connectors = container.querySelectorAll('.h-0\\.5');
      expect(connectors.length).toBe(2);
    });
  });

  describe('current step styling', () => {
    it('applies active styling to the current step', () => {
      const steps = [
        { id: 'step1', label: 'Step 1' },
        { id: 'step2', label: 'Step 2' },
      ];

      render(<StepIndicator steps={steps} currentStepIndex={0} />);

      const step1 = screen.getByText('1');
      expect(step1.className).toContain('bg-primary');
      expect(step1.className).toContain('text-primary-foreground');
    });

    it('applies muted styling to future steps', () => {
      const steps = [
        { id: 'step1', label: 'Step 1' },
        { id: 'step2', label: 'Step 2' },
      ];

      render(<StepIndicator steps={steps} currentStepIndex={0} />);

      const step2 = screen.getByText('2');
      expect(step2.className).toContain('bg-muted');
      expect(step2.className).toContain('text-muted-foreground');
    });

    it('applies completed styling to past steps', () => {
      const steps = [
        { id: 'step1', label: 'Step 1' },
        { id: 'step2', label: 'Step 2' },
        { id: 'step3', label: 'Step 3' },
      ];

      render(<StepIndicator steps={steps} currentStepIndex={2} />);

      const step1 = screen.getByText('1');
      expect(step1.className).toContain('bg-primary/20');
      expect(step1.className).toContain('text-primary');
    });

    it('updates styling when currentStepIndex changes', () => {
      const steps = [
        { id: 'step1', label: 'Step 1' },
        { id: 'step2', label: 'Step 2' },
      ];

      const { rerender } = render(<StepIndicator steps={steps} currentStepIndex={0} />);

      // Step 1 is active, Step 2 is future
      expect(screen.getByText('1').className).toContain('bg-primary');
      expect(screen.getByText('2').className).toContain('bg-muted');

      rerender(<StepIndicator steps={steps} currentStepIndex={1} />);

      // Step 1 is completed, Step 2 is active
      expect(screen.getByText('1').className).toContain('bg-primary/20');
      expect(screen.getByText('2').className).toContain('bg-primary');
      expect(screen.getByText('2').className).toContain('text-primary-foreground');
    });
  });

  describe('connector styling', () => {
    it('applies completed styling to connectors before current step', () => {
      const steps = [
        { id: 'step1', label: 'Step 1' },
        { id: 'step2', label: 'Step 2' },
        { id: 'step3', label: 'Step 3' },
      ];

      const { container } = render(<StepIndicator steps={steps} currentStepIndex={2} />);

      const connectors = container.querySelectorAll('.h-0\\.5');
      // Both connectors should have completed styling
      connectors.forEach((connector) => {
        expect(connector.className).toContain('bg-primary/40');
      });
    });

    it('applies muted styling to connectors at or after current step', () => {
      const steps = [
        { id: 'step1', label: 'Step 1' },
        { id: 'step2', label: 'Step 2' },
        { id: 'step3', label: 'Step 3' },
      ];

      const { container } = render(<StepIndicator steps={steps} currentStepIndex={0} />);

      const connectors = container.querySelectorAll('.h-0\\.5');
      connectors.forEach((connector) => {
        expect(connector.className).toContain('bg-muted');
      });
    });
  });

  describe('edge cases', () => {
    it('renders with empty steps array without crashing', () => {
      const { container } = render(<StepIndicator steps={[]} currentStepIndex={0} />);

      // Should render the container but no step indicators
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
