import { CONSENT_ATTRIBUTE, CONSENT_COOKIE_NAME, CONSENT_SCHEMA_VERSION } from './consent-cookie';

/**
 * Source text of the consent no-flash bootstrap script rendered by
 * `ConsentBootstrapScript.tsx`.
 *
 * Kept in a plain module so the CSP layer can allow these exact bytes via a
 * `'sha256-...'` source expression (`@/lib/security/inline-script-hashes.ts`)
 * instead of a per-request nonce — a nonce read would force dynamic rendering
 * on every page, and the banner is mounted in every root layout. A unit test
 * next to the hash constants recomputes the digest from this export, so edits
 * here fail the suite until the hash is updated.
 *
 * It re-implements the cookie match from `./consent-cookie.ts` rather than
 * importing it: the script is a string injected into `<head>`, so it can
 * reference nothing outside itself. The constants it interpolates are the
 * shared ones, which is what keeps the two readings of the cookie in step.
 *
 * Only a value carrying the current schema version sets the attribute.
 * Anything else — no cookie, an older version, junk — leaves `<html>` without
 * the attribute, which is the state that shows the banner and withholds
 * Google Analytics.
 */
export const CONSENT_BOOTSTRAP_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${CONSENT_COOKIE_NAME}=([^;]*)/);if(!m)return;var p=decodeURIComponent(m[1]).split(':');if(p[0]!=='${CONSENT_SCHEMA_VERSION}')return;if(p[1]==='granted'||p[1]==='denied'){document.documentElement.setAttribute('${CONSENT_ATTRIBUTE}',p[1]);}}catch(e){}})();`;

/** Class the banner element carries, and the hide rule's only hook. */
export const CONSENT_BANNER_CLASS = 'consent-banner';

/**
 * The CSS that keeps the banner out of sight once a decision exists.
 *
 * Inlined into each root layout's `<style>` in `<head>` rather than living in
 * `globals.css`, so it is render-blocking with the document and applies before
 * the first paint even on a cold cache — an external stylesheet would arrive
 * after the banner had already been painted, which is the flash this pattern
 * exists to prevent. Both root layouts embed the same string from here, since
 * a rule that drifted between them would hide the banner on one tree only.
 *
 * The selector matches the attribute's presence, not its value: `granted` and
 * `denied` both mean "already answered", and the difference between them is
 * `GoogleScripts`' business, not the banner's.
 */
export const CONSENT_BANNER_HIDE_CSS = `html[${CONSENT_ATTRIBUTE}] .${CONSENT_BANNER_CLASS}{display:none!important;}`;
