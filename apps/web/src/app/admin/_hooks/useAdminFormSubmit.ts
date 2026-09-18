'use client';

import { useState } from 'react';

import type { FormMessageState } from '@/app/admin/_components/forms';
import { adminErrorMessage } from '@/app/admin/_lib/action-errors';

import type { ActionResult } from '@/lib/action-types';

/**
 * Submit boilerplate shared by the simple admin grant forms (GrantForm,
 * PointGrantForm): a pending flag, FormMessage state, and the
 * preventDefault → FormData → call action → surface `{ error }` flow.
 *
 * The success branch (reset / navigate / success message) differs per form,
 * so it stays with the caller via `onSuccess`, which receives the form
 * element. `setMessage` is returned so a caller can show a success message.
 *
 * Intentionally scoped to the plain `useState`-style forms — the richer
 * admin forms (announcements, articles, banners) use `useTransition` plus
 * unsaved-changes / multi-path submit and are deliberately left alone.
 *
 * The `{ error }` branch goes through `adminErrorMessage`, so an action that
 * returns a code gets a sentence and one that still returns prose is shown as
 * written — the same boundary `useConfirmModalAction` applies to the modal
 * flows, so both halves of the admin surface read the same way.
 */
export function useAdminFormSubmit(
  action: (formData: FormData) => Promise<ActionResult>,
  onSuccess: (form: HTMLFormElement) => void
) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<FormMessageState>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    setMessage(null);

    const result = await action(new FormData(form));

    setPending(false);

    if ('error' in result) {
      setMessage({ type: 'error', text: adminErrorMessage(result.error) });
      return;
    }

    onSuccess(form);
  }

  return { pending, message, setMessage, handleSubmit };
}
