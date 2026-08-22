---
name: verify
description: Build/launch/drive recipe for runtime-verifying apps/web changes end-to-end (dev server + Playwright).
---

# Verifying apps/web at runtime

## Launch

- `pnpm dev` from `apps/web` serves http://localhost:3000. The developer
  usually already has it running — probe `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/en`
  first; a port clash just means reuse the running instance (it hot-reloads
  the working tree, so your uncommitted changes are live).
- DB-backed pages need Supabase local (`pnpm supabase start` + `pnpm db:run-migrate`).
  Check with `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c '\dt'`.

## Drive (headless browser)

- Playwright 1.58+ is hoisted at the monorepo root but NOT resolvable from
  outside the repo. From a scratchpad ESM script use:
  `createRequire('<repo>/apps/web/package.json')` then `require('playwright')`.
- Locale-prefixed routes: use `/en/...` for stable text assertions.

## Gotchas

- **Local games live in localStorage**, key `blindfold_chess_games`
  (`StoredGame[]`, see `src/lib/games/saved-game-types.ts`). To drive
  `games/play/result?gameId=...` without playing a full game, inject a
  finished record via `context.addInitScript` before navigation. The
  repository validates `moves` against `startingFen` on load — use a legal
  sequence or the record silently drops.
- **Anonymous stats gate**: the result/shared Summary is blurred for
  signed-out viewers (`StatsAuthGate`, `.blur-sm` + `.pointer-events-none`).
  DOM assertions still work through the blur; for clean screenshots strip
  those classes client-side, or note the blur.
- New-game seeding is URL-driven: `/en/games/play?color=white&moves=<JSON array>&fen=<FEN>`.
  A brand-new game auto-saves to localStorage on mount (poll for it).
- **Driving live play**: the default move-input mode is `button` (SAN composer),
  which is painful to automate, and the `gamePrefs` URL param can't switch it
  (the mode is gated by `enabledMoveInputModes` from global preferences). Seed
  global preferences instead, key `blindfold-chess-game-preferences`:
  `{"moveInputMode":"text","enabledMoveInputModes":["text"],"boardVisibility":"always"}`
  → then `input[placeholder*="Enter move"]` + Enter submits moves. Undo/Resign
  are `button[title="Undo"|"Resign"]` + a confirm modal with the same text.
  The AI (stockfish wasm) works headless; allow ~10s per reply.
- **Per-game blindfold settings come only from the URL**: a game started by
  plain URL has no `play_settings` snapshot — `games.play_settings` publishes
  as `null`, so it is neither "constrained" (1kyu/1dan evaluators) nor gets
  the AI review's blindfold block. Pass `gamePrefs=<JSON>` as the real
  new-game dialog does, e.g. `{"boardVisibility":"peek","showOwnPieces":true,
"showOpponentPieces":true,"pieceShapeMode":"normal","pieceColors":"normal",
"pawnHideMode":"none"}`. In peek mode the reveal control is the board
  mask's "Tap to reveal" text, not the inline "Show Board" header.
- **AI review generation** (`games/shared/[id]` → "AI Review" tab) needs the
  author signed in with a `subscriptions` row in status `active` (fake Stripe
  ids are fine locally), `OPENAI_API_KEY` in `.env.local`, and one free daily
  slot: to regenerate, `delete from rate_limit_events where action =
'generate_ai_review'` and drop the `game_ai_reviews` row. A real call costs
  well under a yen on gpt-5-mini. To see the raw model response (the app logs
  only to the dev-server console), drive `generateReview` from a scratch
  vitest file with `vi.mock('server-only', () => ({}))` and a logging wrapper
  around `createOpenAiClient()`.
- Button titles are Title Case from i18n (e.g. "Flip Board", not "Flip board").
- Screenshot-equality checks across a button click pick up the focus ring —
  compare DOM state (e.g. coordinate-label order for board orientation), not pixels.
- Publishing a game from a test writes real rows to the local `games` table
  (plus `game_tokens` for anonymous authors) — clean them up via psql afterwards.
