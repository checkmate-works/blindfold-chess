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
- `pnpm copy-stockfish`: Copy the Stockfish engine into `assets/stockfish/` (required before the first run)
- `pnpm lint`, `pnpm typecheck`, `pnpm test`: Quality gates (Vitest for tests)
- `pnpm bundle-learn-content`, `pnpm bundle-glossary`: Regenerate the content copied from the web app. Re-run them after the web's articles or glossary change

## Environment Variables

All are optional in development and baked in at build time (`EXPO_PUBLIC_*`).
A release build without them has no accounts and runs signed out only.

| Variable                               | Development default         |
| -------------------------------------- | --------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`             | `http://<Metro host>:54321` |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase CLI's local key    |
| `EXPO_PUBLIC_API_ORIGIN`               | `http://<Metro host>:3000`  |

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
