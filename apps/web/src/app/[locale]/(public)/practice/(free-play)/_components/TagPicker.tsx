'use client';

import { useMemo, useState } from 'react';

import { useCombobox } from 'downshift';

import type { ChunkOption } from '@/lib/chunks/types';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';
import type { ThemeOption } from '@/lib/themes/types';

import { type TagItem, computeTagSuggestions } from '../_lib/tag-suggestions';
import { SelectedTagCard } from './SelectedTagCard';
import { type TagDetailItem, TagDetailModal } from './TagDetailModal';

type Props = {
  /**
   * Currently selected themes. The parent owns this state — the picker
   * is fully controlled. This makes draft hydration on the create flow
   * straightforward (parent's setState fires; picker re-renders) and
   * keeps the source of truth in one place.
   */
  selectedThemes: ThemeOption[];
  selectedChunks: ChunkOption[];
  availableThemes: ThemeOption[];
  availableChunks: ChunkOption[];
  disabled?: boolean;
  onChange: (themes: ThemeOption[], chunks: ChunkOption[]) => void;
  labels: {
    section: string;
    help?: string;
    placeholder: string;
    badgeTheme: string;
    badgeChunk: string;
    noResults: string;
    remove: (label: string) => string;
    openDetail: (label: string) => string;
    moreItemsHint: (count: number) => string;
    detail: {
      readingPrefix: string;
      noDescription: string;
      viewInGlossary: string;
      viewChunkPage: string;
      detach: string;
      close: string;
    };
  };
};

export function TagPicker({
  selectedThemes,
  selectedChunks,
  availableThemes,
  availableChunks,
  disabled = false,
  onChange,
  labels,
}: Props) {
  const [inputValue, setInputValue] = useState('');
  const [detailItem, setDetailItem] = useState<TagDetailItem | null>(null);

  const selectedThemeIdSet = useMemo(
    () => new Set(selectedThemes.map((t) => t.id)),
    [selectedThemes]
  );
  const selectedChunkIdSet = useMemo(
    () => new Set(selectedChunks.map((c) => c.id)),
    [selectedChunks]
  );

  const { displayItems, hiddenCount } = useMemo(
    () =>
      computeTagSuggestions({
        inputValue,
        availableThemes,
        availableChunks,
        selectedThemeIds: selectedThemeIdSet,
        selectedChunkIds: selectedChunkIdSet,
      }),
    [inputValue, availableThemes, availableChunks, selectedThemeIdSet, selectedChunkIdSet]
  );

  function addItem(item: TagItem) {
    if (item.kind === 'theme') {
      if (selectedThemeIdSet.has(item.id)) return;
      const { kind: _kind, ...themeOption } = item;
      onChange([...selectedThemes, themeOption], selectedChunks);
    } else {
      if (selectedChunkIdSet.has(item.id)) return;
      const { kind: _kind, ...chunkOption } = item;
      onChange(selectedThemes, [...selectedChunks, chunkOption]);
    }
  }

  function removeTheme(id: string) {
    onChange(
      selectedThemes.filter((t) => t.id !== id),
      selectedChunks
    );
  }

  function removeChunk(id: string) {
    onChange(
      selectedThemes,
      selectedChunks.filter((c) => c.id !== id)
    );
  }

  function handleDetach(item: TagDetailItem) {
    if (item.kind === 'theme') removeTheme(item.id);
    else removeChunk(item.id);
  }

  const { isOpen, getMenuProps, getInputProps, getItemProps, highlightedIndex, openMenu } =
    useCombobox<TagItem>({
      items: displayItems,
      inputValue,
      selectedItem: null,
      defaultHighlightedIndex: 0,
      itemToString: (item) => (item ? item.label : ''),
      stateReducer: (_state, { changes, type }) => {
        switch (type) {
          case useCombobox.stateChangeTypes.InputKeyDownEnter:
          case useCombobox.stateChangeTypes.ItemClick:
            return { ...changes, isOpen: true, highlightedIndex: 0, inputValue: '' };
          // Downshift's default InputClick action toggles isOpen, which
          // collides with our onFocus → openMenu() flow: focus opens the
          // menu, then the click that caused the focus immediately
          // toggles it closed. Override to always open instead — clicks
          // outside the input still close the menu via the standard
          // outside-click handler.
          case useCombobox.stateChangeTypes.InputClick:
            return { ...changes, isOpen: true };
          default:
            return changes;
        }
      },
      onStateChange: ({ inputValue: nextInput, type, selectedItem }) => {
        switch (type) {
          case useCombobox.stateChangeTypes.InputKeyDownEnter:
          case useCombobox.stateChangeTypes.ItemClick:
            if (selectedItem) {
              addItem(selectedItem);
              setInputValue('');
            }
            break;
          case useCombobox.stateChangeTypes.InputChange:
            setInputValue(nextInput ?? '');
            break;
          default:
            break;
        }
      },
    });

  const showMenu =
    isOpen && (displayItems.length > 0 || (inputValue.length > 0 && displayItems.length === 0));

  return (
    <div>
      <p className="block text-sm font-medium mb-1">{labels.section}</p>
      {labels.help && <p className="text-xs text-muted-foreground mb-2">{labels.help}</p>}

      {(selectedThemes.length > 0 || selectedChunks.length > 0) && (
        <ul className="mb-3 flex flex-wrap gap-3">
          {selectedThemes.map((item) => (
            <SelectedTagCard
              key={`theme-${item.id}`}
              kind="theme"
              label={item.label}
              previewFen={item.previewFen}
              badgeText={labels.badgeTheme}
              disabled={disabled}
              openDetailLabel={labels.openDetail(item.label)}
              removeLabel={labels.remove(item.label)}
              onOpen={() => setDetailItem({ kind: 'theme', ...item })}
              onRemove={() => removeTheme(item.id)}
            />
          ))}
          {selectedChunks.map((item) => (
            <SelectedTagCard
              key={`chunk-${item.id}`}
              kind="chunk"
              label={item.label}
              previewFen={item.representativeFen}
              badgeText={labels.badgeChunk}
              disabled={disabled}
              openDetailLabel={labels.openDetail(item.label)}
              removeLabel={labels.remove(item.label)}
              onOpen={() => setDetailItem({ kind: 'chunk', ...item })}
              onRemove={() => removeChunk(item.id)}
            />
          ))}
        </ul>
      )}

      <div className="relative">
        <input
          {...getInputProps({
            onFocus: () => {
              if (!isOpen) openMenu();
            },
            placeholder: labels.placeholder,
            disabled,
          })}
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground disabled:opacity-50"
        />

        <ul
          {...getMenuProps()}
          className={`absolute z-10 mt-1 w-full max-h-96 overflow-auto rounded border border-border bg-card shadow ${
            showMenu ? '' : 'hidden'
          }`}
        >
          {isOpen &&
            displayItems.length > 0 &&
            displayItems.map((item, index) => {
              const isHighlighted = highlightedIndex === index;
              const previewFen = item.kind === 'chunk' ? item.representativeFen : item.previewFen;
              return (
                <li
                  key={`${item.kind}-${item.id}`}
                  {...getItemProps({ item, index })}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-3 ${
                    isHighlighted ? 'bg-primary text-primary-foreground' : ''
                  }`}
                >
                  {/* Reserve the thumbnail slot even when previewFen is
                      null so that text aligns vertically across rows
                      regardless of which items have boards (most theme
                      rows do not — abstract concepts like "Pin" have no
                      single canonical position). */}
                  <span
                    aria-hidden
                    className="flex-shrink-0 w-12 h-12 flex items-center justify-center"
                  >
                    {previewFen ? <BoardThumbnail fen={previewFen} className="w-12 h-12" /> : null}
                  </span>
                  <span className="flex-1 flex items-center gap-2 min-w-0">
                    <span
                      className={`text-[10px] uppercase tracking-wider rounded px-1 flex-shrink-0 ${
                        isHighlighted
                          ? 'bg-primary-foreground/20'
                          : item.kind === 'theme'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      {item.kind === 'theme' ? labels.badgeTheme : labels.badgeChunk}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </span>
                </li>
              );
            })}
          {isOpen && displayItems.length === 0 && inputValue.length > 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">{labels.noResults}</li>
          )}
          {isOpen && hiddenCount > 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground italic border-t border-border">
              {labels.moreItemsHint(hiddenCount)}
            </li>
          )}
        </ul>
      </div>

      <TagDetailModal
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onDetach={handleDetach}
        labels={{
          badgeTheme: labels.badgeTheme,
          badgeChunk: labels.badgeChunk,
          ...labels.detail,
        }}
      />
    </div>
  );
}
