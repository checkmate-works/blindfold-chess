/**
 * Tailwind classes for the two switch looks this app ships.
 *
 * Seven `role="switch"` buttons had the track and knob classes written out by
 * hand, and they had already split into two designs that nobody chose between:
 *
 * - `setting` — 20x36 track, green when on, white knob. Used where the switch
 *   turns a preference on or off and "on" is the affirmative state: the privacy
 *   and notification preference lists, the ad-creative active flag.
 * - `control` — 24x44 track, foreground fill when on, background knob. Used
 *   where both states are equally valid modes rather than an on/off: board
 *   visibility, reproduce-view, problem shuffling.
 *
 * Classes rather than a component because the seven call sites do not agree on
 * structure — three put the track on the `<button>` itself, the rest wrap a
 * label and give the track to an inner `aria-hidden` span — and forcing one
 * structure would change the rendered DOM of the others. Layout classes that
 * belong to the surrounding flex row (`shrink-0`) stay with the caller.
 *
 * Consolidating the two looks into one is a design decision, not a
 * refactoring one; until it is made, this is where both are stated.
 */
export type ToggleSwitchVariant = 'setting' | 'control';

export function toggleTrackClass(variant: ToggleSwitchVariant, checked: boolean): string {
  if (variant === 'setting') {
    return `relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-success' : 'bg-muted'}`;
  }
  return `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
    checked ? 'bg-foreground' : 'bg-secondary'
  }`;
}

export function toggleKnobClass(variant: ToggleSwitchVariant, checked: boolean): string {
  if (variant === 'setting') {
    return `absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
      checked ? 'translate-x-4' : 'translate-x-0'
    }`;
  }
  return `inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
    checked ? 'translate-x-6' : 'translate-x-1'
  }`;
}
