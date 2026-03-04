'use client';

import { useEffect, useRef, useState } from 'react';

import { useTheme } from 'next-themes';

import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

type Props = {
  value: string;
  onChange: (emoji: string) => void;
  placeholder?: string;
  clearLabel?: string;
};

export function FlairPicker({ value, onChange, placeholder, clearLabel }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  const handleEmojiSelect = (emoji: { native: string }) => {
    onChange(emoji.native);
    setIsOpen(false);
  };

  if (!mounted) {
    return <div className="h-[46px] w-full rounded-lg border border-border bg-card" />;
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors hover:bg-muted/50"
        >
          <span className={value ? 'text-2xl' : 'text-muted-foreground'}>
            {value || placeholder}
          </span>
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={clearLabel}
          >
            &times;
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50">
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
