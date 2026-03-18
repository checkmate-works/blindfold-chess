'use client';

import { useState } from 'react';

import { RatingFaceIcon } from '@blindfold-chess/icons';
import type { RatingFaceLevel } from '@blindfold-chess/icons';

const RATING_FACE_COLORS: Record<RatingFaceLevel, string> = {
  1: '#7C3AED',
  2: '#60A5FA',
  3: '#F59E0B',
  4: '#EF4444',
  5: '#EC4899',
};

type Props = {
  name: string;
  label: string;
  labels: Record<string, string>;
  onChange?: (hasValue: boolean) => void;
};

export function RatingInput({ name, label, labels, onChange }: Props) {
  const [value, setValue] = useState<number | null>(null);
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  const displayValue = hoveredValue ?? value;
  const displayLabel = displayValue ? labels[String(displayValue)] : null;

  return (
    <div className="space-y-1">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {([1, 2, 3, 4, 5] as const).map((level) => {
          const isActive = displayValue === level;
          const hasSelection = displayValue !== null;
          const faceColor = isActive ? RATING_FACE_COLORS[level] : undefined;

          return (
            <button
              key={level}
              type="button"
              className={`cursor-pointer transition-opacity ${
                hasSelection
                  ? isActive
                    ? 'opacity-100'
                    : 'opacity-30'
                  : 'opacity-100 hover:opacity-80'
              }`}
              onClick={() => {
                const newValue = value === level ? null : level;
                setValue(newValue);
                onChange?.(newValue !== null);
              }}
              onMouseEnter={() => setHoveredValue(level)}
              onMouseLeave={() => setHoveredValue(null)}
              aria-label={`${level} - ${labels[String(level)]}`}
            >
              <RatingFaceIcon level={level as RatingFaceLevel} size={28} faceColor={faceColor} />
            </button>
          );
        })}
        {displayLabel && <span className="ml-2 text-sm text-muted-foreground">{displayLabel}</span>}
      </div>
      <input type="hidden" name={name} value={value ?? ''} />
    </div>
  );
}
