'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Editor } from '@tiptap/core';
import {
  LuHeading2,
  LuHeading3,
  LuImage,
  LuList,
  LuListOrdered,
  LuLoader,
  LuMinus,
  LuPlus,
  LuQuote,
  LuYoutube,
} from 'react-icons/lu';

import { extractTweetId } from '../_lib/x-utils';

type PlusMenuProps = {
  editor: Editor;
  containerRef: React.RefObject<HTMLDivElement | null>;
  imageUploadEnabled: boolean;
  isUploadingImage: boolean;
  onImageClick: () => void;
};

export function PlusMenu({
  editor,
  containerRef,
  imageUploadEnabled,
  isUploadingImage,
  onImageClick,
}: PlusMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuTop, setMenuTop] = useState(0);
  const [visible, setVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);

  // Track whether cursor is on an empty paragraph and position the "+" button
  useEffect(() => {
    if (!containerRef.current) return;

    const updatePosition = () => {
      const { selection } = editor.state;
      const { $from } = selection;
      const node = $from.parent;
      const isEmptyParagraph = node.type.name === 'paragraph' && node.content.size === 0;

      if (!isEmptyParagraph || !containerRef.current) {
        setVisible(false);
        setShowMenu(false);
        return;
      }

      try {
        const coords = editor.view.coordsAtPos(selection.from);
        const containerRect = containerRef.current.getBoundingClientRect();
        setMenuTop(coords.top - containerRect.top);
        setVisible(true);
      } catch {
        setVisible(false);
        setShowMenu(false);
      }
    };

    editor.on('selectionUpdate', updatePosition);
    editor.on('update', updatePosition);
    updatePosition();

    return () => {
      editor.off('selectionUpdate', updatePosition);
      editor.off('update', updatePosition);
    };
  }, [editor, containerRef]);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        plusButtonRef.current &&
        !plusButtonRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const executeMenuAction = useCallback((action: () => void) => {
    action();
    setShowMenu(false);
  }, []);

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
      action: onImageClick,
      disabled: !imageUploadEnabled || isUploadingImage,
    },
    {
      icon: <LuYoutube size={16} />,
      label: 'YouTube',
      action: () => {
        const url = window.prompt('YouTube URLを入力してください');
        if (!url) return;
        editor.commands.setYoutubeVideo({ src: url });
      },
    },
    {
      icon: <span style={{ fontSize: 14, fontWeight: 700 }}>𝕏</span>,
      label: 'X',
      action: () => {
        const url = window.prompt('X (旧Twitter) URLを入力してください');
        if (!url) return;
        const tweetId = extractTweetId(url);
        if (!tweetId) {
          window.alert('有効なX URLを入力してください');
          return;
        }
        editor.commands.setXEmbed({ tweetId, url });
      },
    },
  ];

  if (!visible) return null;

  return (
    <div className="absolute left-1 z-10" style={{ top: menuTop }}>
      <button
        ref={plusButtonRef}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setShowMenu((prev) => !prev)}
        className="flex items-center justify-center w-7 h-7 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary shadow-sm transition-colors"
        aria-label="ブロックを追加"
      >
        <LuPlus size={18} />
      </button>

      {showMenu && (
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
  );
}
