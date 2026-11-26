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

- `(tabs)` — the bottom tabs (`(tabs)/_layout.tsx`): Home, Dojo, Practice,
  Play, Learn, drawn by the OS through expo-router's `NativeTabs`
  (`expo-router/native-tabs`; on iOS 26 the floating Liquid Glass
  bar that shrinks on scroll, Material 3 on Android). Icons are SF Symbols on
  iOS and Material Community Icons (via `VectorIcon`) on Android. Each tab is
  a stack with only its entry screen (`TabStack` in
  `navigation/stack-options.tsx`, left-aligned 22pt title; on iOS 26
  without the glass capsule behind the title, and with the hairline under
  the header that pushed screens leave out). The tabs layout
  is also the onboarding gate: `/` is the home tab, and a first launch is
  redirected to `/onboarding`. `NativeTabs` is unstable API: re-check its
  props whenever the Expo SDK changes. Five is the iOS bar's limit before it
  folds the rest into "More", so Settings is not a tab: it is
  `settings/index.tsx` on the root stack, opened from the gear in the home
  header (`TabStack`'s `headerRight`).
- Detail screens are pushed on the root stack, above the tabs, so the tab
  bar hides on them: each module's setup at `practice/<route>/index.tsx`
  (URL `/practice/<route>`), the AI-game setup at `play/ai-game`, the saved
  games at `play/games`, learn articles at `learn/[slug]`, a dojo rank at
  `dojo/ranks/[slug]`, its guide at `dojo/guides/[rank]`, its exam at
  `dojo/exams/[rank]` and its requirements at `dojo/requirements/[rank]`.
- `(session)` — timed sessions, results and training runs
  (`(session)/practice/<route>/{session,result,training}.tsx`,
  `(session)/play/ai-game/*`), presented as one `fullScreenModal`. A full
  screen modal has no swipe-to-dismiss, so a timed run cannot be abandoned by
  an edge swipe; every screen in it closes it with `useCloseSession`
  (`navigation/use-close-session.ts`, which pops the modal off the root stack
  and falls back to an href when nothing is underneath). Session → result is
  a `router.replace` inside the modal. A module with `sessionHeader`
  (`navigation/practice-modules.ts`; every practice module now) gives its
  session a stack header like its result and training screens: the
  module's name and the ×. A timed challenge renders `PracticeSessionScreen`
  with `headerShown`: the hearts and the clock in a row of their own below,
  and a Quit link under the score. With `countdownInBody` the countdown
  stands inside the body (over the board, or where the square will appear)
  instead of covering the screen. The free-play modules (knight tour,
  algebraic notation, FEN, position memory, recall, puzzle) have no clock or
  hearts, so they take the header from the flag alone and stack their own
  `ScrollView` and `BottomBar` under it. Timed sessions ask before leaving.
  Screens without a stack header (the AI game, the challenge gate) draw the
  × with `SessionTopBar`.

Screen titles and options are registered in the layouts, not in the
screens: `moduleSetupScreens` / `moduleSessionScreens`
(`navigation/module-stack-screens.tsx`) generate them for every module in
`navigation/module-routes.ts`, and `useStackScreenOptions` holds the shared
header style (page-coloured, no hairline, chevron-only back).

## UI parts

- **The look is flat** (the tokens are in `theme/surface.ts`, merged into
  `useTheme().colors`): the ground of every screen is `colors.page`, white.
  A panel (card, list, bottom bar, the dojo's stage cells) is white with a
  1px `panelBorder` and no shadow; rows inside it are split by
  `rowSeparator`. `colors.background` is not the page: it is the sunken
  fill laid inside a panel (a field, a track). Blue (`primary`) is for the
  main action only — the primary button and text actions — while headers
  and tabs are ink. While pressed, a control changes only its fill
  (`primaryPressed`, `muted`, a belt's `tintPressed`), never its position,
  size or opacity. Colours always come from `useTheme().colors`; a screen
  never writes a hex.
- **Lists and settings** use `ListSection` / `ListRow` / `ListIcon`
  (`components/List.tsx`, the inset-grouped list), `SelectRow` (shows the
  value; picks a new one in a bottom sheet) and `SwitchRow` (platform switch)
  from `components/SettingRows.tsx`. Tab entry screens scroll in
  `TabScrollView` (automatic content insets, so the floating tab bar does not
  cover the last row).
- **Done is one mark:** `DoneMark` (`components/DoneMark.tsx`), a white
  check in a green circle — `"md"` in a row's `trailing`, `"sm"` beside a
  line of text. Never a bare "✓" or a green `checkmark` icon of its own; a
  plain check stays only for what is not "done" (a selected row, a valid
  input).
- **Filters over a list** are `FilterChips` (`components/FilterChips.tsx`):
  one row of single-choice `SelectableChip`s that scrolls sideways when it
  outgrows the screen, with "All" as a chip of its own.
- **Half modals:** `BottomSheet` (`components/BottomSheet.tsx`) for option
  lists, help and pickers inside a screen — it works inside the session
  modal and sizes to its content. Closes on backdrop tap, Android back, or a
  drag on its top row. Only the dimmed backdrop lifts it (no border/shadow).
- **Setup screens** take the web's sections, above the app's own
  two-button footer, as grouped panels (`ListSection`) rather than the web's
  underlined headings: `HowToPlaySection` (the `moduleHelp` how-to-play text
  over the module's demo), then "Game Settings" when the challenge has any
  (board orientation as the web's swatches, `BoardOrientationSelector`;
  the piece to drill as the web's piece buttons, `PieceSelector`), then the
  web's "Required Knowledge" / "Related Articles" as one row per article into
  the learn screen (`RequiredKnowledgeSection` or `RelatedArticlesSection`,
  whichever of the two headings the web's page uses — there is no free-text
  title, so a screen cannot drift to a third name — from the slugs alone;
  `pieces` draws a piece in a row's icon), then the
  sign-in row (`ChallengeRulesNote`). The demo is the web's picture, but it
  plays the answer on a loop (`useDemoAnswerLoop`, one beat for every
  module). The header names the module, as the web page's title does.
  That is the challenge modules' shape (coordinate quiz, legal moves, board
  symmetry, square colors, diagonal quiz, route planner, quadrants).
  Quadrants is a challenge that is never recorded, so in place of the
  sign-in row it says so. A free-play module (no challenge, no training)
  has the web's shorter setup: its description or settings
  (`ListSection`), the related articles (`RelatedArticlesSection`, or
  `RequiredKnowledgeSection` where the web says "Required Knowledge"), and a
  single Start in the `BottomBar` — no demo and no sign-in row. Recall
  starts from its PGN box and colour picker; puzzles from the list, then a
  detail page `practice/puzzle/[id]` on the root stack (title set by the
  screen's own `<Stack.Screen options>`). A puzzle result's Try Again closes
  back to that detail page and Back to List `dismissTo`s the list.
- **Two-way answers** (square colors' light / dark, legal moves' legal /
  illegal) are `AnswerPair` (`components/AnswerPair.tsx`): the module paints
  the two buttons and sizes them; the pair owns the press shrink, the verdict
  ring (laid over the border, so it never moves the layout) and the dimmed
  other button. Without `onAnswer` it is a still picture for a setup demo.
- **Square entry** (board symmetry, diagonal quiz, route planner) is
  `CoordinateInput` (`components/CoordinateInput.tsx`), the web's
  `CoordinateInput`: the file row and the rank row, built from
  `CoordinateKeyRow` (which owns the keys' size, radius and colours; knight
  tour uses the row directly). It has two kinds of "off": `disabled` locks
  the whole pad at half opacity and keeps the staged keys filled (a
  verdict, a countdown), while `disabledFile` / `disabledRank` turn single
  keys off (diagonal quiz's file-then-rank steps). `showFiles` /
  `showRanks` draw one row, for a module that spaces the rows itself. What
  a press means stays in the module: the route planner's either-order
  reducer and piece row, the diagonal quiz's step hint, backspace and
  Clear. A module whose lock covers more than the keys (route planner)
  fades its own container and leaves `disabled` off, or the two opacities
  multiply.
- **Picture boards** — a board that explains an answer and takes no tap on
  its squares (diagonal quiz's `DiagonalBoard`, route planner's
  `RouteBoard`, quadrants' `QuadrantBoard`) — are `StaticBoard`
  (`components/StaticBoard.tsx`): the module gives each square a tint
  (`squareTint`) and content (`renderSquare`); the board owns the themed
  squares, the coordinate letters, the rounded corners
  (`STATIC_BOARD_RADIUS`) and the size — up to `maxSize`, filling its
  container, or the screen less `horizontalInset` when the size must be
  known on the first frame. The letters are shown by default, since they
  are part of the explanation; a board played on passes the player's
  preference to `showCoordinates` instead, and `flipped` turns it to
  Black's side. A board answered by region (quadrants' quarters) lays its
  own touch targets and lines over the squares with `renderOverlay`,
  inside the board's clipped frame. A board the player answers square by
  square (coordinate quiz, FEN recreation, knight's tour) is not one. The
  AI-game `ChessBoard` and `FenBoard` are
  still separate: they differ in corner radius, label size and flipping.
  `FenBoard` takes `horizontalInset`, `squareTint` and `showCoordinates` for
  the FEN and position-memory answers. A board inside a padded panel must
  be capped (`ChessBoard`'s `maxSize`, `BoardPeek`'s `boardMaxSize`,
  `ButtonInput`'s `fitWidth`), or it runs past the panel's edge.
- **Around a tapped board** (coordinate quiz, quadrants): the side to move
  above it is `TurnIndicator` (`components/TurnIndicator.tsx`). The module
  passes the side and its own label, and `hidden` blanks the row during
  the countdown without moving the layout. `variant` is `"theme"`
  (coordinate quiz) or `"web"`, the web's greys (quadrants). A countdown
  that stands inside the body (`countdownInBody`) over the board is
  `BoardCountdown` (`components/BoardCountdown.tsx`), a sibling after the
  board in a wrapper the board fills. Give it the board's `borderRadius`,
  since the board's own clipping does not reach it.
- **Run progress** over a free-play session (algebraic notation, FEN,
  position memory, knight tour, recall) is `ProgressBar`
  (`components/ProgressBar.tsx`), the web's `ProgressBar`: "n / N" in
  tabular digits over an 8pt rounded track, clamped, with the progressbar
  role. A module passes only `current` and `total`.
- **Problem Details** under a challenge result (diagonal quiz, route
  planner) is `ProblemDetailsList` (`components/ProblemDetailsList.tsx`):
  a `ListSection` titled `practiceResult.problemDetails` with one row per
  problem — "No.N", the module's subtitle, the verdict (OK / NG / skipped,
  or time-up in a neutral colour with a clock, never as one more wrong
  answer). Rows open independently, and the ones not answered right start
  open. The module supplies only `verdictOf` (fold its flags with
  `problemVerdict`), `renderSubtitle` and `renderDetails`; a module scored
  by points rather than right or wrong (FEN, position memory) draws its own
  badge with `renderVerdict` and opens no row at first
  (`initiallyOpen="none"`); a board sized
  from the window width subtracts `PROBLEM_DETAILS_INSET`. The session
  hands each problem's result to the result screen in a route param
  (`lib/result-params.ts` in each module), since `onComplete` carries only
  the totals.
- **Result stats** from `deriveResultStats` carry a `key`
  (`ResultStatKey`); a module that leaves one out (quadrants' average time,
  via `hideAverageTime`) filters by key, never by the translated label.
- **Help:** a practice setup screen's header has a ? that opens
  `HelpSheet` (`features/help/`), paged: how to play and the web tutorial's
  explanation steps. The web's challenge/training mode pages are not ported
  (the setup screen already says all of it). A module with
  `howToPlayOnSetup` leaves its how-to-play page out (`helpPagesFor`), and
  one with no page left gets no ? at all (coordinate quiz, legal moves,
  square colors, quadrants, algebraic notation). For a module the web gives
  no help at all, the generated "about" page is the module's own
  description, which the setup screen already opens with, so it goes too.
  Board symmetry, diagonal quiz and route planner keep the ? for the web
  tutorial's explanation steps.
  `PracticeSetupScreen` finds the module from the route, so a setup screen
  needs nothing for it.
- **Header buttons** are `HeaderIconButton`; the session close button is
  `SessionCloseButton`.
- **Buttons pinned under scrolling content** (setup, session, result and
  onboarding footers) go in `BottomBar`, which pads the home indicator's
  inset itself so the bar runs to the bottom edge. Its screen leaves
  `"bottom"` out of `Screen`'s `edges`; padded there too, the inset shows as
  a grey strip under the bar.
- Web pages (terms, privacy, FAQ, contact, licenses) open in the browser via
  `lib/web-pages.ts`, never in a WebView.

## Content copied from the web

Generated, not edited by hand; re-run the script after the web changes:

- `scripts/port-help-texts.py` — the practice modules' how-to-play and
  tutorial texts (`moduleHelp.*` in the four dictionaries and
  `features/help/module-help-pages.ts`), recall's strings (`recall.*`) and
  the account screens' (`account.*`) and the puzzle screens' (`puzzle.*`,
  which also take `practice.common`'s white / black / play / replay).
- `pnpm bundle-glossary` (`scripts/bundle-glossary.ts`) — the web's glossary
  seed into `features/glossary/generated/`.
- `pnpm bundle-learn-content` (`scripts/bundle-learn-content.ts`) — the web's
  learn articles and SVG figures into `features/learn/generated/`. They
  render through `features/learn/markdown.ts` + `MarkdownView` (the markdown
  subset the articles use; LaTeX becomes plain text). Articles have no pt-BR
  text yet and fall back to English.
- `pnpm bundle-guides` (`scripts/bundle-guides.ts`) — the web's dojo guides
  (教本, `guides.pages` of the four dictionaries) into
  `features/guides/generated/`, with each paragraph's link card (asked of the
  web's `getGuideInlineLink`) and visual aid (component name and props, read
  out of the web's `VISUAL_AID_MAP` as text). They render through
  `GuidePageView`; every visual aid has a native drawing in
  `features/guides/visual-aids/renderers.tsx`, typed over the generated name
  union, so a component the web starts using fails the typecheck until it is
  drawn. A link card opens the app's screen when it has the page (a bundled
  article, a practice's setup, another guide) and the web otherwise. Only
  the flat format is bundled; the script refuses a chaptered guide, which
  would need a chapter screen first.

Shared data lives in `@blindfold-chess/features` instead where both apps
read it: the position-memory presets (`fen-practice`'s
`POSITION_MEMORY_FENS`), the opening families (`openings`), and the guide
boards' positions and diagonal tables (`dojo-guides`).

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
- **The dojo** (`(tabs)/dojo`, `features/dojo/`) draws the belt ladder from
  `@blindfold-chess/features/dojo-ranks` (order, colours, requirements; the
  web seed is pinned to it by a test) and asks exactly the shared
  requirements, as the web does. Each rank is a journey of three stages
  built by `@blindfold-chess/features/dojo-journey`: learn (one step per
  guide page), practice (each `challenge_score` challenge finished once)
  and exam (the requirements). `useDojoJourney` is the one input every
  screen reads:
  - the rank is the server's only (the account's `highestRank`); nothing
    on the device raises it.
  - signed in: completed steps are `GET /dojo`'s `completedSteps` plus the
    user's pages not sent yet; best scores are the server's. Signed out:
    the device's guest marks, no scores.
  - the device's marks (`progress-store.ts`, AsyncStorage
    `"DOJO_PROGRESS"`) are kept per owner — `guest` (pages, challenges
    finished signed out) and `byUser[userId].pendingSteps` — so a shared
    device never gives one person's pages to another. The guest's pages go
    to the first account that signs in, once (`guestImported`); its
    challenge marks are never sent.
  - `syncDojoProgress` (`progress-sync.ts`, on focus and sign-in) imports
    the guest's pages, sends the pending ones (`POST /dojo/steps`, 100 per
    request), drops what the server answered for, then reads `GET /dojo`.
    A failed request keeps the pending pages for the next sync.
  - the guide screen marks a page read on Next, and the last page with
    "Mark as read". Only `guide:` keys are ever reported.
  - an exam problem (`dojo/exams/[rank]`, then the position-memory or
    puzzle session with an `exam` param) is graded by its result screen
    (`exam-run.ts`, `ExamVerdictCard`): a signed-in player for whom the
    exam is the next rank or a held one sends the answer to
    `POST /dojo/exams/[rank]/[problem]` and the server grades and records
    it; anyone else is graded on the device and nothing is recorded.
    1kyu and 1dan (publishing a game) still open the web.
  - a rank's stage cells (`RankStageProgress`, a chevron on each line
    between them, since the stages come in order) are links on every rank
    and every screen they appear on; `stageTarget` (`stage-target.ts`)
    picks the destination so the screens cannot disagree. A cell is the way
    into its whole stage, so every cell opens that stage's list: learn →
    the learn tab's list of guides, practice → the practice list narrowed
    to the rank (both tabs, so `router.navigate`, since `push` would stack
    a second list on the tab), exam → the rank's requirements screen
    (`dojo/requirements/[rank]`, `requirementsHref`): "Passed n / N" over
    `RankRequirementList`, so the player sees at a glance which
    requirements are already passed rather than landing in the first unmet
    one's screen. Once all are met (or the rank is held) it ends with a
    row to the next rank's screen (not its requirements: a rank starts
    with its guide and practice), none on 1dan. The requirements screen
    never shows the cells, so `navigate` to it always pushes. The
    next-step button (`stepTarget`) is what goes straight to the one next
    thing (for learn, the next unread page itself, `?page=<n>`).
  - the learn tab (`(tabs)/learn`) opens with the guides, one row per guide
    in ladder order, before the glossary and the articles: the done mark once
    read through, "n / N" part way, nothing before the first page, and a
    press opens the guide at its first unread page
    (`/dojo/guides/<rank>?page=<n>`; the guide screen ignores a page it
    does not have). Read
    pages are counted by `features/guides/reading-progress.ts`, which the
    guide screen reads too: a page is read when any rank's journey has it
    done, since the unranked guide belongs to 5kyu's.
- `(account)` screens: welcome (the account offer that ends onboarding),
  sign-in, sign-up, setup-username, records (the user's own ranks).
  Settings has the Account section.
- **One-tap sign-in** (`auth/oauth.ts`, `features/account/OAuthButtons.tsx`):
  Sign in with Apple through the native sheet and `signInWithIdToken` (iOS
  only), Google through Supabase's hosted page in an in-app browser session
  with PKCE, returning to `blindfold-chess://auth-callback`. The build
  variable `EXPO_PUBLIC_OAUTH_PROVIDERS` (`apple,google`) turns the buttons
  on; unset shows none. On iOS, Google is shown only together with Apple
  (App Store Review Guideline 4.8). Before turning a provider on, enable it
  in the Supabase dashboard (Apple: the bundle ID as a client ID) and add
  `blindfold-chess://auth-callback` to the Redirect URLs (the local
  `config.toml` also allows Expo Go's `exp://**/--/auth-callback`; production
  must not). Either provider's
  first sign-in creates the user without a username, and
  `useFinishSignIn` sends it on to setup-username, as email sign-in does.

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

## Onboarding

A first launch opens `/onboarding`: the mentor's chat
(`features/onboarding/`, script in `data/script.ts`). Statements play on their
own; the player answers one question about how well they play, and the
finish button opens the first session over the home tab — blindfold-confident
→ an AI game at skill level 1, otherwise coordinate-quiz training. It also
arms a one-time flag (`sign-up-offer.ts`); when that session closes, the home
tab (`useSignUpOffer`) opens `/welcome` for a signed-out player. Skip goes
straight home without either. The offer never promises to keep the run just
played: AI games stay on the device either way, and a signed-out challenge or
training run is graded on the device, so the server has nothing to record.

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

**The list narrows by rank** (`features/practice-list/`). A practice's rank
is `rankForPracticeMenuType` from `@blindfold-chess/features/dojo-ranks`,
the same function the web's practice badges read. The chips are All plus
every rank at least one mobile practice belongs to (mukyu to 2kyu today;
1kyu and 1dan ask for AI games and would only ever list nothing). A
narrowed list keeps the challenge / free-play sections and drops the ones
left empty; a practice no rank asks for is under All only. Another screen
opens the list narrowed with `/practice?rank=<slug>` (`practiceListHref`);
the list applies the param and clears it with `router.setParams`, because
the tab stays mounted and an uncleared param would not change the next
time, leaving whatever filter the player picked in between. Each row shows
its practice's share of its rank's practice stage, counted from the same
`useDojoJourney` steps as the rank card (`practice-progress.ts`): the done mark
for a single challenge once tried, "n / N" for several (legal moves on
4kyu), nothing for mukyu practices or those without a challenge on their
rank.

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

## TypeScript 7 works only because Expo no longer loads the compiler

`apps/mobile` is on TypeScript 7 like the rest of the workspace, and that
holds only as long as Expo's CLI never calls the TypeScript **JS API**.
TypeScript 7's npm package exports only `version` and `versionMajorMinor`.
Up to SDK 54, `@expo/cli` resolved the project's `typescript` and called
`ts.sys` / `readConfigFile` / `parseJsonConfigFileContent` to read `paths`
out of `tsconfig.json` for Metro, so under TS7 `expo start` died with
`TypeError: Cannot read properties of undefined (reading
'getCurrentDirectory')` before Metro started, and the app was pinned to 5.9.
From SDK 58 (verified against expo ~58.0.26 / @expo/cli 58 / RN 0.88.1),
`createTypescriptResolver` parses the tsconfig `extends` chain itself and
never loads the compiler.

`tsc --noEmit` passes under either compiler, so typecheck does not catch a
regression. After an SDK upgrade, run `expo start` and request a bundle, or
run `expo export --platform ios --platform android`; if it fails in tsconfig
handling, suspect TypeScript first. `typescript`, `react` and `react-dom` are
listed in `expo.install.exclude` so that `expo install --fix` and expo-doctor
leave them on the workspace versions instead of the SDK's recommended pins.
React must also match the version in `packages/features`, or Metro bundles
two copies; when React Native raises its React peer, raise React across the
workspace.

## Commands

`pnpm --filter mobile dev` (Expo), `lint`, `typecheck`, `test` (Vitest). The
Stockfish wasm is copied in by `copy-stockfish` (`scripts/copy-stockfish.ts`).

To look at screens without a simulator, `npx expo export --platform web`
(react-native-web is a dev dependency) and open the export in Chromium at a
phone viewport. It shows layout and flows; native-only parts differ there —
`NativeTabs` renders as a web tab strip at the top, and sheets and headers
are the web fallbacks — so check those on a device or simulator.
