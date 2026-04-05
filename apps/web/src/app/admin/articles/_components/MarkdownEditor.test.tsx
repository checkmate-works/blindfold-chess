import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MarkdownEditor } from './MarkdownEditor';

// Mock MarkdownRenderer used in preview mode
vi.mock('@/app/_components/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown-renderer">{content}</div>
  ),
}));

describe('MarkdownEditor', () => {
  // --- Tab switching ---

  it('should render edit mode by default with a textarea', () => {
    render(<MarkdownEditor onChange={vi.fn()} />);

    expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-renderer')).not.toBeInTheDocument();
  });

  it('should switch to preview mode when Preview tab is clicked', () => {
    render(<MarkdownEditor defaultContent="# Hello" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.queryByTestId('markdown-editor')).not.toBeInTheDocument();
    expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-renderer')).toHaveTextContent('# Hello');
  });

  it('should switch back to edit mode when Edit tab is clicked', () => {
    render(<MarkdownEditor defaultContent="# Hello" onChange={vi.fn()} />);

    // Switch to preview first
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.queryByTestId('markdown-editor')).not.toBeInTheDocument();

    // Switch back to edit
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-renderer')).not.toBeInTheDocument();
  });

  it('should use custom tab labels when provided', () => {
    render(
      <MarkdownEditor onChange={vi.fn()} tabEditLabel="Bearbeiten" tabPreviewLabel="Vorschau" />
    );

    expect(screen.getByRole('button', { name: 'Bearbeiten' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vorschau' })).toBeInTheDocument();
  });

  // --- Text input and onChange ---

  it('should call onChange when text is entered', () => {
    const handleChange = vi.fn();
    render(<MarkdownEditor onChange={handleChange} />);

    fireEvent.change(screen.getByTestId('markdown-editor'), {
      target: { value: '# New Content' },
    });

    expect(handleChange).toHaveBeenCalledWith('# New Content');
  });

  it('should call onChange on every change', () => {
    const handleChange = vi.fn();
    render(<MarkdownEditor onChange={handleChange} />);

    const textarea = screen.getByTestId('markdown-editor');
    fireEvent.change(textarea, { target: { value: 'first' } });
    fireEvent.change(textarea, { target: { value: 'second' } });
    fireEvent.change(textarea, { target: { value: 'third' } });

    expect(handleChange).toHaveBeenCalledTimes(3);
    expect(handleChange).toHaveBeenNthCalledWith(1, 'first');
    expect(handleChange).toHaveBeenNthCalledWith(2, 'second');
    expect(handleChange).toHaveBeenNthCalledWith(3, 'third');
  });

  // --- Initial content ---

  it('should display defaultContent in the textarea', () => {
    render(<MarkdownEditor defaultContent="# Existing" onChange={vi.fn()} />);

    expect(screen.getByTestId('markdown-editor')).toHaveValue('# Existing');
  });

  it('should default to empty string when defaultContent is not provided', () => {
    render(<MarkdownEditor onChange={vi.fn()} />);

    expect(screen.getByTestId('markdown-editor')).toHaveValue('');
  });

  // --- Preview reflects latest content ---

  it('should reflect edited content in preview mode', () => {
    render(<MarkdownEditor defaultContent="" onChange={vi.fn()} />);

    // Type some content
    fireEvent.change(screen.getByTestId('markdown-editor'), {
      target: { value: '**bold text**' },
    });

    // Switch to preview
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.getByTestId('markdown-renderer')).toHaveTextContent('**bold text**');
  });

  it('should preserve content when switching between edit and preview', () => {
    render(<MarkdownEditor defaultContent="# Title" onChange={vi.fn()} />);

    // Edit
    fireEvent.change(screen.getByTestId('markdown-editor'), {
      target: { value: '# Updated Title' },
    });

    // Preview
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByTestId('markdown-renderer')).toHaveTextContent('# Updated Title');

    // Back to edit
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByTestId('markdown-editor')).toHaveValue('# Updated Title');
  });

  // --- Preview with empty content ---

  it('should show placeholder text in preview when content is empty', () => {
    render(
      <MarkdownEditor defaultContent="" onChange={vi.fn()} placeholder="Write something..." />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    // When content is empty, placeholder is displayed instead of MarkdownRenderer
    expect(screen.queryByTestId('markdown-renderer')).not.toBeInTheDocument();
    expect(screen.getByText('Write something...')).toBeInTheDocument();
  });

  it('should show MarkdownRenderer in preview when content is not empty', () => {
    render(
      <MarkdownEditor
        defaultContent="some content"
        onChange={vi.fn()}
        placeholder="Write something..."
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument();
    expect(screen.queryByText('Write something...')).not.toBeInTheDocument();
  });

  // --- Accessibility ---

  it('should apply placeholder to textarea', () => {
    render(<MarkdownEditor onChange={vi.fn()} placeholder="Enter markdown here..." />);

    expect(screen.getByTestId('markdown-editor')).toHaveAttribute(
      'placeholder',
      'Enter markdown here...'
    );
  });

  it('should apply aria-label to textarea', () => {
    render(<MarkdownEditor onChange={vi.fn()} ariaLabel="Article content" />);

    expect(screen.getByTestId('markdown-editor')).toHaveAttribute('aria-label', 'Article content');
  });

  // --- Edge cases: special characters ---

  it('should handle content with special characters', () => {
    const handleChange = vi.fn();
    const specialContent =
      '# Title\n\n```js\nconst x = "<div>&amp;</div>";\n```\n\n| Col1 | Col2 |\n|------|------|\n| a    | b    |';

    render(<MarkdownEditor onChange={handleChange} />);

    fireEvent.change(screen.getByTestId('markdown-editor'), {
      target: { value: specialContent },
    });

    expect(handleChange).toHaveBeenCalledWith(specialContent);
  });

  it('should handle content with unicode and emoji', () => {
    const handleChange = vi.fn();
    const unicodeContent = '# Japanese text\n\nABCDEF';

    render(<MarkdownEditor onChange={handleChange} />);

    fireEvent.change(screen.getByTestId('markdown-editor'), {
      target: { value: unicodeContent },
    });

    expect(handleChange).toHaveBeenCalledWith(unicodeContent);
  });

  it('should handle empty string input', () => {
    const handleChange = vi.fn();
    render(<MarkdownEditor defaultContent="# Hello" onChange={handleChange} />);

    fireEvent.change(screen.getByTestId('markdown-editor'), {
      target: { value: '' },
    });

    expect(handleChange).toHaveBeenCalledWith('');
  });
});
