// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SegmentedControl } from './SegmentedControl';

describe('SegmentedControl', () => {
  afterEach(() => {
    cleanup();
  });

  const options = [
    { value: 'a' as const, label: 'Option A' },
    { value: 'b' as const, label: 'Option B' },
    { value: 'c' as const, label: 'Option C' },
  ];

  describe('rendering', () => {
    it('renders all options', () => {
      render(<SegmentedControl options={options} value="a" onChange={() => {}} />);

      expect(screen.getByText('Option A')).toBeDefined();
      expect(screen.getByText('Option B')).toBeDefined();
      expect(screen.getByText('Option C')).toBeDefined();
    });

    it('renders with role="radiogroup"', () => {
      render(<SegmentedControl options={options} value="a" onChange={() => {}} />);

      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toBeDefined();
    });

    it('renders each option as a radio button', () => {
      render(<SegmentedControl options={options} value="a" onChange={() => {}} />);

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(3);
    });
  });

  describe('ARIA attributes', () => {
    it('marks the selected option with aria-checked="true"', () => {
      render(<SegmentedControl options={options} value="b" onChange={() => {}} />);

      const radios = screen.getAllByRole('radio');
      expect(radios[0]).toHaveAttribute('aria-checked', 'false');
      expect(radios[1]).toHaveAttribute('aria-checked', 'true');
      expect(radios[2]).toHaveAttribute('aria-checked', 'false');
    });

    it('updates aria-checked when value changes', () => {
      const { rerender } = render(
        <SegmentedControl options={options} value="a" onChange={() => {}} />
      );

      const radios = screen.getAllByRole('radio');
      expect(radios[0]).toHaveAttribute('aria-checked', 'true');

      rerender(<SegmentedControl options={options} value="c" onChange={() => {}} />);

      expect(radios[0]).toHaveAttribute('aria-checked', 'false');
      expect(radios[2]).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('interaction', () => {
    it('calls onChange with the clicked option value', () => {
      const onChange = vi.fn();
      render(<SegmentedControl options={options} value="a" onChange={onChange} />);

      fireEvent.click(screen.getByText('Option B'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('b');
    });

    it('calls onChange when clicking the already selected option', () => {
      const onChange = vi.fn();
      render(<SegmentedControl options={options} value="a" onChange={onChange} />);

      fireEvent.click(screen.getByText('Option A'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('a');
    });

    it('calls onChange with correct value for each option', () => {
      const onChange = vi.fn();
      render(<SegmentedControl options={options} value="a" onChange={onChange} />);

      fireEvent.click(screen.getByText('Option C'));
      expect(onChange).toHaveBeenLastCalledWith('c');

      fireEvent.click(screen.getByText('Option A'));
      expect(onChange).toHaveBeenLastCalledWith('a');

      fireEvent.click(screen.getByText('Option B'));
      expect(onChange).toHaveBeenLastCalledWith('b');

      expect(onChange).toHaveBeenCalledTimes(3);
    });
  });

  describe('edge cases', () => {
    it('renders with a single option', () => {
      const singleOption = [{ value: 'only' as const, label: 'Only Option' }];
      render(<SegmentedControl options={singleOption} value="only" onChange={() => {}} />);

      expect(screen.getAllByRole('radio')).toHaveLength(1);
      expect(screen.getByText('Only Option')).toBeDefined();
    });

    it('renders with two options (like timed/training)', () => {
      const modeOptions = [
        { value: 'timed' as const, label: 'Timed' },
        { value: 'training' as const, label: 'Training' },
      ];
      render(<SegmentedControl options={modeOptions} value="timed" onChange={() => {}} />);

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(2);
      expect(radios[0]).toHaveAttribute('aria-checked', 'true');
      expect(radios[1]).toHaveAttribute('aria-checked', 'false');
    });
  });
});
