'use client';

import type { FormEvent, ReactNode } from 'react';

import Link from 'next/link';

import { Button, Field, Input } from '@/app/admin/_components/forms';

import type { AdCreativeFormLabels } from '../_lib/form-labels';
import type { CommonCreativeState } from '../_lib/use-common-creative-state';

type Props = {
  common: CommonCreativeState;
  labels: AdCreativeFormLabels;
  error: string | null;
  isPending: boolean;
  onSubmit: (e: FormEvent) => void;
  cancelHref: string;
  /** Kind-specific fields, rendered between `href` and the shared metadata. */
  children: ReactNode;
};

/**
 * The layout shared by every per-kind creative form: error banner, the common
 * `href`, the kind-specific fields (as `children`), then the shared metadata
 * (sort order / active / schedule / country targeting) and the save/cancel
 * buttons. Per-kind forms own only their payload fields.
 */
export function CreativeFormShell({
  common,
  labels,
  error,
  isPending,
  onSubmit,
  cancelHref,
  children,
}: Props) {
  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
        <Field label={labels.href} htmlFor="href">
          <Input
            id="href"
            type="text"
            value={common.href}
            onChange={(e) => common.setHref(e.target.value)}
            placeholder={labels.hrefPlaceholder}
            required
            maxLength={2048}
          />
        </Field>

        {children}

        <div className="grid grid-cols-2 gap-4">
          <Field label={labels.sortOrder} htmlFor="sortOrder">
            <Input
              id="sortOrder"
              type="number"
              value={common.sortOrder}
              onChange={(e) => common.setSortOrder(Number(e.target.value))}
            />
          </Field>
          <div className="flex items-end pb-2">
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label={labels.startAt} htmlFor="startAt">
            <Input
              id="startAt"
              type="datetime-local"
              value={common.startAt}
              onChange={(e) => common.setStartAt(e.target.value)}
            />
          </Field>
          <Field label={labels.endAt} htmlFor="endAt">
            <Input
              id="endAt"
              type="datetime-local"
              value={common.endAt}
              onChange={(e) => common.setEndAt(e.target.value)}
            />
          </Field>
        </div>

        <Field
          label={labels.targetCountry}
          htmlFor="targetCountry"
          description={labels.targetCountryHint}
        >
          <Input
            id="targetCountry"
            type="text"
            value={common.countryText}
            onChange={(e) => common.setCountryText(e.target.value)}
            placeholder="JP"
            maxLength={2}
          />
        </Field>

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
  );
}
