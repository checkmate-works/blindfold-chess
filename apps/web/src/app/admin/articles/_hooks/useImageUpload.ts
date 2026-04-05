'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Editor } from '@tiptap/core';

import { IMAGE_CLASS } from '../_lib/constants';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

type UseImageUploadOptions = {
  editor: Editor | null;
  articleId?: string;
  onImageUploadError?: (message: string) => void;
};

/**
 * Hook that manages image upload lifecycle for the Tiptap article editor.
 *
 * Upload flow:
 * 1. Insert a transparent 1x1 GIF placeholder node into the editor at cursor position.
 * 2. POST the file as multipart/form-data to `/api/admin/articles/[id]/images`.
 * 3. On success, replace the placeholder with the final Supabase Storage public URL.
 * 4. On failure, remove the placeholder and show an error toast.
 *
 * @remarks
 * - Upload is disabled until the article has been saved (no `articleId` yet),
 *   because images are stored under `article-images/{articleId}/` in Supabase Storage.
 * - Max file size: 5 MB. Accepted types: JPEG, PNG, WebP, SVG.
 * - Only one image is uploaded at a time (first file from the input/drop).
 * - Supports drag-and-drop and paste via editor `handleDrop` / `handlePaste` props.
 */
export function useImageUpload({ editor, articleId, onImageUploadError }: UseImageUploadOptions) {
  const [uploadCount, setUploadCount] = useState(0);
  const isUploadingImage = uploadCount > 0;
  const imageUploadEnabled = !!articleId;
  const editorRef = useRef<Editor | null>(null);

  // Keep editor ref in sync with the latest editor instance
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const uploadImage = useCallback(
    async (file: File) => {
      if (!articleId || !imageUploadEnabled) return;

      if (file.size > MAX_FILE_SIZE) {
        onImageUploadError?.('ファイルサイズが大きすぎます（最大5MB）');
        return;
      }

      setUploadCount((c) => c + 1);

      const placeholderId = `upload-${Date.now()}`;
      const placeholderAttrs = {
        src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        alt: 'Uploading...',
        title: placeholderId,
        class: 'tiptap-image-placeholder',
      };

      const currentEditor = editorRef.current;
      if (!currentEditor) {
        setUploadCount((c) => c - 1);
        return;
      }

      currentEditor.chain().focus().setImage(placeholderAttrs).run();

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
          removePlaceholderImage(currentEditor, placeholderId);
          onImageUploadError?.(data.error ?? 'Upload failed');
          return;
        }

        const image = await res.json();
        replacePlaceholderImage(currentEditor, placeholderId, image.publicUrl, image.altText ?? '');
      } catch {
        removePlaceholderImage(currentEditor, placeholderId);
        onImageUploadError?.('Upload failed');
      } finally {
        setUploadCount((c) => c - 1);
      }
    },
    [articleId, imageUploadEnabled, onImageUploadError]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        if (ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          uploadImage(file);
          break; // Upload one at a time
        }
      }
    },
    [uploadImage]
  );

  return {
    uploadCount,
    isUploadingImage,
    imageUploadEnabled,
    handleFiles,
    acceptedImageTypes: ACCEPTED_IMAGE_TYPES,
  };
}

/**
 * Find and remove a placeholder image node identified by its title attribute.
 */
function removePlaceholderImage(editor: Editor, placeholderId: string) {
  const { doc, tr } = editor.state;
  doc.descendants((node, pos) => {
    if (node.type.name === 'image' && node.attrs.title === placeholderId) {
      tr.delete(pos, pos + node.nodeSize);
      return false;
    }
  });
  if (tr.docChanged) {
    editor.view.dispatch(tr);
  }
}

/**
 * Replace a placeholder image node with the actual uploaded image.
 */
function replacePlaceholderImage(editor: Editor, placeholderId: string, src: string, alt: string) {
  const { doc, tr } = editor.state;
  doc.descendants((node, pos) => {
    if (node.type.name === 'image' && node.attrs.title === placeholderId) {
      tr.setNodeMarkup(pos, undefined, {
        src,
        alt,
        title: null,
        class: IMAGE_CLASS,
        size: 'large',
      });
      return false;
    }
  });
  if (tr.docChanged) {
    editor.view.dispatch(tr);
  }
}
