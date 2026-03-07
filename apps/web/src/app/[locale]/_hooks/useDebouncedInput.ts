'use client';

import { useEffect, useRef, useState } from 'react';

type UseDebouncedInputOptions = {
  value: string;
  delay?: number;
};

export function useDebouncedInput({ value, delay = 1000 }: UseDebouncedInputOptions) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPasteRef = useRef(false);

  useEffect(() => {
    // If this was a paste operation, update immediately
    if (isPasteRef.current) {
      setDebouncedValue(value);
      isPasteRef.current = false;
      return;
    }

    // Otherwise, debounce the update
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, delay]);

  const handlePaste = () => {
    isPasteRef.current = true;
  };

  return { debouncedValue, handlePaste };
}
