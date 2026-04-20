# SPEC1: Follow-up tasks from the games/play input refactor

## Context

During the 2026-04 refactor of the `/[locale]/games/play` input pipeline (branch `improve-move-inputs`), two non-blocking issues were deferred. This document captures them so they can be addressed in a later session.

To pick this up, say in a new session:

> Implement SPEC1.md

The two tasks below are independent; either order or in parallel is fine.

---

## Task 1: Localize the "AI move failed" string

### Current state

`apps/web/src/app/[locale]/(public)/games/play/_hooks/use-game-session.ts` hardcodes an English string when the AI side returns an error:

```ts
// around line 187-190
const handleAiMoveError = useCallback(() => {
  setError('AI move failed');
  // ...
}, [...]);
```

This string surfaces in the page title (`<PageTitle>` via `PlayPageClient.tsx`) and is visible to users on any locale — including `ja` and `es`.

### Required change

1. Add a new i18n key to the `play` namespace (or whichever namespace already owns move-related error messages — verify by inspecting `apps/web/src/messages/en.json`). Suggested key: `play.aiMoveFailed` with value `"AI move failed"` (en), `"AI の手の取得に失敗しました"` or similar (ja), `"Error al procesar el movimiento de la IA"` or similar (es).
2. Replace the hardcoded string with `t('aiMoveFailed')` using `useTranslations('play')` (or whichever namespace you chose). `useTranslations` is already imported in that hook's scope — verify before reusing.
3. Run `pnpm --filter web check:i18n` to confirm no new warnings.

### Acceptance criteria

- `pnpm --filter web typecheck / lint / test` all pass.
- `pnpm --filter web check:i18n` produces no new warnings for this key (existing unrelated warnings may remain).
- Manually verify the `ja` and `es` translations look natural for a chess app audience.

### Constraints

- Do not introduce new i18n namespaces unless there is a genuine reason. The `play` namespace is the natural home.
- Keep the message tone consistent with other error messages in the namespace (e.g., `play.invalidMove`).
- Do not commit or push unless explicitly instructed.

---

## Task 2: Eliminate the bucket-brigade state plumbing around move error

### Current state

The `error` + `lastAttemptedInput` state flows through this chain:

```
usePlayerMove  →  useGameSession  →  PlayClient  →  PlayPageClient
                                       (via useEffect → onMoveErrorChange callback)
```

Concretely:

- `useGameSession` exposes `error` and `lastAttemptedInput` from its returned `moveInput` slice.
- `PlayClient` subscribes to them and bridges to its parent via an `onMoveErrorChange(error, lastAttemptedInput)` callback inside a `useEffect` (`PlayClient.tsx` around L51-53).
- `PlayPageClient` stores its own local `moveError` / `lastAttemptedInput` state purely to mirror the child's state.

This adds one render cycle of latency and creates an awkward indirection: the parent has the rendering responsibility (title swap), but the state lives two levels below, forced to flow back up through a side effect.

### Required change

Hoist the error state (at minimum `error` + `lastAttemptedInput`) so that `PlayPageClient` owns it directly, and remove the `useEffect` bridge.

Two implementation options to evaluate, pick whichever minimizes churn:

**Option A — Hoist `useGameSession` to `PlayPageClient`**

Move the `useGameSession()` call from `PlayClient` up to `PlayPageClient`. Pass the returned slices down as props. `PlayClient` becomes a presentational layer for the board/panels. This is the cleanest architecturally but touches the most code.

**Option B — Split `useGameSession`**

Keep `useGameSession` where it is, but extract the error portion into a small separate hook (e.g., `useMoveErrorState`) that `PlayPageClient` calls. Then `usePlayerMove` accepts the setters from props (or via a context). This keeps the session hook cohesive for in-game logic but adds a new hook.

Pick the approach that lowest-risk preserves existing behavior. Document your choice briefly in the commit message.

### Acceptance criteria

- The `useEffect` in `PlayClient` that calls `onMoveErrorChange(...)` is removed.
- `onMoveErrorChange` prop is removed from `PlayClient` (or equivalent).
- `moveError` / `lastAttemptedInput` local state is removed from `PlayPageClient` — it reads directly from the hoisted source.
- All existing behaviors still work:
  - Error appears in PageTitle slot on submit failure.
  - Error clears on any user edit (ButtonInput char/castling/backspace/clear, MoveInput onChange, MoveSelect change, input mode switch).
  - Error clears on undo, restart from position, and game end.
  - "Show legal moves after 3 failures" still gates correctly.
- `pnpm --filter web typecheck / lint / test` pass.

### Constraints

- Do not regress the existing error lifecycle behavior. Use `git log` on `use-game-session.ts` and `PlayPageClient.tsx` to understand what was intentional.
- Do not modify `ButtonInput` / `MoveInput` / `MoveSelect` public props — they are stable surface.
- Keep the `onClearError` callback path intact for the children.
- Do not commit or push unless explicitly instructed.

---

## Out of scope for this spec

- The Phase D error display design itself (title slot swap) is final and should not be revisited as part of this spec.
- Mobile (`apps/mobile`) is known-broken from the 2026-04 refactor and is tracked separately.
- The "Show legal moves after 3 failures" feature has its own CLS issue (button appears dynamically); that is a different deferred item, not covered here.
