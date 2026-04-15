import type { ReactNode } from 'react';

import type { ProfileFormError } from '../../_lib/profile-form-types';

type FormFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  error: ProfileFormError;
  fieldName: string;
  hint?: string;
  children: ReactNode;
};

/**
 * Presentational form field wrapper used by the profile form. Renders the
 * field label, child input, an inline error message (when `error.field`
 * matches `fieldName`), and an optional hint line.
 */
export function FormField({
  id,
  label,
  required,
  error,
  fieldName,
  hint,
  children,
}: FormFieldProps) {
  const labelClassName = 'block text-sm font-medium text-foreground mb-1';
  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error?.field === fieldName && (
        <p className="mt-2 text-sm text-destructive">{error.message}</p>
      )}
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
