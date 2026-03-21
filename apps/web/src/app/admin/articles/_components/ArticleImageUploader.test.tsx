import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ArticleImage } from '@/lib/db';

import { ArticleImageUploader } from './ArticleImageUploader';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const testArticleId = 'art-00000000-0000-0000-0000-000000000001';

function makeImage(overrides: Partial<ArticleImage> = {}): ArticleImage {
  return {
    id: 'img-001',
    articleId: testArticleId,
    storagePath: `${testArticleId}/1700000000000.png`,
    publicUrl: 'https://example.com/storage/article-images/test.png',
    altText: 'test image',
    contentType: 'image/png',
    fileSize: 1024,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('ArticleImageUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render upload button', () => {
    const onInsertMarkdown = vi.fn();

    render(<ArticleImageUploader articleId={testArticleId} onInsertMarkdown={onInsertMarkdown} />);

    expect(screen.getByRole('button', { name: /Upload Image/i })).toBeInTheDocument();
  });

  it('should render hidden file input with correct accept types', () => {
    const onInsertMarkdown = vi.fn();

    const { container } = render(
      <ArticleImageUploader articleId={testArticleId} onInsertMarkdown={onInsertMarkdown} />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.accept).toBe('image/jpeg,image/png,image/webp,image/svg+xml');
    expect(fileInput.className).toContain('hidden');
  });

  it('should display initial images when provided', () => {
    const onInsertMarkdown = vi.fn();
    const images = [
      makeImage({ id: 'img-001', storagePath: `${testArticleId}/1.png` }),
      makeImage({
        id: 'img-002',
        storagePath: `${testArticleId}/2.jpg`,
        contentType: 'image/jpeg',
      }),
    ];

    render(
      <ArticleImageUploader
        articleId={testArticleId}
        initialImages={images}
        onInsertMarkdown={onInsertMarkdown}
      />
    );

    expect(screen.getByText('Uploaded Images')).toBeInTheDocument();
    expect(screen.getByText('1.png')).toBeInTheDocument();
    expect(screen.getByText('2.jpg')).toBeInTheDocument();
  });

  it('should not display image gallery when no images exist', () => {
    const onInsertMarkdown = vi.fn();

    render(<ArticleImageUploader articleId={testArticleId} onInsertMarkdown={onInsertMarkdown} />);

    expect(screen.queryByText('Uploaded Images')).not.toBeInTheDocument();
  });

  it('should call onInsertMarkdown when copy markdown button is clicked', () => {
    const onInsertMarkdown = vi.fn();
    const image = makeImage();

    render(
      <ArticleImageUploader
        articleId={testArticleId}
        initialImages={[image]}
        onInsertMarkdown={onInsertMarkdown}
      />
    );

    const copyButton = screen.getByTitle('Insert markdown');
    fireEvent.click(copyButton);

    expect(onInsertMarkdown).toHaveBeenCalledWith(`![${image.altText}](${image.publicUrl})`);
  });

  it('should upload file and add to gallery on successful upload', async () => {
    const onInsertMarkdown = vi.fn();
    const newImage = makeImage({ id: 'img-new', altText: 'uploaded' });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(newImage),
    });

    const { container } = render(
      <ArticleImageUploader articleId={testArticleId} onInsertMarkdown={onInsertMarkdown} />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-content'], 'photo.png', { type: 'image/png' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/admin/articles/${testArticleId}/images`,
      expect.objectContaining({ method: 'POST' })
    );
    expect(onInsertMarkdown).toHaveBeenCalledWith(`![${newImage.altText}](${newImage.publicUrl})`);
    expect(screen.getByText('Uploaded Images')).toBeInTheDocument();
  });

  it('should display error message on upload failure', async () => {
    const onInsertMarkdown = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'invalid_file_type' }),
    });

    const { container } = render(
      <ArticleImageUploader articleId={testArticleId} onInsertMarkdown={onInsertMarkdown} />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake'], 'bad.txt', { type: 'text/plain' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    expect(screen.getByText('invalid_file_type')).toBeInTheDocument();
    expect(onInsertMarkdown).not.toHaveBeenCalled();
  });

  it('should display generic error when fetch throws', async () => {
    const onInsertMarkdown = vi.fn();

    mockFetch.mockRejectedValueOnce(new Error('network error'));

    const { container } = render(
      <ArticleImageUploader articleId={testArticleId} onInsertMarkdown={onInsertMarkdown} />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake'], 'photo.png', { type: 'image/png' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    expect(screen.getByText('Upload failed')).toBeInTheDocument();
  });

  it('should remove image from gallery on successful delete', async () => {
    const onInsertMarkdown = vi.fn();
    const image = makeImage();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(
      <ArticleImageUploader
        articleId={testArticleId}
        initialImages={[image]}
        onInsertMarkdown={onInsertMarkdown}
      />
    );

    expect(screen.getByText('Uploaded Images')).toBeInTheDocument();

    const deleteButton = screen.getByTitle('Delete image');

    await act(async () => {
      fireEvent.click(deleteButton);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/admin/articles/${testArticleId}/images`,
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ imageId: image.id }),
      })
    );
    expect(screen.queryByText('Uploaded Images')).not.toBeInTheDocument();
  });

  it('should display error and keep image on delete failure', async () => {
    const onInsertMarkdown = vi.fn();
    const image = makeImage();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'image_not_found' }),
    });

    render(
      <ArticleImageUploader
        articleId={testArticleId}
        initialImages={[image]}
        onInsertMarkdown={onInsertMarkdown}
      />
    );

    const deleteButton = screen.getByTitle('Delete image');

    await act(async () => {
      fireEvent.click(deleteButton);
    });

    expect(screen.getByText('image_not_found')).toBeInTheDocument();
    // Image should still be displayed
    expect(screen.getByText('Uploaded Images')).toBeInTheDocument();
  });

  it('should render SVG images with icon placeholder instead of img tag', () => {
    const onInsertMarkdown = vi.fn();
    const svgImage = makeImage({ contentType: 'image/svg+xml' });

    const { container } = render(
      <ArticleImageUploader
        articleId={testArticleId}
        initialImages={[svgImage]}
        onInsertMarkdown={onInsertMarkdown}
      />
    );

    // SVG images should not render an <img> tag
    const imgTags = container.querySelectorAll('img');
    expect(imgTags).toHaveLength(0);
  });

  it('should render non-SVG images with img tag', () => {
    const onInsertMarkdown = vi.fn();
    const pngImage = makeImage({ contentType: 'image/png' });

    const { container } = render(
      <ArticleImageUploader
        articleId={testArticleId}
        initialImages={[pngImage]}
        onInsertMarkdown={onInsertMarkdown}
      />
    );

    const imgTags = container.querySelectorAll('img');
    expect(imgTags).toHaveLength(1);
    expect(imgTags[0].src).toBe(pngImage.publicUrl);
    expect(imgTags[0].alt).toBe(pngImage.altText);
  });
});
