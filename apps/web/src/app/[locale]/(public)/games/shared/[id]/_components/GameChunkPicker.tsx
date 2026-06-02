'use client';

import { useMemo, useState } from 'react';

import { useCombobox } from 'downshift';

import type { ChunkOption } from '@/lib/chunks/types';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

/**
 * Idle cap — mirrors `TagPicker`. Each row renders a 48px mini-board, so cap
 * the no-query list to keep the initial open responsive as the catalog grows.
 */
const IDLE_MAX = 10;

type Props = {
  availableChunks: ChunkOption[];
  /** Chunk ids already linked to this move — hidden from the suggestions. */
  linkedChunkIds: Set<string>;
  disabled?: boolean;
  onSelect: (chunk: ChunkOption) => void;
  labels: { placeholder: string; noResults: string; moreItemsHint: (count: number) => string };
};

/**
 * Searchable chunk selector for linking a published chunk to a game's move.
 * A focused, chunk-only adaptation of the puzzle/position `TagPicker` combobox:
 * select a chunk → `onSelect` fires (the caller links it via a server action) →
 * the input clears for the next pick.
 */
export function GameChunkPicker({
  availableChunks,
  linkedChunkIds,
  disabled = false,
  onSelect,
  labels,
}: Props) {
  const [inputValue, setInputValue] = useState('');
  const isIdle = inputValue.trim().length === 0;

  const matched = useMemo(() => {
    const q = inputValue.toLowerCase().trim();
    return availableChunks.filter(
      (c) => !linkedChunkIds.has(c.id) && (!q || c.label.toLowerCase().includes(q))
    );
  }, [availableChunks, linkedChunkIds, inputValue]);

  const displayItems = useMemo(
    () => (isIdle ? matched.slice(0, IDLE_MAX) : matched),
    [matched, isIdle]
  );
  const hiddenCount = isIdle ? Math.max(0, matched.length - IDLE_MAX) : 0;

  const { isOpen, getMenuProps, getInputProps, getItemProps, highlightedIndex, openMenu } =
    useCombobox<ChunkOption>({
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
              onSelect(selectedItem);
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
    <div className="relative">
      <input
        {...getInputProps({
          onFocus: () => {
            if (!isOpen) openMenu();
          },
          placeholder: labels.placeholder,
          disabled,
        })}
        className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-foreground disabled:opacity-50"
      />

      <ul
        {...getMenuProps()}
        className={`absolute z-10 mt-1 max-h-96 w-full overflow-auto rounded border border-border bg-card shadow ${
          showMenu ? '' : 'hidden'
        }`}
      >
        {isOpen &&
          displayItems.map((item, index) => (
            <li
              key={item.id}
              {...getItemProps({ item, index })}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${
                highlightedIndex === index ? 'bg-primary text-primary-foreground' : ''
              }`}
            >
              <span
                aria-hidden
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center"
              >
                <BoardThumbnail fen={item.representativeFen} className="h-12 w-12" />
              </span>
              <span className="truncate">{item.label}</span>
            </li>
          ))}
        {isOpen && displayItems.length === 0 && inputValue.length > 0 && (
          <li className="px-3 py-2 text-sm text-muted-foreground">{labels.noResults}</li>
        )}
        {isOpen && hiddenCount > 0 && (
          <li className="border-t border-border px-3 py-2 text-xs italic text-muted-foreground">
            {labels.moreItemsHint(hiddenCount)}
          </li>
        )}
      </ul>
    </div>
  );
}
