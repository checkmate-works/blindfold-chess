'use client';

import { useState } from 'react';
import type { Ref, TextareaHTMLAttributes } from 'react';

import { INPUT_BASE_CLASSES, INPUT_SM_CLASSES, type InputSize } from './inputStyles';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Show character counter. Defaults to true when maxLength is set. */
  showCount?: boolean;
  inputSize?: InputSize;
  ref?: Ref<HTMLTextAreaElement>;
};

export function Textarea({
  className = '',
  maxLength,
  showCount,
  defaultValue,
  value,
  onChange,
  inputSize = 'md',
  ref,
  ...props
}: Props) {
  const baseClasses = inputSize === 'sm' ? INPUT_SM_CLASSES : INPUT_BASE_CLASSES;
  const [internalLength, setInternalLength] = useState(
    () => String(value ?? defaultValue ?? '').length
  );

  const shouldShowCount = showCount ?? maxLength != null;
  const currentLength = value != null ? String(value).length : internalLength;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInternalLength(e.target.value.length);
    onChange?.(e);
  };

  const ratio = maxLength ? currentLength / maxLength : 0;
  const counterColor =
    ratio >= 1
      ? 'text-destructive'
      : ratio >= 0.9
        ? 'text-warning dark:text-yellow-400'
        : 'text-muted-foreground';

  return (
    <div>
      <textarea
        ref={ref}
        className={`${baseClasses} resize-y ${className}`.trim()}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        {...props}
      />
      {shouldShowCount && maxLength && (
        <p className={`mt-1 text-xs text-right ${counterColor}`}>
          {currentLength.toLocaleString()} / {maxLength.toLocaleString()}
        </p>
      )}
    </div>
  );
}
