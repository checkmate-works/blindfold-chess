'use client';

import type { FormEventHandler, ReactNode } from 'react';

import { FormErrorBanner } from './FormErrorBanner';

type Props = {
  onSubmit: FormEventHandler<HTMLFormElement>;
  /** Submit error message, surfaced as a bordered banner above the fields. */
  error: string | null;
  children: ReactNode;
};

/**
 * Shared shell for the auth forms (sign-in, sign-up, forgot/reset password):
 * a centered narrow form that surfaces the submit error banner above its
 * fields. Each form supplies its own fields + submit button as children.
 */
export function AuthFormLayout({ onSubmit, error, children }: Props) {
  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm mx-auto space-y-4">
      {error && <FormErrorBanner message={error} variant="bordered" />}
      {children}
    </form>
  );
}
