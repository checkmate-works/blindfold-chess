'use client';

import { useState } from 'react';

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
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`text-2xl transition-colors cursor-pointer ${
              displayValue !== null && star <= displayValue
                ? 'text-amber-500'
                : 'text-muted-foreground/30 hover:text-amber-300'
            }`}
            onClick={() => {
              const newValue = value === star ? null : star;
              setValue(newValue);
              onChange?.(newValue !== null);
            }}
            onMouseEnter={() => setHoveredValue(star)}
            onMouseLeave={() => setHoveredValue(null)}
            aria-label={`${star} - ${labels[String(star)]}`}
          >
            ★
          </button>
        ))}
        {displayLabel && <span className="ml-2 text-sm text-muted-foreground">{displayLabel}</span>}
      </div>
      <input type="hidden" name={name} value={value ?? ''} />
    </div>
  );
}
