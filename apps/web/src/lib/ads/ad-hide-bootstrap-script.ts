import { ADS_HIDDEN_COOKIE_NAME } from './ads-hidden-cookie';

/**
 * Source text of the ad-hide no-flash bootstrap script rendered by
 * `AdHideBootstrapScript.tsx`.
 *
 * Kept in a plain module so the CSP layer can allow these exact bytes via a
 * `'sha256-...'` source expression (`@/lib/security/inline-script-hashes.ts`)
 * instead of a per-request nonce — a nonce read would force dynamic rendering
 * on every page that mounts the script. A unit test next to the hash
 * constants recomputes the digest from this export, so edits here fail the
 * suite until the hash is updated.
 */
export const AD_HIDE_BOOTSTRAP_SCRIPT = `(function(){try{if(/(?:^|; )${ADS_HIDDEN_COOKIE_NAME}=1(?:;|$)/.test(document.cookie)){document.documentElement.setAttribute('data-ads-hidden','true');}}catch(e){}})();`;
