# apps/mobile (Expo / React Native)

Expo Router app. Routes live in `src/app/` (`(tabs)/`, `onboarding.tsx`), the
per-module screens and hooks in `src/features/<module>/`
(`coordinate-quiz`, `diagonal-quiz`, `legal-moves`, `route-planner`,
`square-colors`, `board-symmetry`, `ai-game`, `onboarding`), shared screens
and widgets in `src/components/` and `src/screens/`, the theme in
`src/theme/`, and the stack-screen registrations in
`src/navigation/module-stack-screens.tsx`. Game logic comes from
`@blindfold-chess/features`; the app holds UI, navigation and storage.

## i18n is a separate dictionary from the web app

Mobile uses i18next (`src/i18n/index.ts`) with its own resources in
`src/i18n/resources/{en,es,ja,pt-BR}.json` (flat, ~300 lines each). It shares
nothing with `apps/web/src/messages/*.json` except the locale helpers from
`@blindfold-chess/features/locale`. A string that exists on both platforms is
therefore edited twice, in two different key schemas, and a feature that
exists only on the web (Daily Puzzle, dojo, articles, …) has no mobile key at
all. `src/i18n/__tests__/parity.test.ts` keeps the four files' key sets equal.
Keys are read with `t("...")`; some call sites build the key from a namespace
variable (for example `TimeLimitSettingsForm.tsx`), and those sites list the
concrete keys they produce in a comment so that a grep for the full key still
finds them.

## Settings are device-local: one global board store, then per module

**Global board preferences.** `GamePreferencesProvider` /
`useGamePreferences` (`src/lib/game-preferences/`, mounted in
`src/app/_layout.tsx`) hold the mobile counterpart of the web's
`GamePreferencesContext`: show coordinates, last-move highlight, piece
visibility and obfuscation, pawn hiding, board theme, board visibility, move
input. The type, defaults and the sanitiser for a stored payload come from
`@blindfold-chess/features/game-preferences`, so both platforms read a stored
object with the same rules; the whole object sits under one AsyncStorage key
(`"GAME_PREFERENCES"`), written by `usePersistentSettings` through a storage
wrapper that sanitises on read. The settings tab edits it, and the AI-game
board components (`ChessBoard`, `BoardPeek`, `ButtonInput`) read it themselves
rather than taking it as props. Fields mobile has no UI for yet
(`showPieceDestinations`, `enableAutoComplete`, `aiReplyDuration`, the
non-button input modes) are kept in the object so it stays one type, but
nothing reads them.

**Per-module practice settings.** Each practice module keeps its own
settings through `useAsyncStorageSettings` (`src/lib/persistent-settings/`,
the AsyncStorage adapter for `usePersistentSettings` from
`@blindfold-chess/features/common/client`), under its own storage key
(`"COORDINATE_QUIZ_SETTINGS"` etc.). The language choice and the onboarding
flag bypass the hook and use AsyncStorage directly (`src/i18n/index.ts`,
`src/hooks/useOnboardingStatus.ts`). The web app's counterpart for per-module
settings is `useLocalStorageSettings`.

Storage keys differ per platform and nothing syncs, so "shared" means the
same engine and, where the module imports them from
`@blindfold-chess/features`, the same defaults and validation, not synced
values.

## TypeScript stays on 5.9 here

`apps/mobile` pins `typescript` to `~5.9.3` while every other workspace is on
TypeScript 7 (the Go compiler). Expo needs the TypeScript **JS API**:
`@expo/cli` resolves the project's `typescript` and calls `ts.sys` /
`readConfigFile` / `parseJsonConfigFileContent` to read `paths` out of
`tsconfig.json` for Metro (`utils/tsconfig/evaluateTsConfig`). TypeScript 7's
npm package exports only `version` and `versionMajorMinor`, so under TS7 that
is `TypeError: Cannot read properties of undefined (reading
'getCurrentDirectory')` and `expo start` never reaches Metro. `tsc --noEmit`
passes clean under either compiler, so typecheck alone will not catch the
mistake. Revisit when Expo stops loading the compiler in-process, or when TS7
ships the API (verified against expo ~54.0.33 / expo-router ~6.0.23 / RN
0.81.5). `apps/web` is unaffected because Next 16.3 defaults
`experimental.useTypeScriptCli` to true and shells out to `typescript/bin/tsc`.

## Commands

`pnpm --filter mobile dev` (Expo), `lint`, `typecheck`, `test` (Vitest). The
Stockfish wasm is copied in by `copy-stockfish` (`scripts/copy-stockfish.ts`).
