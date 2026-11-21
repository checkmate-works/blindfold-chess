# apps/mobile (Expo / React Native)

Expo Router app. Game logic comes from `@blindfold-chess/features`; the app
holds UI, navigation and storage. The per-module screens and hooks live in
`src/features/<module>/`, shared widgets in `src/components/`, navigation
helpers in `src/navigation/`, the theme in `src/theme/`.

The app follows the web's features but not its look: what reads as a web
page on a phone (a header band, a centred modal, grey underlined links) is
replaced by the platform's own parts or their common app equivalents.

## Navigation: tabs, a root stack, a session modal

`src/app/_layout.tsx` is the root native stack:

- `(tabs)` — the bottom tabs (`(tabs)/_layout.tsx`): Home, Practice, Play,
  Learn, Settings, drawn by the OS through expo-router's `NativeTabs`
  (`expo-router/unstable-native-tabs`; on iOS 26 the floating Liquid Glass
  bar that shrinks on scroll, Material 3 on Android). Icons are SF Symbols on
  iOS and Material Community Icons (via `VectorIcon`) on Android. Each tab is
  a stack with only its entry screen (`TabStack` in
  `navigation/stack-options.tsx`, left-aligned 22pt title). The tabs layout
  is also the onboarding gate: `/` is the home tab, and a first launch is
  redirected to `/onboarding`. `NativeTabs` is unstable API: re-check its
  props whenever the Expo SDK changes.
- Detail screens are pushed on the root stack, above the tabs, so the tab
  bar hides on them: each module's setup at `practice/<route>/index.tsx`
  (URL `/practice/<route>`), the AI-game setup at `play/ai-game`, the saved
  games at `play/games`, learn articles at `learn/[slug]`.
- `(session)` — timed sessions, results and training runs
  (`(session)/practice/<route>/{session,result,training}.tsx`,
  `(session)/play/ai-game/*`), presented as one `fullScreenModal`. A full
  screen modal has no swipe-to-dismiss, so a timed run cannot be abandoned by
  an edge swipe; every screen in it closes it with `useCloseSession`
  (`navigation/use-close-session.ts`, which pops the modal off the root stack
  and falls back to an href when nothing is underneath). Session → result is
  a `router.replace` inside the modal. Header-less sessions show the ×
  through `PracticeSessionScreen` (built in) or `SessionTopBar`; timed ones
  ask before leaving.

Screen titles and options are registered in the layouts, not in the
screens: `moduleSetupScreens` / `moduleSessionScreens`
(`navigation/module-stack-screens.tsx`) generate them for every module in
`navigation/module-routes.ts`, and `useStackScreenOptions` holds the shared
header style (page-coloured, no hairline, chevron-only back).

## UI parts

- **Lists and settings** use `ListSection` / `ListRow` / `ListIcon`
  (`components/List.tsx`, the inset-grouped list), `SelectRow` (shows the
  value; picks a new one in a bottom sheet) and `SwitchRow` (platform switch)
  from `components/SettingRows.tsx`. Tab entry screens scroll in
  `TabScrollView` (automatic content insets, so the floating tab bar does not
  cover the last row).
- **Half modals:** `BottomSheet` (`components/BottomSheet.tsx`) for option
  lists, help and pickers inside a screen — it works inside the session
  modal and sizes to its content. Closes on backdrop tap, Android back, or a
  drag on its top row. Only the dimmed backdrop lifts it (no border/shadow).
- **Help:** every practice setup screen's header has a ? that opens
  `HelpSheet` (`features/help/`), paged: how to play, the web tutorial's
  explanation steps, the challenge/training modes. `PracticeSetupScreen`
  finds the module from the route, so a setup screen needs nothing for it.
- **Header buttons** are `HeaderIconButton`; the session close button is
  `SessionCloseButton`.
- Web pages (terms, privacy, FAQ, contact, licenses) open in the browser via
  `lib/web-pages.ts`, never in a WebView.

## Content copied from the web

Generated, not edited by hand; re-run the script after the web changes:

- `scripts/port-help-texts.py` — the practice modules' how-to-play,
  tutorial and mode texts (`moduleHelp.*` in the four dictionaries and
  `features/help/module-help-pages.ts`), recall's strings (`recall.*`) and
  the account screens' (`account.*`) and the puzzle screens' (`puzzle.*`).
- `pnpm bundle-glossary` (`scripts/bundle-glossary.ts`) — the web's glossary
  seed into `features/glossary/generated/`.
- `pnpm bundle-learn-content` (`scripts/bundle-learn-content.ts`) — the web's
  learn articles and SVG figures into `features/learn/generated/`. They
  render through `features/learn/markdown.ts` + `MarkdownView` (the markdown
  subset the articles use; LaTeX becomes plain text). Articles have no pt-BR
  text yet and fall back to English.

Shared data lives in `@blindfold-chess/features` instead where both apps
read it: the position-memory presets (`fen-practice`'s
`POSITION_MEMORY_FENS`) and the opening families (`openings`).

## Accounts and recorded challenges

Signing in is optional; every practice works signed out. The app talks to
the server only through the web app's mobile API, `/api/mobile/v1/*`
(`apps/web/src/app/api/mobile/v1/`, guard `@/lib/mobile-api/auth`): the
Supabase access token goes in `Authorization: Bearer`, the routes reuse the
web's cores (`createProfileForUser`, `lib/challenge/attempts`,
`finishAttemptForUser`, `getUserRanks`) and the app never touches the
database. Sign-in calls Supabase Auth directly; sign-up goes through
`POST /sign-up` so the web's rate limit and password rules apply.

- `src/auth/` — backend config (build variables `EXPO_PUBLIC_SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_ORIGIN`; a
  development build without them uses the local stack on the Metro host; a
  release build without them has no accounts), the Supabase client (session
  in SecureStore), `callMobileApi` (retries a 401 once after a refresh) and
  the `useAuth` store.
- `(account)` screens: sign-in, sign-up, setup-username, records (the
  user's own ranks). Settings has the Account section.
- **Challenges follow the web's rules** (60 s, `MISTAKE_LIMIT`): the six
  challenge sessions mount inside `ChallengeAttemptGate`
  (`features/challenge/`), which starts a server attempt when signed in and
  runs the shared session hook in remote mode (the server supplies and
  grades every question); signed out, the run is local. The result screen's
  `ChallengeRecordStatus` finishes the attempt (the web's resend rules) and
  says whether it was recorded. Each challenge's setup takes only what the
  web's challenge takes (orientation, or the piece for legal moves / route
  planner, which are the leaderboard keys).
- **The app shows no other user.** Only the user's own ranks; full
  leaderboards, profiles and anything other users wrote stay on the web, so
  the app needs none of the reporting and blocking an app showing
  user-generated content must have.

- **Puzzles** (`practice/puzzle`): the app lists the Daily Puzzle and the
  featured set only (`GET /puzzles`; `GET /puzzles/[id]` answers 404 for any
  other puzzle), solves them with the web's rules from
  `@blindfold-chess/features/puzzle`, and records a solved one for a
  signed-in player (`POST /puzzles/results`, free-play EXP). Authors, likes,
  comments and the user-submitted pool stay on the web, under the rule
  above.

Still web-only: creating puzzles and community positions, repertoires,
topics and articles, the home feed, Maia, password reset (the app opens the
web page). Finished AI games are kept on the device
(`features/game-history/`, AsyncStorage `"AI_GAME_HISTORY"`, newest first, at
most 50), like the web keeps them in localStorage.

## Practice modules: the shared registry plus a mobile table

Which practice modules exist, and their slugs, come from the registry shared
with the web app (`@blindfold-chess/features/practice-registry`).
`src/navigation/practice-modules.ts` (`MOBILE_PRACTICE_MODULES`) lists the
ones mobile implements, in display order, keyed by registry slug, with only
the mobile-side presentation: icon, i18n namespace, a route directory when it
differs from the slug (quadrants), and whether a `training` screen exists.
The practice tab's list (`(tabs)/practice/index.tsx`, split into challenges
and free play by the registry's `hasChallenge`) and the screen registrations
(`navigation/module-routes.ts`) both read it, so a new module is one entry
there plus its route files (`practice/<route>/index.tsx` and
`(session)/practice/<route>/{session,result}.tsx`);
`src/navigation/__tests__/practice-modules.test.ts` checks each entry's
route files exist. The challenge rules (`MISTAKE_LIMIT`,
`CHALLENGE_TIME_LIMIT`) come from the same package.

**Training mode** (every challenge module, plus quadrants) is
the untimed `training.tsx` beside each module's timed `session.tsx`: it runs
on `useBatchTrainingSession` from `@blindfold-chess/features/practice-session`
with the module's pure question/answer functions, renders inside
`PracticeTrainingScreen` (score, optional skip, End → back to setup), and is
opened by the setup screen's second button (`onStartTraining` on
`PracticeSetupScreen`). It has a header with a × and closes without asking,
unlike the timed session. Route planner's training runs its own loop over
`generateProblem` (its problems are not a question batch).

## i18n is a separate dictionary from the web app

Mobile uses i18next (`src/i18n/index.ts`) with its own resources in
`src/i18n/resources/{en,es,ja,pt-BR}.json` (flat, ~300 lines each). It shares
nothing with `apps/web/src/messages/*.json` except the locale helpers from
`@blindfold-chess/features/locale`. A string that exists on both platforms is
therefore edited twice, in two different key schemas, and a feature that
exists only on the web (Daily Puzzle, dojo, articles, …) has no mobile key at
all. `src/i18n/__tests__/parity.test.ts` keeps the four files' key sets equal.
Keys are read with `t("...")`; some call sites build the key from a namespace
variable (for example `features/help/HelpSheet.tsx`), and those sites list the
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

To look at screens without a simulator, `npx expo export --platform web`
(react-native-web is a dev dependency) and open the export in Chromium at a
phone viewport. It shows layout and flows; native-only parts differ there —
`NativeTabs` renders as a web tab strip at the top, and sheets and headers
are the web fallbacks — so check those on a device or simulator.
