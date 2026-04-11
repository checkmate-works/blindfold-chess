/**
 * Shared keyboard-event guards for practice input layers.
 *
 * The practice pages have two distinct keyboard handlers — the arrow-key
 * answer wrapper (`ArrowKeyAnswer`) and the algebraic-notation keyboard hook
 * (`useAlgebraicKeyboardInput`) — both of which must bail out in the exact
 * same edge cases (form fields, modals, modifier combos, auto-repeat). These
 * helpers centralize that logic so the two call sites can never drift.
 */

/**
 * True when the event target is an element where typing should be left alone:
 * `<input>`, `<textarea>`, `<select>`, or any contenteditable node.
 * Arrow-key / algebraic-key handlers call this to avoid hijacking form fields.
 */
export function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * True when any element in the DOM has `aria-modal="true"`.
 *
 * Intentionally uses the broad `[aria-modal="true"]` selector so that any
 * future modal component (QuitConfirmModal, RankAchievementModal, future
 * dialogs, etc.) which sets that attribute automatically blocks the practice
 * keyboard handlers. Do NOT tighten this to `[role="dialog"][aria-modal="true"]`.
 */
export function isModalOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return document.querySelector('[aria-modal="true"]') !== null;
}

/**
 * True when the event should be ignored entirely by practice keyboard handlers:
 *
 * - modifier combos (Ctrl / Meta / Alt / Shift)
 * - auto-repeat (`event.repeat`)
 * - focus inside an editable element
 * - any modal is open
 *
 * The caller still decides what to do with non-ignored events (which key to
 * dispatch on). This helper only answers the early-bail question.
 */
export function shouldIgnoreKeyEvent(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return true;
  if (event.repeat) return true;
  if (isEditableElement(event.target)) return true;
  if (isModalOpen()) return true;
  return false;
}
