'use client';

import type { ReactNode } from 'react';

import { Button, FormErrorBanner, LocalizedUnsavedChangesDialog } from '@/app/_components';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { SectionTitle } from '@/app/[locale]/_components';

import { PreviewTags } from './PreviewTags';

/**
 * Placeholder for the window between SSR and the client reading the draft out
 * of sessionStorage. The step indicator is already known at that point, so it
 * renders for real — only the draft-shaped part is a grey block.
 */
export function DraftPreviewSkeleton({ stepIndicator }: { stepIndicator: ReactNode }) {
  return (
    <div className="space-y-6">
      {stepIndicator}
      <div className="h-32 animate-pulse rounded bg-muted/30" />
    </div>
  );
}

type Props = {
  stepIndicator: ReactNode;
  title: string;
  description: string;
  themes: ThemeOption[];
  chunks: ChunkOption[];
  error: string | null;
  pending: boolean;
  submitLabel: string;
  onSubmit: () => void;
  backLabel: string;
  onBack: () => void;
  /** The unsaved-changes guard from `useDraftPreview`. */
  guard: {
    isBlocking: boolean;
    confirm: () => void;
    cancel: () => void;
  };
  /** The draft itself: a static board for position-memory, a replay for puzzles. */
  children: ReactNode;
};

/**
 * The read-only "confirm your draft before it goes live" step, shared by the
 * position-memory create flow and both puzzle flows. Everything around the
 * draft body is the same in all three — heading, step indicator, description,
 * tag list, error banner, submit/back pair, and the unsaved-changes dialog —
 * so only the body is a slot.
 *
 * Pair it with `useDraftPreview`, which owns the matching state machine.
 */
export function DraftPreviewLayout({
  stepIndicator,
  title,
  description,
  themes,
  chunks,
  error,
  pending,
  submitLabel,
  onSubmit,
  backLabel,
  onBack,
  guard,
  children,
}: Props) {
  return (
    <>
      <div className="space-y-6">
        <SectionTitle>{title}</SectionTitle>

        {stepIndicator}

        {description.trim() !== '' && (
          <p className="text-foreground whitespace-pre-wrap">{description}</p>
        )}

        {children}

        <PreviewTags themes={themes} chunks={chunks} />

        <FormErrorBanner message={error} />

        <div className="flex flex-col gap-3 pt-2">
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            disabled={pending}
            loading={pending}
            onClick={onSubmit}
          >
            {submitLabel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            disabled={pending}
            onClick={onBack}
          >
            {backLabel}
          </Button>
        </div>
      </div>

      <LocalizedUnsavedChangesDialog
        open={guard.isBlocking}
        onConfirm={guard.confirm}
        onCancel={guard.cancel}
      />
    </>
  );
}
