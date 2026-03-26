'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Editor } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import {
  LuBold,
  LuCode,
  LuHeading2,
  LuHeading3,
  LuImage,
  LuItalic,
  LuLink,
  LuList,
  LuListOrdered,
  LuLoader,
  LuMinus,
  LuPlus,
  LuQuote,
  LuStrikethrough,
  LuUnlink,
} from 'react-icons/lu';

import type { TiptapJsonContent } from '../_lib/types';
import './tiptap-editor.css';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const IMAGE_CLASS = 'rounded max-w-full';

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
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [plusMenuTop, setPlusMenuTop] = useState(0);
  const [plusMenuVisible, setPlusMenuVisible] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const isUploadingImage = uploadCount > 0;
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const imageUploadEnabled = !!articleId;

  const uploadImage = useCallback(
    async (file: File) => {
      if (!articleId || !imageUploadEnabled) return;

      if (file.size > MAX_FILE_SIZE) {
        onImageUploadError?.('ファイルサイズが大きすぎます（最大5MB）');
        return;
      }

      setUploadCount((c) => c + 1);

      // Insert a placeholder paragraph while uploading
      const placeholderId = `upload-${Date.now()}`;
      const placeholderAttrs = {
        src: '',
        alt: 'Uploading...',
        title: placeholderId,
        class: 'tiptap-image-placeholder',
      };

      // We need a reference to the current editor instance
      // This will be called from within editor context or from callbacks that have access
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
          // Remove placeholder
          removePlaceholderImage(currentEditor, placeholderId);
          onImageUploadError?.(data.error ?? 'Upload failed');
          return;
        }

        const image = await res.json();
        // Replace placeholder with actual image
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

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline' },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: IMAGE_CLASS,
        },
      }),
    ],
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
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return false;
        event.preventDefault();
        handleFiles(files);
        return true;
      },
      handlePaste: (_view, event) => {
        if (!imageUploadEnabled) return false;
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (ACCEPTED_IMAGE_TYPES.includes(item.type)) {
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

  // Keep a ref to the editor for use in async callbacks
  const editorRef = useRef(editor);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Track whether cursor is on an empty paragraph and position the "+" button
  useEffect(() => {
    if (!editor || !editorContainerRef.current) return;

    const updatePosition = () => {
      const { selection } = editor.state;
      const { $from } = selection;
      const node = $from.parent;
      const isEmptyParagraph = node.type.name === 'paragraph' && node.content.size === 0;

      if (!isEmptyParagraph || !editorContainerRef.current) {
        setPlusMenuVisible(false);
        setShowPlusMenu(false);
        return;
      }

      try {
        const coords = editor.view.coordsAtPos(selection.from);
        const containerRect = editorContainerRef.current.getBoundingClientRect();
        setPlusMenuTop(coords.top - containerRect.top);
        setPlusMenuVisible(true);
      } catch {
        setPlusMenuVisible(false);
        setShowPlusMenu(false);
      }
    };

    editor.on('selectionUpdate', updatePosition);
    editor.on('update', updatePosition);
    // Initial position check
    updatePosition();

    return () => {
      editor.off('selectionUpdate', updatePosition);
      editor.off('update', updatePosition);
    };
  }, [editor]);

  // Close menu on outside click
  useEffect(() => {
    if (!showPlusMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        plusButtonRef.current &&
        !plusButtonRef.current.contains(e.target as Node)
      ) {
        setShowPlusMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPlusMenu]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href ?? '';
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  // Execute a block-type action from the "+" menu
  const executeMenuAction = useCallback((action: () => void) => {
    action();
    setShowPlusMenu(false);
  }, []);

  if (!editor) {
    return null;
  }

  const menuItems = [
    {
      icon: <LuHeading2 size={16} />,
      label: '見出し2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      icon: <LuHeading3 size={16} />,
      label: '見出し3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      icon: <LuList size={16} />,
      label: '箇条書きリスト',
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      icon: <LuListOrdered size={16} />,
      label: '番号付きリスト',
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      icon: <LuQuote size={16} />,
      label: '引用',
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      icon: <LuMinus size={16} />,
      label: '区切り線',
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      icon: isUploadingImage ? (
        <LuLoader size={16} className="animate-spin" />
      ) : (
        <LuImage size={16} />
      ),
      label: '画像',
      action: () => {
        imageInputRef.current?.click();
      },
      disabled: !imageUploadEnabled || isUploadingImage,
    },
  ];

  return (
    <div className="relative flex flex-col flex-1" ref={editorContainerRef}>
      {/* Floating "+" button and menu */}
      {plusMenuVisible && (
        <div className="absolute left-1 z-10" style={{ top: plusMenuTop }}>
          <button
            ref={plusButtonRef}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowPlusMenu((prev) => !prev)}
            className="flex items-center justify-center w-7 h-7 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary shadow-sm transition-colors"
            aria-label="ブロックを追加"
          >
            <LuPlus size={18} />
          </button>

          {showPlusMenu && (
            <div
              ref={menuRef}
              className="absolute left-0 top-8 w-52 rounded-lg border border-border bg-card shadow-lg py-1 z-20"
            >
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={item.disabled}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeMenuAction(item.action)}
                  className="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-left text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="text-muted-foreground">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bubble menu for inline formatting */}
      <BubbleMenu editor={editor}>
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card px-1 py-0.5 shadow-md">
          <BubbleButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
          >
            <LuBold size={14} />
          </BubbleButton>
          <BubbleButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
          >
            <LuItalic size={14} />
          </BubbleButton>
          <BubbleButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
          >
            <LuStrikethrough size={14} />
          </BubbleButton>
          <BubbleButton onClick={setLink} active={editor.isActive('link')}>
            <LuLink size={14} />
          </BubbleButton>
          {editor.isActive('link') && (
            <BubbleButton onClick={() => editor.chain().focus().unsetLink().run()} active={false}>
              <LuUnlink size={14} />
            </BubbleButton>
          )}
          <BubbleButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
          >
            <LuCode size={14} />
          </BubbleButton>
        </div>
      </BubbleMenu>

      {/* Editor content */}
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />

      {/* Hidden file input for image upload */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFiles([file]);
          }
          e.target.value = '';
        }}
        className="hidden"
      />
    </div>
  );
}

/**
 * Find and remove a placeholder image node identified by its title attribute.
 * Uses a single transaction from the same state snapshot to avoid stale pos issues.
 */
function removePlaceholderImage(editor: Editor, placeholderId: string) {
  const { doc, tr } = editor.state;
  doc.descendants((node, pos) => {
    if (node.type.name === 'image' && node.attrs.title === placeholderId) {
      tr.delete(pos, pos + node.nodeSize);
      return false; // stop traversal
    }
  });
  if (tr.docChanged) {
    editor.view.dispatch(tr);
  }
}

/**
 * Replace a placeholder image node with the actual uploaded image.
 * Uses a single transaction from the same state snapshot to avoid stale pos issues.
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
      });
      return false; // stop traversal
    }
  });
  if (tr.docChanged) {
    editor.view.dispatch(tr);
  }
}

function BubbleButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-1 rounded transition-colors ${
        active
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
      }`}
    >
      {children}
    </button>
  );
}
