# Awin Daily Slack Report Setup

Steps to configure the Vercel Cron Job that posts yesterday's Awin affiliate
numbers (clicks per advertiser, transactions per creative) to a Slack
channel every morning, so nobody has to log into the Awin dashboard to see
them.

- **Schedule:** daily at UTC 02:00 (JST 11:00)
- **Endpoint:** `/api/cron/awin-daily-report`
- **Code:** `src/lib/ads/awin-report/` (what is reported and why), the route
  under `src/app/api/cron/awin-daily-report/` (auth + error funnel)

## Prerequisites

- Admin access to the Awin publisher account (Awin UI > Account > User
  Permissions). The API token is issued per user and reaches every account
  that user can open.
- Permission to add an app to the Slack workspace, or an admin who will
  approve one.
- `CRON_SECRET` already set on Vercel (see "Cron Jobs" in the README). Every
  cron route shares it.

## 1. Awin API token

1. Open https://ui.awin.com/awin-api (or "API Credentials" from the user menu,
   top right).
2. Re-enter your password and click "Show my API token".
3. Copy it → `AWIN_API_TOKEN`.

The token does not expire on its own and is not tied to this project; revoke
and reissue it from the same page if it leaks.

## 2. Publisher ID and region

The report endpoints need the publisher account ID and a `region` code, and
the region is not shown anywhere obvious: the documented list is twenty
two-letter codes with no `JP`, and this account's rows turn up under `US`.
Find both once with the probe script rather than guessing:

```bash
# apps/web/.env.local
AWIN_API_TOKEN=...
```

```bash
pnpm --filter web awin:check
```

The script lists the accounts the token reaches, tries each documented region
for yesterday's advertiser report, and prints the one that returned rows,
e.g. `region=US returned 1 advertiser row(s)`. Pin both:

```bash
# apps/web/.env.local
AWIN_PUBLISHER_ID=2801536
AWIN_REGION=US
```

With these set, later runs skip the discovery and make two calls instead of
up to twenty-one. The cron itself never discovers — it reads these values and
fails loudly if either is missing.

While the script is open: compare the `clicks` it prints against the Awin
dashboard for the same day **with the dashboard's report timezone set to
UTC**. The API has no Asian timezone (`Asia/Tokyo` is rejected), so every day
in this report is a UTC day, and the dashboard only agrees when it is looking
at the same boundary.

## 3. Slack Incoming Webhook

1. Create the destination channel first (e.g. `#333-shingan-chess-affiliate`).
   The webhook is bound to a channel at issue time, so the channel must exist
   and, if private, you must be a member.
2. https://api.slack.com/apps > Create New App > "Blank App" (or "From a
   manifest" with the `incoming-webhook` bot scope). Name it for its purpose,
   e.g. `Awin Daily Report`.
3. Left menu > Incoming Webhooks > switch "Activate Incoming Webhooks" on.
4. "Add New Webhook to Workspace" > pick the channel > Allow.
5. Copy the `https://hooks.slack.com/services/T.../B.../...` URL →
   `AWIN_REPORT_SLACK_WEBHOOK_URL`.

The variable is named for the report, not `SLACK_WEBHOOK_URL`: one webhook
posts to exactly one channel, so the next notification this project sends
will need its own URL and its own variable. Treat the URL as a secret —
anyone holding it can post to the channel.

## 4. Post the message once by hand

```bash
# apps/web/.env.local
AWIN_REPORT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

```bash
pnpm --filter web awin:check --slack
```

This posts the same message the cron will, built by the same code, and ends
with `Slack webhook -> HTTP 200 ok`. A failure prints Slack's one-word reason:
`no_service` means the URL was revoked, `channel_not_found` that the channel is
gone. Look at the message in the channel now — this is the moment to change
the layout (`src/lib/ads/awin-report/summary.ts`), before it posts unattended.

## 5. Vercel environment variables

Add all four to the **Production** environment (Settings > Environment
Variables, or `vercel env add <NAME> production` from `apps/web`):

| Variable                        | Value                        |
| ------------------------------- | ---------------------------- |
| `AWIN_API_TOKEN`                | from step 1                  |
| `AWIN_PUBLISHER_ID`             | from step 2 (e.g. `2801536`) |
| `AWIN_REGION`                   | from step 2 (e.g. `US`)      |
| `AWIN_REPORT_SLACK_WEBHOOK_URL` | from step 3                  |

Redeploy so the cron picks them up. Preview deployments do not run crons, so
the variables are not needed there.

## 6. Post-deploy checklist

1. **Settings > Cron Jobs** — `/api/cron/awin-daily-report` is listed with
   `0 2 * * *`.
2. Trigger it once from that page ("Run" next to the job) or wait for the
   first 02:00 UTC. A post should appear in the channel; the function log
   shows `Awin daily report posted` with the day's clicks.
3. If nothing posts, the function returned 500 and Sentry has the error:
   `Awin daily report is not configured: ... not set` names the missing
   variable; `Awin ... -> HTTP 401 (invalid_token)` means the token was
   revoked; `Slack webhook -> HTTP 404: no_service` means the webhook was.

## What the report cannot show

Clicks per creative. The app sends the `ad_creatives` row id as Awin's
`clickref` on every link, and the dashboard's "Click References" report
breaks clicks down by it — but the API does not: only transactions carry
`clickRef`, and that is what the report sums. If per-creative click counts
become necessary, the options are an append-only `ad_events` table written on
the redirect (see the TSDoc in `src/lib/ads/subid.ts`) or Awin's `campaign`
link parameter, which the campaign report does break down by day.
