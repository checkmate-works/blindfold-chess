# Authentication Setup

This project uses Supabase Auth for user authentication, enabling cross-platform account sharing between web and mobile apps.

## Overview

- **Provider**: Supabase Auth
- **Sign-in methods**: Google, Apple (planned)
- **Cross-platform**: Same account works on Web (Next.js), Mobile (Expo), and Mac

## Supabase Project Settings

### Data API (PostgREST)

When creating the Supabase project, **disable** the "Autogenerate a RESTful API for your public schema" option.

This project uses `supabase-js` only for Auth (GoTrue). Database access is handled directly via Drizzle ORM + `postgres`, so the auto-generated REST API (PostgREST) is not needed. Leaving it enabled exposes an unused endpoint and unnecessarily increases the attack surface.

> **Note:** Disabling the Data API does not affect Auth functionality. `supabase.auth.*` methods communicate with GoTrue (`/auth/v1/...`), which is independent of PostgREST (`/rest/v1/...`).

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

| Field                         | Value                                                           |
| ----------------------------- | --------------------------------------------------------------- |
| Authorized JavaScript origins | `http://localhost:3000` (dev), `https://your-domain.com` (prod) |
| Authorized redirect URIs      | `https://<reference-id>.supabase.co/auth/v1/callback`           |

> **Tip:** `<reference-id>` is the short alphanumeric string shown as **Project ID** ("Reference used in APIs and URLs.") in Supabase Dashboard > **Project Settings** > **General**. It is the subdomain of your Supabase URL (e.g., `abcdefghijkl.supabase.co`), not a UUID.

8. Save and note the **Client ID** and **Client Secret**

> **Note:** The redirect URI points to Supabase's callback endpoint, not your application. Supabase handles the OAuth flow and redirects back to your app after authentication.

### 2. Enable Google Provider in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Google** and enable it
5. Enter the **Client ID** and **Client Secret** from Step 1

### 3. Configure Redirect URLs in Supabase

1. In Supabase Dashboard, go to **Authentication** > **URL Configuration**
2. Add the following to **Redirect URLs**:
   - `http://localhost:3000/**` (for local development)
   - `https://your-domain.com/**` (for production)

### 4. Environment Variables

The following environment variables are required (should already exist if Supabase is set up):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<reference-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Both values can be found in Supabase Dashboard > **Project Settings** > **API** under **Project URL** and **Project API keys** (`anon` `public`). If your project is integrated with Vercel, these are automatically set as environment variables on the Vercel side.

No additional environment variables are needed for Google Sign-In — the provider configuration is managed entirely in the Supabase Dashboard.

### 5. Verify Local Development

After completing the above steps:

1. Start the development server: `pnpm dev`
2. Navigate to the sign-in page
3. Click "Sign in with Google"
4. You should be redirected to Google's consent screen and back to `localhost:3000` after authentication

## Apple Sign-In Setup (Planned)

Apple Sign-In requires:

- Apple Developer Program membership ($99/year)
- Service ID, Key, and domain verification in Apple Developer Portal
- Provider configuration in Supabase Dashboard

Detailed instructions will be added when Apple Sign-In is implemented.

> **Note:** Apple Sign-In is required by App Store guidelines if the iOS app offers Google Sign-In.
