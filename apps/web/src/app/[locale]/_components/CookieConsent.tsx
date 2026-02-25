'use client';

import Script from 'next/script';

interface CookieConsentProps {
  cookieYesId: string;
  locale?: string;
}

/**
 * CookieYes Consent Management Platform (CMP)
 * Displays a cookie consent banner for GDPR/CCPA compliance
 * Integrates with Google Consent Mode v2 for AdSense compatibility
 *
 * Multi-language support:
 * - Free plan: Automatically detects language from <html lang="xx"> attribute
 * - The banner will display in the language matching the current page locale
 * - Requires configuring banner text for each language in CookieYes dashboard
 *
 * @see https://www.cookieyes.com/
 * @see https://www.cookieyes.com/documentation/cookie-banner/install-cookie-banner/
 * @see https://www.cookieyes.com/documentation/how-to-change-the-language-of-your-cookie-consent-banner-using-cookieyes/
 */
export function CookieConsent({ cookieYesId, locale }: CookieConsentProps) {
  if (!cookieYesId) {
    return null;
  }

  // CookieYes automatically detects language from <html lang="xx"> attribute
  // For free plan users, you need to manually configure banner text for each language
  // in the CookieYes dashboard
  return (
    <Script
      id="cookieyes"
      src={`https://cdn-cookieyes.com/client_data/${cookieYesId}/script.js`}
      strategy="afterInteractive"
      type="text/javascript"
      data-locale={locale}
    />
  );
}
