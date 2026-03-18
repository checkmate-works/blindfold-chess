import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RatingInput } from './RatingInput';

const defaultLabels: Record<string, string> = {
  '1': 'Terrible',
  '2': 'Bad',
  '3': 'Okay',
  '4': 'Good',
  '5': 'Excellent',
};

describe('RatingInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the label', () => {
    render(<RatingInput name="rating" label="My Rating" labels={defaultLabels} />);
    expect(screen.getByText('My Rating')).toBeInTheDocument();
  });

  it('should render 5 star buttons', () => {
    render(<RatingInput name="rating" label="My Rating" labels={defaultLabels} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it('should render a hidden input with the name prop', () => {
    const { container } = render(
      <RatingInput name="preferenceRating" label="Preference" labels={defaultLabels} />
    );
    const hiddenInput = container.querySelector('input[type="hidden"][name="preferenceRating"]');
    expect(hiddenInput).toBeInTheDocument();
  });

  it('should have empty hidden input value initially', () => {
    const { container } = render(
      <RatingInput name="rating" label="My Rating" labels={defaultLabels} />
    );
    const hiddenInput = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hiddenInput.value).toBe('');
  });

  it('should set hidden input value when a star is clicked', () => {
    const { container } = render(
      <RatingInput name="rating" label="My Rating" labels={defaultLabels} />
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]); // Click star 3

    const hiddenInput = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hiddenInput.value).toBe('3');
  });

  it('should clear hidden input value when the same star is clicked again (toggle off)', () => {
    const { container } = render(
      <RatingInput name="rating" label="My Rating" labels={defaultLabels} />
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]); // Click star 3
    fireEvent.click(buttons[2]); // Click star 3 again to deselect

    const hiddenInput = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hiddenInput.value).toBe('');
  });

  it('should change value when a different star is clicked', () => {
    const { container } = render(
      <RatingInput name="rating" label="My Rating" labels={defaultLabels} />
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]); // Click star 3
    fireEvent.click(buttons[4]); // Click star 5

    const hiddenInput = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hiddenInput.value).toBe('5');
  });

  describe('onChange callback', () => {
    it('should call onChange with true when a star is selected', () => {
      const onChange = vi.fn();
      render(
        <RatingInput name="rating" label="My Rating" labels={defaultLabels} onChange={onChange} />
      );
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]); // Click star 1

      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('should call onChange with false when the same star is toggled off', () => {
      const onChange = vi.fn();
      render(
        <RatingInput name="rating" label="My Rating" labels={defaultLabels} onChange={onChange} />
      );
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]); // Select
      fireEvent.click(buttons[0]); // Deselect

      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenNthCalledWith(1, true);
      expect(onChange).toHaveBeenNthCalledWith(2, false);
    });

    it('should call onChange with true when switching from one star to another', () => {
      const onChange = vi.fn();
      render(
        <RatingInput name="rating" label="My Rating" labels={defaultLabels} onChange={onChange} />
      );
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]); // Select star 1
      fireEvent.click(buttons[4]); // Select star 5

      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenNthCalledWith(1, true);
      expect(onChange).toHaveBeenNthCalledWith(2, true);
    });

    it('should not throw when onChange is not provided', () => {
      render(<RatingInput name="rating" label="My Rating" labels={defaultLabels} />);
      const buttons = screen.getAllByRole('button');
      expect(() => fireEvent.click(buttons[0])).not.toThrow();
    });
  });

  describe('aria-labels', () => {
    it('should have aria-label with star number and label text', () => {
      render(<RatingInput name="rating" label="My Rating" labels={defaultLabels} />);
      expect(screen.getByLabelText('1 - Terrible')).toBeInTheDocument();
      expect(screen.getByLabelText('2 - Bad')).toBeInTheDocument();
      expect(screen.getByLabelText('3 - Okay')).toBeInTheDocument();
      expect(screen.getByLabelText('4 - Good')).toBeInTheDocument();
      expect(screen.getByLabelText('5 - Excellent')).toBeInTheDocument();
    });
  });

  describe('display label', () => {
    it('should not display a label initially', () => {
      render(<RatingInput name="rating" label="My Rating" labels={defaultLabels} />);
      // None of the label texts should be visible as standalone text
      expect(screen.queryByText('Terrible')).not.toBeInTheDocument();
      expect(screen.queryByText('Excellent')).not.toBeInTheDocument();
    });

    it('should display the label for the selected star', () => {
      render(<RatingInput name="rating" label="My Rating" labels={defaultLabels} />);
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[3]); // Click star 4 (Good)

      expect(screen.getByText('Good')).toBeInTheDocument();
    });
  });
});
