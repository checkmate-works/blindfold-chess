import type { ReactNode } from 'react';

/**
 * The one-line heading at the top of every onboarding step.
 *
 * Deliberately quiet — small, muted, centred — so the step's own content (the
 * form, the card preview, the demo) is what the eye lands on. Each step used
 * to style its heading by hand and they had drifted apart (bold on some,
 * muted on others); routing them all through here keeps the wizard uniform.
 *
 * No hooks and no `'use client'`, so the server-rendered belt slide can use it
 * as well as the client steps.
 */
export function StepHeading({ children }: { children: ReactNode }) {
  return <p className="text-center text-sm text-muted-foreground">{children}</p>;
}
