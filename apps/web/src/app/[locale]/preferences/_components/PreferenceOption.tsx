'use client';

import type { ChangeEvent, ReactNode } from 'react';

type Props = {
  type: 'radio' | 'checkbox';
  name?: string;
  value?: string;
  checked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  label: ReactNode;
  description?: ReactNode;
  descriptionPosition?: 'right' | 'bottom';
  className?: string;
};

export function PreferenceOption({
  type,
  name,
  value,
  checked,
  onChange,
  label,
  description,
  descriptionPosition = 'right',
  className = '',
  children,
  variant = 'card',
}: Props & { children?: ReactNode; variant?: 'card' | 'plain' }) {
  const baseContent = (
    <>
      <div className={`flex ${descriptionPosition === 'bottom' ? 'items-start' : 'items-center'}`}>
        <input
          type={type}
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          className={`h-4 w-4 text-primary focus:ring-primary border-border ${
            descriptionPosition === 'bottom' ? 'mt-1' : ''
          }`}
        />
        <div className="ml-3">
          <span className="text-sm text-foreground font-medium block">{label}</span>
          {description && descriptionPosition === 'bottom' && (
            <span className="text-xs text-muted-foreground mt-1 block">{description}</span>
          )}
        </div>
      </div>
      {description && descriptionPosition === 'right' && (
        <span className="text-xs text-muted-foreground ml-3 text-right">{description}</span>
      )}
    </>
  );

  const labelClasses = `flex ${
    descriptionPosition === 'bottom' ? 'items-start' : 'items-center'
  } justify-between p-3 cursor-pointer transition-colors hover:bg-accent ${
    variant === 'card' && !children ? 'border border-border rounded-md' : ''
  }`;

  if (children) {
    return (
      <div
        className={`flex flex-col ${
          variant === 'card' ? 'border border-border rounded-md' : ''
        } ${className}`}
      >
        <label
          className={`${labelClasses} ${variant === 'card' ? 'rounded-t-md' : ''} ${!className ? 'w-full' : ''}`}
        >
          {baseContent}
        </label>
        <div className="border-t border-border/40">{children}</div>
      </div>
    );
  }

  return <label className={`${labelClasses} ${className}`}>{baseContent}</label>;
}
