'use client';

import type { FormEvent, ReactNode } from 'react';

import Link from 'next/link';

import { FormErrorBanner } from '@/app/_components/FormErrorBanner';
import { Button, Field, Input } from '@/app/admin/_components/forms';

import type { AdCreativeFormLabels } from '../_lib/form-labels';
import type { CommonCreativeState } from '../_lib/use-common-creative-state';
import { AD_CREATIVE_LIMITS } from '../_lib/validation';

type Props = {
  common: CommonCreativeState;
  labels: AdCreativeFormLabels;
  error: string | null;
  isPending: boolean;
  onSubmit: (e: FormEvent) => void;
  cancelHref: string;
  /** Kind-specific fields, rendered between `href` and the shared metadata. */
  children: ReactNode;
  /** Live preview, pinned beside the form on wide screens. */
  preview: ReactNode;
};

/**
 * The layout shared by every per-kind creative form: error banner, the common
 * `href`, the kind-specific fields (as `children`), then the active toggle and
 * the save/cancel buttons, with the kind's `preview` beside it. Per-kind forms
 * own only their payload fields.
 */
export function CreativeFormShell({
  common,
  labels,
  error,
  isPending,
  onSubmit,
  cancelHref,
  children,
  preview,
}: Props) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        {error && (
          <div className="mb-4">
            <FormErrorBanner message={error} />
          </div>
        )}

        <form onSubmit={onSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
          <Field label={labels.href} htmlFor="href" description={labels.hrefHint}>
            <Input
              id="href"
              type="text"
              value={common.href}
              onChange={(e) => common.setHref(e.target.value)}
              placeholder={labels.hrefPlaceholder}
              required
              maxLength={AD_CREATIVE_LIMITS.href}
            />
          </Field>

          {children}

          <div className="flex items-center pb-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={common.isActive}
                onChange={(e) => common.setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              {labels.isActive}
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? labels.saving : labels.save}
            </Button>
            <Link
              href={cancelHref}
              className="px-4 py-2 text-sm font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors"
            >
              {labels.cancel}
            </Link>
          </div>
        </form>
      </div>

      <aside className="lg:sticky lg:top-4">{preview}</aside>
    </div>
  );
}
