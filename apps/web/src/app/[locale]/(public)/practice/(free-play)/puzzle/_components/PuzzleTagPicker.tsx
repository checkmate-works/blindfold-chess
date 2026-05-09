'use client';

import { useMemo, useState } from 'react';

import { useCombobox } from 'downshift';

import type { ChunkOption, ThemeOption } from '../_lib/load-puzzle-tags';

type ThemeItem = ThemeOption & { kind: 'theme' };
type ChunkItem = ChunkOption & { kind: 'chunk' };
type TagItem = ThemeItem | ChunkItem;

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
  };
};

const toThemeItem = (t: ThemeOption): ThemeItem => ({ ...t, kind: 'theme' });
const toChunkItem = (c: ChunkOption): ChunkItem => ({ ...c, kind: 'chunk' });

export function PuzzleTagPicker({
  selectedThemes,
  selectedChunks,
  availableThemes,
  availableChunks,
  disabled = false,
  onChange,
  labels,
}: Props) {
  const [inputValue, setInputValue] = useState('');

  const selectedThemeIdSet = useMemo(
    () => new Set(selectedThemes.map((t) => t.id)),
    [selectedThemes]
  );
  const selectedChunkIdSet = useMemo(
    () => new Set(selectedChunks.map((c) => c.id)),
    [selectedChunks]
  );

  const filteredItems = useMemo<TagItem[]>(() => {
    const q = inputValue.toLowerCase().trim();
    const matches = (label: string) => !q || label.toLowerCase().includes(q);
    // Themes (curated master vocabulary) lead the suggestions; chunks
    // (UGC) follow. This biases new users toward standard terminology
    // while still surfacing personal patterns.
    const themes: TagItem[] = availableThemes
      .filter((t) => !selectedThemeIdSet.has(t.id) && matches(t.label))
      .map(toThemeItem);
    const chunks: TagItem[] = availableChunks
      .filter((c) => !selectedChunkIdSet.has(c.id) && matches(c.label))
      .map(toChunkItem);
    return [...themes, ...chunks];
  }, [availableThemes, availableChunks, selectedThemeIdSet, selectedChunkIdSet, inputValue]);

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

  const { isOpen, getMenuProps, getInputProps, getItemProps, highlightedIndex, openMenu } =
    useCombobox<TagItem>({
      items: filteredItems,
      inputValue,
      selectedItem: null,
      defaultHighlightedIndex: 0,
      itemToString: (item) => (item ? item.label : ''),
      stateReducer: (_state, { changes, type }) => {
        switch (type) {
          case useCombobox.stateChangeTypes.InputKeyDownEnter:
          case useCombobox.stateChangeTypes.ItemClick:
            return { ...changes, isOpen: true, highlightedIndex: 0, inputValue: '' };
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
    isOpen && (filteredItems.length > 0 || (inputValue.length > 0 && filteredItems.length === 0));

  return (
    <div>
      <p className="block text-sm font-medium mb-1">{labels.section}</p>
      {labels.help && <p className="text-xs text-muted-foreground mb-2">{labels.help}</p>}

      {(selectedThemes.length > 0 || selectedChunks.length > 0) && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {selectedThemes.map((item) => (
            <li
              key={`theme-${item.id}`}
              className="inline-flex items-center gap-1 rounded bg-primary/10 text-primary px-2 py-1 text-xs"
            >
              <span className="text-[10px] uppercase tracking-wider opacity-70">
                {labels.badgeTheme}
              </span>
              <span>{item.label}</span>
              <button
                type="button"
                onClick={() => removeTheme(item.id)}
                aria-label={labels.remove(item.label)}
                disabled={disabled}
                className="ml-1 text-current opacity-60 hover:opacity-100 disabled:opacity-30"
              >
                ×
              </button>
            </li>
          ))}
          {selectedChunks.map((item) => (
            <li
              key={`chunk-${item.id}`}
              className="inline-flex items-center gap-1 rounded bg-secondary text-secondary-foreground px-2 py-1 text-xs"
            >
              <span className="text-[10px] uppercase tracking-wider opacity-70">
                {labels.badgeChunk}
              </span>
              <span>{item.label}</span>
              <button
                type="button"
                onClick={() => removeChunk(item.id)}
                aria-label={labels.remove(item.label)}
                disabled={disabled}
                className="ml-1 text-current opacity-60 hover:opacity-100 disabled:opacity-30"
              >
                ×
              </button>
            </li>
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
          className={`absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded border border-border bg-card shadow ${
            showMenu ? '' : 'hidden'
          }`}
        >
          {isOpen &&
            filteredItems.length > 0 &&
            filteredItems.map((item, index) => {
              const isHighlighted = highlightedIndex === index;
              return (
                <li
                  key={`${item.kind}-${item.id}`}
                  {...getItemProps({ item, index })}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 ${
                    isHighlighted ? 'bg-primary text-primary-foreground' : ''
                  }`}
                >
                  <span
                    className={`text-[10px] uppercase tracking-wider rounded px-1 ${
                      isHighlighted
                        ? 'bg-primary-foreground/20'
                        : item.kind === 'theme'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {item.kind === 'theme' ? labels.badgeTheme : labels.badgeChunk}
                  </span>
                  <span>{item.label}</span>
                </li>
              );
            })}
          {isOpen && filteredItems.length === 0 && inputValue.length > 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">{labels.noResults}</li>
          )}
        </ul>
      </div>
    </div>
  );
}
