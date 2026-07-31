/**
 * Source text of the announcement-banner no-flash dismiss script rendered by
 * `Header.tsx`.
 *
 * Runs synchronously while the browser parses the document, reads the
 * `dismissed-announcement` cookie and, when it matches the banner id, injects
 * a `<style>` tag hiding the banner before it becomes visible — the classic
 * "dark mode no-flash" pattern.
 *
 * The banner id is NOT interpolated into the script text. It is carried on
 * the `data-announcement-id` attribute of the `<script>` element itself and
 * read back via `document.currentScript`, which is reliable here because the
 * element is a parser-inserted synchronous classic script. Keeping the text
 * free of per-render values makes it a build-time constant the CSP can allow
 * via a `'sha256-...'` source expression (`@/lib/security/inline-script-hashes.ts`)
 * — the previous interpolated version needed a per-request nonce, whose
 * `headers()` read forced every page mounting the Header into dynamic
 * rendering.
 *
 * The CSS attribute selector value is produced with `JSON.stringify(id)`.
 * JSON string escaping is not CSS string escaping in general, but banner ids
 * are DB-generated uuids (hex + dashes), for which the two coincide; the
 * quoting exists as defense in depth, mirroring the old implementation.
 */
export const ANNOUNCEMENT_DISMISS_SCRIPT = `(function(){try{var el=document.currentScript;var id=el&&el.getAttribute('data-announcement-id');if(!id)return;var m=document.cookie.match(/(?:^|;\\s*)dismissed-announcement=([^;]*)/);if(m&&decodeURIComponent(m[1])===id){var s=document.createElement('style');s.setAttribute('data-announcement-dismiss','1');s.textContent='[data-announcement-banner-id='+JSON.stringify(id)+']{display:none!important;}';document.head.appendChild(s);}}catch(e){}})();`;
