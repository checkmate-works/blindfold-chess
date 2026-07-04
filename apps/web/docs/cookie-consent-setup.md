# Cookie Consent Banner Setup Guide

This guide explains how to set up Google AdSense's "Privacy & messaging" (formerly Funding Choices) consent banner for GDPR/CCPA compliance.

## Why is this required?

- **GDPR Compliance**: Required by law for EU/UK users
- **CCPA Compliance**: Required for California users
- **Google's EU User Consent Policy**: AdSense requires publishers serving ads to EEA/UK users to gather consent through a policy-compliant CMP

## Why Privacy & messaging instead of a third-party CMP?

The app previously used CookieYes (a third-party SaaS CMP). It was replaced with Google's own free tool because:

- It is purpose-built to satisfy AdSense's own consent policy, so there is no separate compliance surface to maintain.
- It integrates natively with Google Consent Mode v2 — no manual `gtag('consent', ...)` wiring is needed in this codebase, same as CookieYes's "Advanced Implementation" did.
- It unifies consent for both GA4 and AdSense in a single banner.
- It removes the CookieYes subscription cost, and Google controls banner rendering alongside its own ad tag, which avoids the CLS issues the CookieYes banner caused.

## Setup Instructions

### 1. Enable Privacy & messaging in AdSense

1. Sign in to your [AdSense account](https://www.google.com/adsense/).
2. Go to **Privacy & messaging** in the left navigation.
3. Create a new message (choose the GDPR message type for EEA/UK visitors; add other regions/laws as needed, e.g. CCPA for California, LGPD for Brazil).
4. Configure consent categories (Analytics, Ad personalization, etc.) and confirm the message's region targeting matches what you want to show it to.
5. Confirm **Consent Mode** integration is enabled for the message (this is what makes GA4 and AdSense automatically respect the user's choice without any code-level `gtag('consent', ...)` calls).
6. Publish the message.

### 2. Get the install snippet

1. In AdSense, go to **Privacy & messaging** → the message you just created → **Install on site**.
2. Google will show a snippet like:

   ```html
   <script
     async
     src="https://fundingchoicesmessages.google.com/i/pub-XXXXXXXXXXXXXXX?ers=1"
   ></script>
   <script>
     (function () {
       function signalGooglefcPresent() {
         if (!window.frames['googlefcPresent']) {
           if (document.body) {
             const iframe = document.createElement('iframe');
             iframe.style =
               'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;';
             iframe.style.display = 'none';
             iframe.name = 'googlefcPresent';
             document.body.appendChild(iframe);
           } else {
             setTimeout(signalGooglefcPresent, 0);
           }
         }
       }
       signalGooglefcPresent();
     })();
   </script>
   ```

3. `pub-XXXXXXXXXXXXXXX` is the same value as `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID` — **no separate environment variable is needed**. `apps/web/src/app/_components/PrivacyMessage.tsx` builds the loader URL from that existing value.
4. Compare the snippet against `PrivacyMessage.tsx` and update it if Google's generated snippet differs from what's currently implemented.

### 3. No environment variable changes required

Unlike CookieYes, this integration reuses `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID` (already required for AdSense ad units). There is nothing to add to `.env.local` or Vercel's environment variables specifically for consent.

## Testing

Google's Privacy & messaging typically does not render its message on `localhost` — verification requires a deployed environment (a Vercel preview deployment or production) on a domain AdSense recognizes.

On a preview/production deployment:

1. Open DevTools → Network tab and confirm requests to `fundingchoicesmessages.google.com` (and no more requests to `cdn-cookieyes.com`).
2. Open DevTools → Console and confirm no CSP violation reports for the new host (CSP is currently `Report-Only`, see `apps/web/src/proxy.ts`).
3. Confirm the consent message renders and that accepting/rejecting still allows GA4 (`google-analytics.com`) and AdSense (`googlesyndication.com`) requests to fire as expected.
4. If testing region-gated messaging (e.g. GDPR message only shown to EEA/UK visitors), use a VPN or the AdSense preview tool to simulate a matching region.

## Resources

- [AdSense Privacy & messaging help center](https://support.google.com/adsense/answer/13554116)
- [Google Consent Mode overview](https://support.google.com/analytics/answer/9976101)
