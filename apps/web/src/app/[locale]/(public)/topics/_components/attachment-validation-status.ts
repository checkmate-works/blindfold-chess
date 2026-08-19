/**
 * Validation status an attachment input surfaces to its parent.
 *
 *   - `empty` — nothing meaningful entered. Apply is allowed; the input emits
 *     `{ kind: 'empty' }`, i.e. no attachment row.
 *   - `ok`    — the input parses to a kind the server can accept. Apply is
 *     allowed and a non-empty mode is emitted.
 *   - `error` — the client detected a known-bad input. `AttachmentModal`
 *     disables Apply while the active tab is in this state.
 *
 * Shared by every attachment input because the modal switches between them
 * behind one Apply button: the button reads whichever input is on the active
 * tab, so the three have to answer the same question with the same vocabulary.
 * Not every input uses all three states — an input whose only failure mode is
 * server-side never reports `error` — and that is a property of the input, not
 * of this union.
 */
export type ValidationStatus = 'empty' | 'ok' | 'error';
