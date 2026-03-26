'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
  LuMinus,
  LuPlus,
  LuQuote,
  LuStrikethrough,
  LuUnlink,
} from 'react-icons/lu';

import type { TiptapJsonContent } from '../_lib/types';
import './tiptap-editor.css';

type TiptapEditorProps = {
  initialContent?: TiptapJsonContent | null;
  onChange: (json: TiptapJsonContent) => void;
  placeholder?: string;
  ariaLabel?: string;
};

export function TiptapEditor({
  initialContent,
  onChange,
  placeholder = '',
  ariaLabel,
}: TiptapEditorProps) {
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [plusMenuTop, setPlusMenuTop] = useState(0);
  const [plusMenuVisible, setPlusMenuVisible] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);

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
    },
  });

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
      icon: <LuImage size={16} />,
      label: '画像',
      action: () => {},
      disabled: true,
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
    </div>
  );
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
