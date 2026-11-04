# Authentication Setup

## Overview

User authentication is **Supabase Auth**. One account can have several login methods linked to it:

| Login method     | Web | iOS app (planned) | Notes                                                                                                                         |
| ---------------- | --- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Email + password | ○   | ○                 | A password is set or changed through the recovery email (`/reset-password`), never typed into the account page                |
| Google           | ○   | —                 | The same provider can be linked more than once (work and personal). One Google account can belong to only one of our accounts |
| Apple            | —   | ○                 | No web entry point. Once the iOS app links an Apple identity, the web account page lists it and can remove it                 |

Linking, unlinking and changing the email address happen on the web account page (`/mypage/account`). The reasoning behind the design (why several identities of one provider are allowed, the "keep a web login" rule for removal, why passwords go through the recovery email) is in the TSDoc of `apps/web/src/app/[locale]/(protected)/mypage/(confirmed)/account/page.tsx` and in `packages/features/src/account/login-methods.ts`.

Supabase Auth also links a Google sign-in whose email matches an existing account **automatically**; that is always on and has no setting (it is separate from "Allow manual linking" below).

**Production does not read `supabase/config.toml`.** Local runs use `config.toml`, production uses the Supabase Dashboard, and the values are kept identical by hand. When you change a key in `config.toml`, update this document and the Dashboard too.

## Supabase Project Settings

### Data API (PostgREST)

When creating the Supabase project, **disable** the "Autogenerate a RESTful API for your public schema" option.

This project uses `supabase-js` only for Auth (GoTrue). Database access is handled directly via Drizzle ORM + `postgres`, so the auto-generated REST API (PostgREST) is not needed. Leaving it enabled exposes an unused endpoint and unnecessarily increases the attack surface.

> **Note:** Disabling the Data API does not affect Auth functionality. `supabase.auth.*` methods communicate with GoTrue (`/auth/v1/...`), which is independent of PostgREST (`/rest/v1/...`).

## Supabase Dashboard Settings (production)

The `config.toml` key next to each item is what local development reads. Dashboard labels are as of 2026-11; if the UI moves, search for the setting by the meaning of the `config.toml` key.

### Authentication > Sign In / Providers

| Dashboard item             | Value  | `config.toml`                      | Used for                                                                                                                 |
| -------------------------- | ------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Allow new users to sign up | ON     | `[auth] enable_signup`             | Registration                                                                                                             |
| Allow manual linking       | **ON** | `[auth] enable_manual_linking`     | "Add a Google account" and "Remove" on the account page (`linkIdentity` / `unlinkIdentity`). Both fail while this is OFF |
| Allow anonymous sign-ins   | OFF    | `[auth] enable_anonymous_sign_ins` | Not used                                                                                                                 |

**Email** (same page, under Auth Providers)

| Dashboard item          | Value              | `config.toml`                         | Used for                                                                                                                                        |
| ----------------------- | ------------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Enable Email provider   | ON                 | `[auth.email] enable_signup`          | Sign-up and sign-in with email + password                                                                                                       |
| Confirm email           | ON                 | `[auth.email] enable_confirmations`   | Confirm the address before the first sign-in                                                                                                    |
| Secure email change     | ON                 | `[auth.email] double_confirm_changes` | An email change is confirmed from **both** the old and the new address (older Dashboards call it "Double confirm email changes")                |
| Secure password change  | ON                 | `[auth.email] secure_password_change` | A session older than 24h must re-authenticate to change its password. The app changes passwords through the recovery link, so it has no such UI |
| Minimum password length | `6`                | `[auth] minimum_password_length`      | Same value as `MIN_PASSWORD_LENGTH` in `apps/web/src/config.ts`                                                                                 |
| Password Requirements   | Letters and digits | `[auth] password_requirements`        | Same rule as `src/lib/validations/password.ts` (`letters_digits`)                                                                               |

**Google** — see [Google Sign-In Setup](#google-sign-in-setup) below.

**Apple** — for the iOS app; not configured yet. See [Apple Sign-In (Planned)](#apple-sign-in-planned).

### Authentication > URL Configuration

| Dashboard item | Value                                                               | `config.toml`                     |
| -------------- | ------------------------------------------------------------------- | --------------------------------- |
| Site URL       | The production URL (`https://your-domain.com`)                      | `[auth] site_url`                 |
| Redirect URLs  | `https://your-domain.com/**`, plus `http://localhost:3000/**` (dev) | `[auth] additional_redirect_urls` |

Every authentication email links to `{{ .SiteURL }}/auth/callback?...`, so a wrong Site URL sends the links to the wrong site.

### Authentication > Emails > Templates

The three authentication emails (sign-up confirmation, password recovery, email change) are pasted from `supabase/templates/*.html`. Steps and subject lines are in [resend-smtp-setup.md](resend-smtp-setup.md), section "3. Set Up Email Templates". Sending from the project's own domain needs the Resend setup in the same document first.

### Authentication > Rate Limits

Corresponds to `[auth.rate_limit]` locally. The email send budget (`email_sent`) applies on top of the app's own per-user limits for the account page actions (`RATE_LIMITS.requestEmailChange` / `requestPasswordSetup` in `apps/web/src/lib/security/rate-limit.ts`).

## Google Sign-In Setup

### 1. Create OAuth Credentials in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** > **Credentials**
4. If prompted to configure the **OAuth consent screen**, complete it first:
   - Select **External** as user type
   - Fill in the required fields (app name, support email)
   - Add scopes: `email`, `profile`, `openid`

   > **Note:** Even if you only configure `email` and `openid` here, Supabase Auth (GoTrue) hardcodes `email` and `profile` as default scopes for the Google provider. The client-side `scopes` parameter is additive and cannot replace these defaults. As a result, Google's consent screen will always show "name and profile picture" permission. See: https://github.com/supabase/auth/blob/master/internal/api/provider/google.go
   - The app starts in **Testing** mode — add your Google account as a test user for local development

5. Click **Create Credentials** > **OAuth client ID**
6. Select **Web application** as the application type
7. Configure the following:

| Field                         | Value                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Authorized JavaScript origins | `http://localhost:3000` (dev), `https://your-domain.com` (prod)                                                 |
| Authorized redirect URIs      | `http://127.0.0.1:54321/auth/v1/callback` (local), `https://<reference-id>.supabase.co/auth/v1/callback` (prod) |

> **Tip:** `<reference-id>` is the short alphanumeric string shown as **Project ID** ("Reference used in APIs and URLs.") in Supabase Dashboard > **Project Settings** > **General**. It is the subdomain of your Supabase URL (e.g., `abcdefghijkl.supabase.co`), not a UUID.

8. Save and note the **Client ID** and **Client Secret**

> **Note:** The redirect URI points to Supabase's callback endpoint, not your application. Supabase handles the OAuth flow and redirects back to your app after authentication.

### 2. Enable Google Provider in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** > **Sign In / Providers**
4. Find **Google** and enable it
5. Enter the **Client ID** and **Client Secret** from Step 1

### 3. Configure Redirect URLs in Supabase

As in [URL Configuration](#authentication--url-configuration) above.

### 4. Environment Variables

The following environment variables are required (should already exist if Supabase is set up):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<reference-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Both values can be found in Supabase Dashboard > **Project Settings** > **API** under **Project URL** and **Project API keys** (`anon` `public`). If your project is integrated with Vercel, these are automatically set as environment variables on the Vercel side.

No additional environment variables are needed for Google Sign-In — the provider configuration is managed entirely in the Supabase Dashboard.

### 5. Verify Sign-In

1. Start the development server: `pnpm dev`
2. Navigate to the sign-in page
3. Click "Sign in with Google"
4. You should be redirected to Google's consent screen and back to `localhost:3000` after authentication

### 6. Verify Linking

Signed in, open `/mypage/account`:

1. **Add a Google account** → pick a different Google account → a second Google row appears
2. **Remove** on either row → confirm → the row disappears
3. Pick a Google account that is already linked → the page reports that it is already linked to this or another account

## Email Change and Password Set-up

Both complete through confirmation emails; the account page never takes a password. In production they need the [Resend setup](resend-smtp-setup.md).

- **Email change**: both the current and the new address receive a confirmation email; the change completes once the links in both (`/auth/callback?type=email_change`) have been opened. The first link opened is acknowledged with "open the other one too". The links use `token_hash`, not the PKCE `?code=`, so they work on a device other than the one that started the change.
- **Set / change password**: the recovery email is sent to the signed-in address and the password is chosen on `/reset-password`. A Google-only user gets an email + password login this way.

## Local Development (Supabase CLI)

When running Supabase locally via `pnpm supabase start`, configuration works differently from production:

- **Auth settings** come from `supabase/config.toml` (not the Dashboard) — the `config.toml` column in the tables above. After changing it, run `pnpm supabase stop && pnpm supabase start` (the database is kept).
- **Google credentials** are loaded from `supabase/.env`. `config.toml` references them via `env()` (e.g. `client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"`). Without them Google rejects the `client_id`, so both sign-in and "Add a Google account" stop at Google's error page.
- **Emails** land in [Mailpit](http://127.0.0.1:54324), including both email-change confirmations. Their links point at the `site_url` (`localhost:3000`).

### Setting Up Google Sign-In Locally

1. **Create OAuth credentials** in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) if you haven't already (see [Step 1 above](#1-create-oauth-credentials-in-google-cloud-console))

2. **Register the local redirect URI** in Google Cloud Console:
   - Add `http://127.0.0.1:54321/auth/v1/callback` to **Authorized redirect URIs**
   - This points to the local Supabase Auth endpoint (port 54321), not the Next.js dev server

3. **Configure Supabase environment**:

   ```bash
   cp supabase/.env.example supabase/.env
   ```

   Edit `supabase/.env` and set:

   ```bash
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=<your-google-client-id>
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=<your-google-client-secret>
   ```

4. **Restart Supabase** to pick up the new environment variables:
   ```bash
   pnpm supabase stop && pnpm supabase start
   ```

### localhost vs 127.0.0.1

The `site_url` in `config.toml` is set to `http://localhost:3000` (not `http://127.0.0.1:3000`). This is intentional — browsers treat `localhost` and `127.0.0.1` as different origins. Since the Next.js dev server runs on `localhost:3000`, the `site_url` must match so that cookies set after OAuth authentication are readable by the app.

The Supabase API URL (`http://127.0.0.1:54321`) uses `127.0.0.1` because that is the address Supabase CLI binds to. The redirect URI in Google Cloud Console must also use `127.0.0.1` to match.

## Apple Sign-In (Planned)

Apple Sign-In requires:

- Apple Developer Program membership ($99/year)
- Service ID, Key, and domain verification in Apple Developer Portal
- Provider configuration in Supabase Dashboard

Detailed instructions will be added when Apple Sign-In is implemented. The account page and the unlink guard already know the `apple` provider, so an Apple identity linked from the iOS app will be listed (and removable while a web login remains) without web changes. Two things will need attention then: a user who chose "Hide My Email" has a `@privaterelay.appleid.com` address, which does not receive our confirmation emails until the sending domain is registered with Apple's Private Email Relay; and unlinking should revoke the Apple token.

> **Note:** Apple Sign-In is required by App Store guidelines if the iOS app offers Google Sign-In.
