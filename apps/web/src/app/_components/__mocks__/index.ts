/**
 * The `@/app/_components` barrel reduced to what a form or board test can
 * drive: plain buttons, pass-through frames, and banners that render their
 * message as an alert.
 *
 * Opt in with a bare `vi.mock('@/app/_components')`. Vitest matches a manual
 * mock to its module by file name including the extension, so this has to be
 * `index.ts` to shadow `../index.ts`; the stubs themselves need JSX and live
 * in `./stubs.tsx`.
 *
 * The real barrel pulls in the chess board, portal-mounted dialogs and the
 * Tailwind class plumbing, none of which a test about a form's own logic is
 * asking about. The puzzle-authoring, chunk and inline-board suites each
 * declared a copy of these stubs. A suite that needs one more export (a board
 * that simulates a move, say) spreads `await import(...)` of this module into
 * its own factory and adds it there.
 */

// Pure helpers with no dependencies — the real ones are the right stubs.
export { FieldError, fieldBorderClass, fieldErrorProps } from '../FieldError';
export * from './stubs';
