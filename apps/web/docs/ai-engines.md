# AI Engines (Stockfish / Maia)

AI opponents are wired through the `ChessOpponent` port from
`@blindfold-chess/features/ai-game/opponent`. Each engine has its own
factory in `apps/web/src/lib/engines/`; the consumer hook
(`useAiVersus`) picks one based on the `EngineKind` URL param /
selection. Stockfish runs as wasm from `public/stockfish.js`; Maia is an
ONNX model that needs the operational setup below.

## Maia 3

- **Model file**: `apps/web/engines/maia/maia3_simplified.onnx`
  (~46 MB). **Gitignored** — fetched by `scripts/download-maia.ts`
  during `prebuild` and `pnpm download-maia` locally. The file is
  intentionally **outside `public/`** so it cannot be served as a
  static asset; the only access path is the auth-gated route handler
  `/api/engines/maia/[file]` (`src/app/api/engines/maia/[file]/route.ts`),
  whose TSDoc carries the threat model, the cache policy and the rule
  that **a new model version must get a new filename** (the response is
  cached as immutable for a year, so the filename is the cache key).
- **Who may play**: a Maia game costs `MAIA_GAME_POINT_COST` (one coin)
  below `MAIA_FREE_LEVEL` (Lv5, `src/lib/users/maia-free-level.ts`) and
  is free from that level up. The level is the only exemption — a
  subscription does not waive the coin. `startMaiaGame` re-reads the
  level server-side before settling, and the model gate accepts either
  the level or a prior `maia_game` ledger row. The TSDoc on
  `MAIA_FREE_LEVEL` carries the reasoning (the charge was not funding
  anything, the level keeps a cost on the download that a throwaway
  account cannot meet in one sitting). Whether the unlock changes
  anything is read from completed games — `exp_events` with
  `source = 'ai_game_result'` and `menu_type = 'maia'` — not from the
  coin ledger, which a free game never touches.
- **Large-download consent**: `LargeDownloadConsentDialog` intercepts
  Maia game starts on metered / slow links (driven by
  `shouldWarnBeforeLargeDownload()` in `src/lib/network/connection.ts`).
- **Licence**: Maia weights and the preprocessing code in
  `packages/features/src/ai-game/maia/` are GPL-3.0 (derivative of
  CSSLab/maia-chess and CSSLab/maia-platform-frontend). The
  `/licenses` page lists the attribution; do **not** modify the model
  file in-place — replace it with a fresh upstream download instead so
  the "no local modifications" claim on the licences page remains
  accurate.

## Vercel spend management (MUST be configured)

The Maia model is the largest asset shipped to browsers, so runaway
egress costs would be a real risk if the auth gate were ever bypassed
or misconfigured. **A Vercel spending cap remains the last-line
defence against an open-ended bill** even with the gate in place.

- Set via Vercel dashboard → Team Settings → Billing → **Spend
  Management** (recently rebranded "Cost Controls" in some views).
- Enable **Pause Project at Spend Limit** so the project is taken
  offline (504s) before the bill explodes.
- Set notifications at 50% / 75% / 90% of the cap.
- The cap is account-wide, not per-project; pick a number that covers
  every project under the team.

The auth gate closes the "anonymous attacker loops the model" hole;
per-user / per-IP throttling against _authenticated_ abusers is
intentionally NOT layered yet — add it only after observing such abuse.
