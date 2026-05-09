'use client';

import { useMemo, useState } from 'react';

import { useCombobox } from 'downshift';

import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

import type { ChunkOption, ThemeOption } from '../_lib/load-puzzle-tags';
import { type TagDetailItem, TagDetailModal } from './TagDetailModal';

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
    openDetail: (label: string) => string;
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
  const [detailItem, setDetailItem] = useState<TagDetailItem | null>(null);

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

  function handleDetach(item: TagDetailItem) {
    if (item.kind === 'theme') removeTheme(item.id);
    else removeChunk(item.id);
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
            filteredItems.length > 0 &&
            filteredItems.map((item, index) => {
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
          {isOpen && filteredItems.length === 0 && inputValue.length > 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">{labels.noResults}</li>
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

type SelectedTagCardProps = {
  kind: 'theme' | 'chunk';
  label: string;
  previewFen: string | null;
  badgeText: string;
  disabled: boolean;
  openDetailLabel: string;
  removeLabel: string;
  onOpen: () => void;
  onRemove: () => void;
};

/**
 * Card-style chip showing a selected tag with its preview board.
 * Click the body to open the detail modal; click the corner × to
 * detach. The two buttons are siblings (not nested) to satisfy the
 * "no button-in-button" HTML rule — the × is absolute-positioned over
 * the card via CSS, so a click on it dispatches only its own handler
 * and never reaches the card's onClick.
 */
function SelectedTagCard({
  kind,
  label,
  previewFen,
  badgeText,
  disabled,
  openDetailLabel,
  removeLabel,
  onOpen,
  onRemove,
}: SelectedTagCardProps) {
  return (
    <li className="relative w-40">
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        aria-label={openDetailLabel}
        className="w-full p-2 rounded border border-border bg-card hover:bg-muted/40 transition-colors flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-left"
      >
        <span aria-hidden className="w-32 h-32 flex items-center justify-center">
          {previewFen ? (
            <BoardThumbnail fen={previewFen} className="w-32 h-32" />
          ) : (
            <span className="w-32 h-32 rounded-sm border border-dashed border-border" />
          )}
        </span>
        <span className="w-full flex flex-col gap-1">
          <span
            className={`self-start text-[10px] uppercase tracking-wider rounded px-1 ${
              kind === 'theme'
                ? 'bg-primary/10 text-primary'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {badgeText}
          </span>
          <span className="text-sm text-foreground line-clamp-2 break-words">{label}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={removeLabel}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-card/80 border border-border text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors flex items-center justify-center text-sm leading-none disabled:opacity-30"
      >
        ×
      </button>
    </li>
  );
}
