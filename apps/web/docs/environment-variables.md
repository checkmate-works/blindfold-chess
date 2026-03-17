# Environment Variables

Copy the example environment file and update as needed:

```bash
cp .env.example .env.local
```

## Configuration Options

### Site Configuration

```bash
# Base URL for your site (required for sitemap generation)
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### Database (Required for Posts Feature)

```bash
# PostgreSQL connection string
# Vercel Marketplace: POSTGRES_URL is automatically set by Supabase integration
# Manual setup: Use DATABASE_URL with your connection string
# Local development: Supabase local runs PostgreSQL on port 54322 (default in .env.example)
#
# The application checks in order: POSTGRES_URL → DATABASE_URL → default
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

### Authentication (Required for Sign-In Feature)

Used by Supabase Auth for Google Sign-In. Without these variables, the authentication feature is disabled and the app runs normally without sign-in capability.

```bash
# Supabase project URL and Publishable key
# Local development: Run `supabase start`, then `supabase status -o json` to retrieve API_URL and PUBLISHABLE_KEY
# Vercel/Production: Automatically set by Supabase integration,
#                    or copy from Supabase Dashboard → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase service role key (server-side only)
# Used for admin operations such as user management and bypassing RLS.
# Local development: Run `supabase status -o json` and copy SECRET_KEY
# Production: Supabase Dashboard → Project Settings → API Keys → service_role
# WARNING: Do NOT prefix with NEXT_PUBLIC_ — this key must never be exposed to the browser.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

For authentication setup instructions, see [authentication-setup.md](authentication-setup.md).

### Google Analytics (Optional)

The application supports Google Analytics 4 for usage tracking. To enable it:

1. Create a Google Analytics 4 property at [analytics.google.com](https://analytics.google.com/)
2. Get your Measurement ID (format: G-XXXXXXXXXX)
3. Add to your `.env.local` file:

```bash
# Google Analytics Measurement ID
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Cookie Consent Banner (Required for EU/US users)

The application uses CookieYes, a Consent Management Platform (CMP) for GDPR/CCPA compliance.

```bash
# CookieYes ID from dashboard
NEXT_PUBLIC_COOKIEYES_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

For detailed setup instructions, see [cookie-consent-setup.md](cookie-consent-setup.md).

### Error Tracking (Optional)

The application supports Sentry for error tracking in production. To enable it:

1. Create a free account at [Sentry.io](https://sentry.io/)
2. Create a new project
3. Add the following environment variables:

```bash
# Sentry DSN for error tracking
# Get from: Sentry Dashboard → Settings → Projects → [Your Project] → Client Keys (DSN)
NEXT_PUBLIC_SENTRY_DSN=your-dsn-here

# For uploading source maps (improves error stack traces)
# Get from: Sentry Dashboard → Settings → Auth Tokens
SENTRY_AUTH_TOKEN=your-auth-token

# Required only if using SENTRY_AUTH_TOKEN
# Found in your Sentry project settings
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=your-project-name
```

**Note:** Error tracking is automatically disabled in development. Only `NEXT_PUBLIC_SENTRY_DSN` is required for basic error tracking. The auth token and related settings are optional but recommended for better debugging experience.

### Contact Form Email (Optional)

The application includes a contact form that uses [Resend](https://resend.com/) to send emails. To enable the contact form:

1. Create a free account at [resend.com](https://resend.com/)
2. Verify your domain or use the testing domain provided by Resend
3. Generate an API key from the Resend dashboard
4. Add the following environment variables:

```bash
# Resend API Key
# Get from: Resend Dashboard → API Keys
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Email address to send contact form emails FROM
# Must be a verified domain in Resend
CONTACT_FROM_EMAIL=noreply@yourdomain.com

# Email address to send contact form emails TO
# Where you want to receive inquiries
CONTACT_TO_EMAIL=contact@yourdomain.com
```

**Note:** Without these environment variables, the contact form page will still be accessible, but form submissions will fail. For testing purposes, you can use Resend's test mode which doesn't require domain verification.

#### Testing the Contact Form Locally

When testing the contact form in development:

1. **Test Mode Restrictions**: Resend's test mode only allows sending emails to the email address you used to sign up for Resend
2. **Configuration**: Set `CONTACT_TO_EMAIL` to your Resend account email address:
   ```bash
   CONTACT_FROM_EMAIL=onboarding@resend.dev
   CONTACT_TO_EMAIL=your-resend-signup-email@example.com
   ```
3. **Verification**: After submitting the form, check your inbox for the test email

#### Production Setup

For production use with custom recipient email addresses:

1. **Verify Your Domain**: Add and verify your domain in the Resend dashboard
   - Go to [resend.com/domains](https://resend.com/domains)
   - Add DNS records (SPF, DKIM, DMARC) to your domain
   - Wait for verification to complete

2. **Update Environment Variables**:
   ```bash
   CONTACT_FROM_EMAIL=noreply@yourdomain.com  # Use your verified domain
   CONTACT_TO_EMAIL=your-business-email@example.com  # Can be any email address
   ```

**Note**: The contact form only sends emails to `CONTACT_TO_EMAIL` (where you receive inquiries). Users who submit the form do not receive a copy. The `REPLY-TO` header is set to the user's email address, so you can reply directly from your email client.
