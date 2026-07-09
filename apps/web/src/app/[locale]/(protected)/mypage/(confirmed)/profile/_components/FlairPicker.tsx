'use client';

import { useEffect, useRef, useState } from 'react';

import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';

import { useDropdownClose } from '@/_hooks/use-dropdown-close';

type EmojiMartData = Record<string, unknown>;

type PickerProps = {
  data: EmojiMartData;
  onEmojiSelect: (emoji: { native: string }) => void;
  theme?: 'light' | 'dark';
  autoFocus?: boolean;
};

const PickerPlaceholder = () => (
  <div className="h-[435px] w-[352px] max-w-full rounded-lg border border-border bg-card" />
);

const Picker = dynamic<PickerProps>(() => import('@emoji-mart/react').then((mod) => mod.default), {
  ssr: false,
  loading: () => <PickerPlaceholder />,
});

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
  const [emojiData, setEmojiData] = useState<EmojiMartData | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || emojiData) {
      return;
    }
    let cancelled = false;
    void import('@emoji-mart/data').then((mod) => {
      if (!cancelled) {
        setEmojiData((mod.default ?? mod) as EmojiMartData);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, emojiData]);

  useDropdownClose(containerRef, isOpen, setIsOpen);

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
        <div className="absolute top-full left-0 mt-1 z-50 max-w-[calc(100vw-2rem)] overflow-x-auto">
          {emojiData ? (
            <Picker
              data={emojiData}
              onEmojiSelect={handleEmojiSelect}
              theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
              autoFocus
            />
          ) : (
            <PickerPlaceholder />
          )}
        </div>
      )}
    </div>
  );
}
