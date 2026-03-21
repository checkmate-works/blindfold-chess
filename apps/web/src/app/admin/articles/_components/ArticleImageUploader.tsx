'use client';

import { useCallback, useRef, useState } from 'react';

import { LuCopy, LuImage, LuTrash2 } from 'react-icons/lu';

import type { ArticleImage } from '@/lib/db';

// UI strings are hardcoded in English. The admin UI is English-only and not
// part of the public i18n surface. If admin i18n is added in the future,
// extract these into a labels prop following the ArticleForm pattern.
type ArticleImageUploaderProps = {
  articleId: string;
  initialImages?: ArticleImage[];
  onInsertMarkdown: (markdown: string) => void;
};

export function ArticleImageUploader({
  articleId,
  initialImages = [],
  onInsertMarkdown,
}: ArticleImageUploaderProps) {
  const [images, setImages] = useState<ArticleImage[]>(initialImages);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('altText', file.name.replace(/\.[^.]+$/, ''));

        const res = await fetch(`/api/admin/articles/${articleId}/images`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? 'Upload failed');
          return;
        }

        const image: ArticleImage = await res.json();
        setImages((prev) => [...prev, image]);
        onInsertMarkdown(`![${image.altText ?? ''}](${image.publicUrl})`);
      } catch {
        setError('Upload failed');
      } finally {
        setIsUploading(false);
      }
    },
    [articleId, onInsertMarkdown]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [handleUpload]
  );

  const handleDelete = useCallback(
    async (imageId: string) => {
      setError(null);

      try {
        const res = await fetch(`/api/admin/articles/${articleId}/images`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageId }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? 'Delete failed');
          return;
        }

        setImages((prev) => prev.filter((img) => img.id !== imageId));
      } catch {
        setError('Delete failed');
      }
    },
    [articleId]
  );

  const handleCopyMarkdown = useCallback(
    (image: ArticleImage) => {
      onInsertMarkdown(`![${image.altText ?? ''}](${image.publicUrl})`);
    },
    [onInsertMarkdown]
  );

  return (
    <div className="space-y-3">
      {/* Upload button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-border hover:bg-secondary transition-colors disabled:opacity-50"
        >
          <LuImage size={14} />
          {isUploading ? 'Uploading...' : 'Upload Image'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && <p className="text-red-600 text-xs">{error}</p>}

      {/* Image gallery */}
      {images.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Uploaded Images</h4>
          <div className="space-y-1.5">
            {images.map((image) => (
              <div
                key={image.id}
                className="flex items-center gap-2 p-2 rounded border border-border text-xs"
              >
                {image.contentType === 'image/svg+xml' ? (
                  <div className="w-8 h-8 shrink-0 bg-secondary rounded flex items-center justify-center text-muted-foreground">
                    <LuImage size={14} />
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={image.publicUrl}
                    alt={image.altText ?? ''}
                    className="w-8 h-8 shrink-0 object-cover rounded"
                  />
                )}
                <span className="flex-1 truncate text-muted-foreground">
                  {image.storagePath.split('/').pop()}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyMarkdown(image)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  title="Insert markdown"
                >
                  <LuCopy size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(image.id)}
                  className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                  title="Delete image"
                >
                  <LuTrash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
