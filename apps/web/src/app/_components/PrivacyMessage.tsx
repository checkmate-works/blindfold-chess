import Script from 'next/script';

interface PrivacyMessageProps {
  /** AdSense publisher ID (`ca-pub-xxxx`), reused as the Funding Choices publisher id. */
  publisherId: string;
}

/**
 * Google AdSense "Privacy & messaging" (formerly Funding Choices) CMP tag.
 *
 * Replaces the CookieYes CMP: this is Google's own consent tool, built to
 * satisfy the EU User Consent Policy that AdSense requires, and integrates
 * with Google Consent Mode v2 without any manual `gtag('consent', ...)`
 * wiring in this codebase (same as CookieYes's "Advanced Implementation").
 *
 * TODO: the exact snippet below is Google's documented standard
 * implementation. Verify it against the literal snippet generated in
 * AdSense > Privacy & messaging > "Install on site" before relying on it in
 * production, and replace if it differs.
 *
 * @see https://support.google.com/adsense/answer/13554116
 */
export function PrivacyMessage({ publisherId }: PrivacyMessageProps) {
  if (!publisherId) {
    return null;
  }

  return (
    <>
      <Script
        id="google-funding-choices-loader"
        src={`https://fundingchoicesmessages.google.com/i/${publisherId}?ers=1`}
        strategy="lazyOnload"
      />
      <Script id="google-funding-choices-signal" strategy="lazyOnload">
        {`(function() {function signalGooglefcPresent() {if (!window.frames['googlefcPresent']) {if (document.body) {const iframe = document.createElement('iframe'); iframe.style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;'; iframe.style.display = 'none'; iframe.name = 'googlefcPresent'; document.body.appendChild(iframe);} else {setTimeout(signalGooglefcPresent, 0);}}}signalGooglefcPresent();})();`}
      </Script>
    </>
  );
}
