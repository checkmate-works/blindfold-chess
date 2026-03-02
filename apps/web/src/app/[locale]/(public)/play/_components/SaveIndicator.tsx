'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

type Props = {
  isSaving: boolean;
  lastSavedAt: Date | null;
};

export function SaveIndicator({ isSaving, lastSavedAt }: Props) {
  const t = useTranslations('play');
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (isSaving) {
      setIsVisible(true);
    } else if (lastSavedAt) {
      setIsVisible(true);
      // Fade out after 3 seconds
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isSaving, lastSavedAt]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`
        text-xs text-foreground bg-card px-2 py-1 rounded shadow-md flex items-center gap-1.5
        transition-opacity duration-300 z-10
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
      style={{ pointerEvents: 'none' }}
    >
      {isSaving ? (
        <>
          <svg
            className="w-3 h-3 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{t('saving')}</span>
        </>
      ) : (
        <>
          <svg
            className="w-3 h-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{t('saved')}</span>
        </>
      )}
    </div>
  );
}
