import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UnsavedChangesDialog } from './UnsavedChangesDialog';

describe('UnsavedChangesDialog', () => {
  it('should not render when open is false', () => {
    render(<UnsavedChangesDialog open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render with default labels when open is true', () => {
    render(<UnsavedChangesDialog open={true} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    expect(
      screen.getByText('You have unsaved changes. Are you sure you want to leave?')
    ).toBeInTheDocument();
    expect(screen.getByText('Leave')).toBeInTheDocument();
    expect(screen.getByText('Stay')).toBeInTheDocument();
  });

  it('should render with custom labels', () => {
    render(
      <UnsavedChangesDialog
        open={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        title="Custom Title"
        message="Custom message"
        confirmLabel="Yes"
        cancelLabel="No"
      />
    );

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom message')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<UnsavedChangesDialog open={true} onConfirm={onConfirm} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByText('Leave'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<UnsavedChangesDialog open={true} onConfirm={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByText('Stay'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when backdrop is clicked', () => {
    const onCancel = vi.fn();
    render(<UnsavedChangesDialog open={true} onConfirm={vi.fn()} onCancel={onCancel} />);

    // The overlay container (parent of dialog) has the onClick={onClose} handler
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog.parentElement!);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when Escape key is pressed', () => {
    const onCancel = vi.fn();
    render(<UnsavedChangesDialog open={true} onConfirm={vi.fn()} onCancel={onCancel} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should close dialog when open changes from true to false', () => {
    const { rerender } = render(
      <UnsavedChangesDialog open={true} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(<UnsavedChangesDialog open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should use default labels when only some custom labels are provided', () => {
    render(
      <UnsavedChangesDialog
        open={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        title="Custom Title"
      />
    );

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    // Default message, confirmLabel, cancelLabel should still be used
    expect(
      screen.getByText('You have unsaved changes. Are you sure you want to leave?')
    ).toBeInTheDocument();
    expect(screen.getByText('Leave')).toBeInTheDocument();
    expect(screen.getByText('Stay')).toBeInTheDocument();
  });

  it('should call onConfirm exactly once on rapid double-click', () => {
    const onConfirm = vi.fn();
    render(<UnsavedChangesDialog open={true} onConfirm={onConfirm} onCancel={vi.fn()} />);

    const confirmButton = screen.getByText('Leave');
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it('should call onCancel exactly once on rapid double-click', () => {
    const onCancel = vi.fn();
    render(<UnsavedChangesDialog open={true} onConfirm={vi.fn()} onCancel={onCancel} />);

    const cancelButton = screen.getByText('Stay');
    fireEvent.click(cancelButton);
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('should have proper aria attributes for accessibility', () => {
    render(<UnsavedChangesDialog open={true} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // `data-app-modal="true"` is the app-owned contract checked by
    // practice-page keyboard guards (see keyboard-guards.ts → isModalOpen).
    expect(dialog).toHaveAttribute('data-app-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
  });

  it('should not call onConfirm when non-Escape key is pressed', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<UnsavedChangesDialog open={true} onConfirm={onConfirm} onCancel={onCancel} />);

    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
