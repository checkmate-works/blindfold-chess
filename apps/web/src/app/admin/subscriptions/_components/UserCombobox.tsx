'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useCombobox } from 'downshift';

type UserItem = { id: string; username: string };

type UserComboboxProps = {
  initialUser?: UserItem | null;
  currentStatus?: string;
  labels: {
    searchUser: string;
    noResults: string;
    clearFilter: string;
  };
};

export function UserCombobox({ initialUser, currentStatus, labels }: UserComboboxProps) {
  const router = useRouter();
  const [items, setItems] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inputValue, setInputValue] = useState(initialUser?.username ?? '');

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  function buildHref(userId?: string) {
    const params = new URLSearchParams();
    if (userId) params.set('user', userId);
    if (currentStatus) params.set('status', currentStatus);
    const qs = params.toString();
    return qs ? `/admin/subscriptions?${qs}` : '/admin/subscriptions';
  }

  async function fetchUsers(query: string) {
    if (query.length < 1) {
      setItems([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setItems(data.users ?? []);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  const {
    isOpen,
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
    selectedItem,
    reset,
  } = useCombobox({
    items,
    initialSelectedItem: initialUser ?? undefined,
    itemToString: (item) => item?.username ?? '',
    onInputValueChange: ({ inputValue: newValue }) => {
      setInputValue(newValue ?? '');
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        fetchUsers(newValue ?? '');
      }, 300);
    },
    onSelectedItemChange: ({ selectedItem: item }) => {
      if (item) {
        router.push(buildHref(item.id));
      }
    },
  });

  function handleClear() {
    reset();
    setItems([]);
    router.push(buildHref());
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-1">{labels.searchUser}</label>
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          <input
            {...getInputProps()}
            placeholder={labels.searchUser}
            className="w-full border border-border rounded px-3 py-2 text-sm bg-card"
          />
          {isLoading && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              ...
            </span>
          )}
        </div>
        {(selectedItem || initialUser) && (
          <button
            type="button"
            onClick={handleClear}
            className="px-2 py-2 text-sm text-muted-foreground hover:text-foreground"
            aria-label={labels.clearFilter}
          >
            ×
          </button>
        )}
      </div>
      <ul
        {...getMenuProps()}
        className={`absolute z-10 mt-1 w-full rounded border border-border bg-card shadow-lg ${
          isOpen && (items.length > 0 || (!isLoading && inputValue.length > 0)) ? '' : 'hidden'
        }`}
      >
        {isOpen &&
          items.length > 0 &&
          items.map((item, index) => (
            <li
              key={item.id}
              {...getItemProps({ item, index })}
              className={`px-3 py-2 text-sm cursor-pointer ${
                highlightedIndex === index ? 'bg-primary text-primary-foreground' : ''
              }`}
            >
              {item.username}
            </li>
          ))}
        {isOpen && !isLoading && items.length === 0 && inputValue.length > 0 && (
          <li className="px-3 py-2 text-sm text-muted-foreground">{labels.noResults}</li>
        )}
      </ul>
    </div>
  );
}
