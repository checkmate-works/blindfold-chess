# Blindfold Chess (mobile)

The React Native (Expo) app. It runs every practice module on the device and
talks to a server only for accounts, recorded challenges and puzzles, through
the web app's mobile API (`/api/mobile/v1/*`). Node.js, pnpm and the workspace
install are covered in the [root README](../../README.md).

## Quick Start

### Prerequisites

- Everything in the root README's [Prerequisites](../../README.md#prerequisites)
- **iOS Simulator:** Xcode with an iOS simulator runtime (macOS only)
- **Physical device:** [Expo Go](https://expo.dev/go) from the App Store or
  Google Play, on the same Wi-Fi network as your computer

Expo Go only opens projects built for the SDK it supports, and the store
version supports only the latest SDK. This app is on the SDK in
`package.json` (`expo`). If Expo Go has moved past it, see
[When Expo Go does not support the SDK](#when-expo-go-does-not-support-the-sdk).

### Setup

```bash
# Copy the Stockfish engine into assets/ (required: the bundle imports it)
pnpm --filter mobile copy-stockfish
```

### Backend (optional)

Every practice works signed out, so the app starts without a backend. Signing
in, recorded challenges and puzzles need the web app's local stack: Supabase
and `next dev`. Set it up as described in the
[web README's Quick Start](../web/README.md#quick-start), then keep both
running:

```bash
pnpm supabase start          # from apps/web; Supabase on :54321
pnpm --filter web dev        # the web app and its mobile API on :3000
```

A development build needs no configuration to reach them. With no
`EXPO_PUBLIC_*` variables set, it uses the host Metro is served from, the
same address Expo Go connected to, so the device reaches the stack on your
computer:

| Service             | Address               |
| ------------------- | --------------------- |
| Supabase            | `http://<host>:54321` |
| Web app, mobile API | `http://<host>:3000`  |

The Supabase key is the Supabase CLI's fixed local publishable key. The
logic is in [`src/auth/config.ts`](src/auth/config.ts).

To sign in, seed the local test users with `pnpm db:seed:dev` from `apps/web` (see
[Local Test Data](../web/README.md#local-test-data)).

#### Google sign-in against the local stack

Google sign-in works in Expo Go as well as in a development build. Expo Go
returns to `exp://<LAN IP>:8081/--/auth-callback` instead of
`blindfold-chess://auth-callback`, and the local `config.toml` allows both.
Three things have to be in place:

- Google credentials for the local Supabase in `apps/web/supabase/.env`, as
  in the web app's
  [authentication setup](../web/docs/authentication-setup.md). Restart
  Supabase (`pnpm supabase stop && pnpm supabase start`) after changing them
  or `config.toml`.
- The buttons turned on when starting Metro. On iOS the Google button is
  shown only together with Apple's (App Store Review Guideline 4.8), so list
  both:

  ```bash
  EXPO_PUBLIC_OAUTH_PROVIDERS=apple,google pnpm --filter mobile dev
  ```

  The Apple button then shows too, but Apple is disabled in the local
  Supabase, so only Google can complete.

- Phone and computer on the same network, as for the rest of the backend.

### Running on the iOS Simulator

```bash
pnpm --filter mobile ios
```

This boots a simulator and installs the matching Expo Go into it, which works
for any SDK. The simulator runs on your computer, so the backend is reached on
`localhost` with nothing else to set up.

### Running on a physical device

```bash
pnpm --filter mobile dev
```

Scan the QR code with the Camera app (iOS) or Expo Go (Android).

- **Same network, LAN mode.** The phone and the computer must be on the same
  Wi-Fi. If the macOS firewall is on, allow incoming connections for Node (Metro
  on 8081, the web app on 3000) and Docker (Supabase on 54321).
- **Allow Local Network access.** On first launch iOS asks whether Expo Go
  may find devices on the local network. Choose Allow; if you deny it, the app
  cannot reach Metro, Supabase or the web app. To change it later, go to
  Settings > Privacy & Security > Local Network.

#### When LAN mode is not possible

`expo start --tunnel` works across networks, but the app then sees the tunnel
host, not your computer, and the backend can no longer be found
automatically. Give all three addresses explicitly, using your computer's LAN
IP:

```bash
EXPO_PUBLIC_SUPABASE_URL=http://<LAN IP>:54321 \
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Publishable key from `pnpm supabase status`> \
EXPO_PUBLIC_API_ORIGIN=http://<LAN IP>:3000 \
pnpm --filter mobile dev --tunnel
```

Set all three. When any one of them is missing, the missing ones fall back to
the Metro host, which is the tunnel in this case.

### When Expo Go does not support the SDK

When Expo Go has moved to a newer SDK than this app, the QR code fails with
_"Either upgrade this project to SDK N, or launch it in an iOS simulator"_.
Either run in the simulator (above), upgrade the app's SDK, or use a
**development build**: a build of this app with the Expo dev client built in,
which loads the JavaScript from Metro like Expo Go does.

```bash
# iPhone connected to the Mac by cable; needs Xcode and an Apple developer account for signing
cd apps/mobile && npx expo run:ios --device
```

EAS can build a development build in the cloud instead. After the first
install, start Metro with `pnpm --filter mobile dev` as usual, and code
changes reach the device without rebuilding. Rebuild only when native
dependencies or `app.json` change.

> [!NOTE]
> Not yet verified on a device: a development build may be blocked from
> plain-HTTP requests to the local stack by iOS App Transport Security (ATS).
> If sign-in fails with a network error in a development build but works in
> Expo Go, suspect ATS first.

## Available Scripts

Run from `apps/mobile`, or from the root with `pnpm --filter mobile <script>`:

- `pnpm dev` / `pnpm start`: Start Metro (Expo)
- `pnpm ios` / `pnpm android`: Start Metro and open the iOS Simulator / Android emulator
- `pnpm testflight`, `pnpm testflight:status`: Build for iOS on EAS and submit to TestFlight (see [Shipping to TestFlight](#shipping-to-testflight))
- `pnpm copy-stockfish`: Copy the Stockfish engine into `assets/stockfish/` (required before the first run)
- `pnpm lint`, `pnpm typecheck`, `pnpm test`: Quality gates (Vitest for tests)
- `pnpm bundle-learn-content`, `pnpm bundle-glossary`: Regenerate the content copied from the web app. Re-run them after the web's articles or glossary change

## Environment Variables

All three are optional in development and baked into the bundle at build time
(`EXPO_PUBLIC_*`). A release build needs **all three**: if any is missing it
has no accounts and runs signed out only.

| Variable                               | Development default         | Release builds                        |
| -------------------------------------- | --------------------------- | ------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`             | `http://<Metro host>:54321` | `https://<ref>.supabase.co`           |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase CLI's local key    | The production `sb_publishable_…` key |
| `EXPO_PUBLIC_API_ORIGIN`               | `http://<Metro host>:3000`  | `https://www.blindfold-chess.online`  |

The Supabase URL and publishable key are in the Supabase Dashboard under
Project Settings > API. Everything in `EXPO_PUBLIC_*` ships inside the app, so
never put a secret in one.

### Release builds

Release builds read these from the EAS `production` environment (the
`production` profile in `eas.json` names it). Set them once from `apps/mobile`:

```bash
npx eas-cli env:create --environment production --visibility plaintext \
  --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co
npx eas-cli env:create --environment production --visibility plaintext \
  --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value sb_publishable_…
npx eas-cli env:create --environment production --visibility plaintext \
  --name EXPO_PUBLIC_API_ORIGIN --value https://www.blindfold-chess.online
```

`npx eas-cli env:list --environment production` shows what is set.

## Shipping to TestFlight

The EAS project is `@k0kishima/blindfold-chess` (`extra.eas.projectId` in
`app.json`); the bundle identifier is `online.blindfoldchess.app`. EAS keeps
the build number and raises it on every build (`appVersionSource: remote` +
`autoIncrement`); the user-facing version is `version` in `app.json`. The app
uses no encryption beyond HTTPS, so `usesNonExemptEncryption: false` answers
App Store Connect's export-compliance question once for every build.

```bash
pnpm --filter mobile testflight                     # check, queue, print the build ID
pnpm --filter mobile testflight:status <ID> --watch # follow the build and the submission
```

`testflight` checks that HEAD is a pushed commit on main, that dependencies
are installed, that you are logged in to EAS, and that the three variables
above exist in the `production` environment, then runs
`eas build --platform ios --profile production --auto-submit` without waiting.
Pass `-- --any-branch` to build from another branch.

- **The first build is interactive.** Run
  `npx eas-cli build --platform ios --profile production --auto-submit` once
  in a terminal: it asks for your Apple ID and lets EAS create and keep the
  distribution certificate and provisioning profile (answer Yes to each), and
  the first submission creates the app record in App Store Connect. Later
  builds run non-interactively through `testflight`.
- EAS uploads only files Git tracks, so the Stockfish engine (gitignored,
  copied from `node_modules`) is missing on the build machine. The
  `eas-build-post-install` script in `package.json` runs `copy-stockfish`
  there after dependencies are installed; keep it when renaming scripts.
- After App Store Connect finishes processing (10-30 minutes), add yourself to
  an internal testing group in TestFlight to install it. Internal testing
  needs no review.
- The build talks to the production Supabase and web app, so accounts made
  while testing are real production accounts.
- EAS's free plan allows a limited number of iOS builds per month
  (`npx eas-cli account:usage`). Check changes in the simulator before
  spending a build on them.

## Tech Stack

- Expo / React Native, Expo Router
- TypeScript
- Supabase Auth (session in SecureStore)
- i18next
- Vitest (Unit Testing)

The app's structure, navigation and conventions are described in
[CLAUDE.md](CLAUDE.md).

## License

MIT
