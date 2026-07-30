'use client';

import { useRef, useState } from 'react';

import { flushSync } from 'react-dom';

/**
 * A rejected submit. `field` names the control at fault so the message can
 * be rendered against it; `null` marks an error no single control owns
 * (a failed draft write, a server error) which belongs in the form-level
 * strip instead.
 */
export type SubmitError<Field extends string> = { field: Field | null; message: string };

/**
 * Submit-error state plus the "send the author to the problem" behaviour
 * every long form needs.
 *
 * Forms here are taller than a phone screen — a board editor alone fills
 * one — so an error rendered wherever it happens to live is invisible
 * from the submit button, and the button reads as broken. On `report`
 * this moves focus to the offending control: focus rather than a bare
 * scroll, because it brings the viewport along for pointer users *and*
 * puts keyboard / screen-reader users on the thing that needs fixing.
 *
 * `resolveAnchorId` maps a field to the DOM id focus should land on —
 * usually the control's own id, but it can differ when the control isn't
 * mounted (e.g. a board editor whose FEN textarea only exists on the
 * other tab). Return `null` to leave focus alone.
 *
 * Attach `summaryRef` to the form-level strip so `field: null` errors are
 * focused too.
 */
export function useSubmitError<Field extends string>(
  resolveAnchorId: (field: Field) => string | null
) {
  const [error, setError] = useState<SubmitError<Field> | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  function report(field: Field | null, message: string) {
    // flushSync so the inline message and its `aria-describedby` target
    // are committed before focus lands; otherwise the screen reader
    // announces the control without the sentence explaining it. It also
    // guarantees `summaryRef` is attached — the strip may be mounting in
    // this very update.
    flushSync(() => setError({ field, message }));

    const anchorId = field === null ? null : resolveAnchorId(field);
    if (field !== null && anchorId === null) return;

    const anchor = anchorId === null ? summaryRef.current : document.getElementById(anchorId);
    anchor?.focus({ preventScroll: true });
    // Optional-called because jsdom does not implement scrollIntoView.
    anchor?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }

  return {
    error,
    /** The message for `field`, or null — feed straight to `<FieldError>`. */
    messageFor: (field: Field) => (error?.field === field ? error.message : null),
    /**
     * The message for errors no control owns, or null — feed straight to
     * `<FormErrorBanner>`.
     */
    formMessage: error !== null && error.field === null ? error.message : null,
    report,
    clear: () => setError(null),
    /** Attach to the form-level strip so `field: null` errors get focus. */
    summaryRef,
  };
}
