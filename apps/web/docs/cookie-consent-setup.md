# Cookie Consent Banner Setup Guide

This guide explains how to set up Google AdSense's "Privacy & messaging" (formerly Funding Choices) consent banner for GDPR/CCPA compliance.

## Why is this required?

- **GDPR Compliance**: Required by law for EU/UK users
- **CCPA Compliance**: Required for California users
- **Google's EU User Consent Policy**: AdSense requires publishers serving ads to EEA/UK users to gather consent through a policy-compliant CMP

## Why Privacy & messaging instead of a third-party CMP?

- It is purpose-built to satisfy AdSense's own consent policy, so there is no separate compliance surface to maintain.
- It integrates natively with Google Consent Mode v2 — no manual `gtag('consent', ...)` wiring is needed in this codebase.
- It unifies consent for both GA4 and AdSense in a single banner.
- Google controls banner rendering alongside its own ad tag, avoiding the CLS issues a separately-injected banner script tends to cause.

## No separate script tag — it rides on the existing AdSense code

Privacy & messaging is **not** a separate script you copy into the site. Per Google's own documentation, the consent message is delivered through the same `adsbygoogle.js` loader the site already uses for ads — the message will only appear on pages where that loader is present. There is no "Install on site" snippet to fetch for plain AdSense publishers (that separate-tag flow only applies to Google Ad Manager).

This is why `apps/web/src/app/_components/GoogleScripts.tsx` now passes `adsensePublisherId` from **every** layout that mounts it (`[locale]/layout.tsx`, `(landing)/layout.tsx`), not just the nested `(public)/layout.tsx` where actual ad units render. Loading the AdSense script sitewide is what makes the consent message (and therefore Consent-Mode-gated GA4) cover every page. Pages outside `(public)` still show zero ad units — the `(no-ads)` route-group guard is unaffected — they just also load the loader script needed for the consent message.

## Setup Instructions

Everything here is dashboard-only; no code changes are needed beyond what's already implemented.

1. Sign in to your [AdSense account](https://www.google.com/adsense/).
2. Go to **Privacy & messaging** in the left navigation.
3. Create/enable a message per region (e.g. GDPR for EEA/UK, US state regulations for California, etc.), using Google's own CMP.
4. Configure consent categories and the button set (e.g. "Consent" / "Manage options", or a 3-choice variant with "Do not consent").
5. Confirm **Consent Mode** integration is enabled for the message — this is what makes GA4 and AdSense automatically respect the user's choice without any code-level `gtag('consent', ...)` calls in this codebase.
6. Publish. No further "install code" step exists for plain AdSense — the message starts showing automatically on any page that loads the AdSense script, which is now every page in this app.

### No environment variable changes required

This integration reuses `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID` (already required for AdSense ad units). There is nothing to add to `.env.local` or Vercel's environment variables specifically for consent.

## Testing

Google's Privacy & messaging typically does not render its message on `localhost` — verification requires a deployed environment (a Vercel preview deployment or production) on a domain AdSense recognizes.

On a preview/production deployment:

1. Open DevTools → Network tab and confirm requests to `pagead2.googlesyndication.com/pagead/js/adsbygoogle.js` fire on pages outside `(public)` too (e.g. the landing page).
2. Open DevTools → Console and confirm no new CSP violation reports (CSP is currently `Report-Only`, see `apps/web/src/proxy.ts`).
3. Confirm the consent message renders and that accepting/rejecting still allows GA4 (`google-analytics.com`) and AdSense (`googlesyndication.com`) requests to fire as expected.
4. If testing region-gated messaging (e.g. GDPR message only shown to EEA/UK visitors), use a VPN or the AdSense preview tool to simulate a matching region.

## Resources

- [About Privacy & messaging — AdSense Help](https://support.google.com/adsense/answer/10924669)
- [Google Consent Mode overview](https://support.google.com/analytics/answer/9976101)
