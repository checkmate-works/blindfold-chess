/**
 * Shared keyboard-event guards for global (window-level) keyboard input layers.
 *
 * Several screens attach window `keydown` handlers that mirror on-screen
 * buttons — the practice pages' arrow-key answer wrapper (`ArrowKeyAnswer`)
 * and algebraic-notation hook (`useAlgebraicKeyboardInput`), and the play
 * screen's notation keypad (`useNotationKeyboardInput`). All of them must
 * bail out in the exact same edge cases (form fields, modals, modifier
 * combos, auto-repeat). These helpers centralize that logic so the call
 * sites can never drift.
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
 * True when any app-owned modal is open, detected via the `data-app-modal="true"`
 * attribute set by the shared `<Modal>` component in `_components/Modal.tsx`.
 *
 * Why not `[aria-modal="true"]`?
 *   Third-party scripts injected into the page (e.g. the consent-management
 *   banner, which only ships in production and is env-var gated) render
 *   elements with `aria-modal="true"` of their own. Querying that attribute
 *   would over-match and cause `shouldIgnoreKeyEvent` to return `true` for
 *   every keydown while the 3P element is in the DOM — silently breaking
 *   arrow-key / algebraic-notation input on practice pages in production
 *   only (dev is unaffected because the consent banner is not loaded there).
 *
 * `data-app-modal` is an app-owned contract: only the shared `<Modal>`
 * component sets it, so the selector is immune to third-party collisions
 * (the consent banner today, future chat widgets / ad providers / etc.). The existing
 * `aria-modal` attribute is still set alongside it because it is required
 * for accessibility — this guard is additive, not a replacement.
 *
 * If a new modal ever stops routing through the shared `<Modal>` component
 * it MUST also set `data-app-modal="true"` explicitly, or the practice
 * keyboard handlers will fail to bail out while it is open.
 */
export function isModalOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return document.querySelector('[data-app-modal="true"]') !== null;
}

/**
 * True when the event should be ignored entirely by global keyboard handlers:
 *
 * - modifier combos (Ctrl / Meta / Alt, and Shift unless `allowShift`)
 * - auto-repeat (`event.repeat`)
 * - focus inside an editable element
 * - any modal is open
 *
 * The caller still decides what to do with non-ignored events (which key to
 * dispatch on). This helper only answers the early-bail question.
 *
 * `allowShift` exists for handlers whose accepted characters *require* Shift
 * to type — SAN notation entry needs uppercase piece letters (`Shift+n` → N)
 * and shifted symbols (`+`, `#`). Such callers still get strict filtering:
 * they match on `event.key` (the produced character), so an unwanted shifted
 * key simply misses their allow-list. Handlers that only accept unshifted
 * keys should keep the default so Shift combos fall through untouched.
 */
export function shouldIgnoreKeyEvent(
  event: KeyboardEvent,
  { allowShift = false }: { allowShift?: boolean } = {}
): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return true;
  if (event.shiftKey && !allowShift) return true;
  if (event.repeat) return true;
  if (isEditableElement(event.target)) return true;
  if (isModalOpen()) return true;
  return false;
}
