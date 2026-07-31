'use client';

import { useRef } from 'react';

import { EditorContent, useEditor } from '@tiptap/react';

import { useImageUpload } from '../_hooks/useImageUpload';
import type { TiptapJsonContent } from '../_lib/types';
import { BubbleToolbar } from './BubbleToolbar';
import { PlusMenu } from './PlusMenu';
import './tiptap-editor.css';
import { createTiptapExtensions } from './tiptap-extensions';

/**
 * Props for the Tiptap rich-text editor component.
 *
 * @remarks
 * `articleId` controls whether image upload is enabled. New (unsaved) articles
 * have no `articleId`, so images cannot be uploaded until the first draft save.
 * This is because images are stored in Supabase Storage under the article's ID
 * prefix and tracked in the `article_images` table with a foreign key.
 */
type TiptapEditorProps = {
  initialContent?: TiptapJsonContent | null;
  onChange: (json: TiptapJsonContent) => void;
  placeholder?: string;
  ariaLabel?: string;
  articleId?: string;
  onImageUploadError?: (message: string) => void;
};

export function TiptapEditor({
  initialContent,
  onChange,
  placeholder = '',
  ariaLabel,
  articleId,
  onImageUploadError,
}: TiptapEditorProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: createTiptapExtensions({ placeholder }),
    content: initialContent ?? undefined,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getJSON() as TiptapJsonContent);
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-12 py-6',
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved || !imageUploadEnabled) return false;
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const file = files[0];
        if (!acceptedImageTypes.includes(file.type)) return false;
        event.preventDefault();
        handleFiles(files);
        return true;
      },
      handlePaste: (_view, event) => {
        if (!imageUploadEnabled) return false;
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (acceptedImageTypes.includes(item.type)) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              handleFiles([file]);
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  const { isUploadingImage, imageUploadEnabled, handleFiles, acceptedImageTypes } = useImageUpload({
    editor,
    articleId,
    onImageUploadError,
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="relative flex flex-col flex-1" ref={editorContainerRef}>
      <PlusMenu
        editor={editor}
        containerRef={editorContainerRef}
        imageUploadEnabled={imageUploadEnabled}
        isUploadingImage={isUploadingImage}
        onImageClick={() => imageInputRef.current?.click()}
      />

      <BubbleToolbar editor={editor} />

      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />

      {/* Hidden file input for image upload */}
      <input
        ref={imageInputRef}
        type="file"
        accept={acceptedImageTypes.join(',')}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFiles([file]);
          }
          // eslint-disable-next-line no-param-reassign -- standard DOM idiom: clearing the file input so re-selecting the same file re-fires change
          e.target.value = '';
        }}
        className="hidden"
      />
    </div>
  );
}
