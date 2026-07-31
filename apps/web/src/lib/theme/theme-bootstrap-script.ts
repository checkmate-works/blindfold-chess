import { THEME_DARK_CLASS, THEME_LIGHT_CLASS, THEME_STORAGE_KEY } from './constants';

/**
 * Source text of the theme no-flash bootstrap script rendered by
 * `ThemeScript.tsx`.
 *
 * Kept in a plain module (no React, no `next/headers`) because the CSP layer
 * needs a build-time-constant script text to hash: `script-src` allows these
 * exact bytes via a `'sha256-...'` source expression instead of a per-request
 * nonce, so rendering the script never requires a dynamic API read and the
 * page can stay static. The hash constants live in
 * `@/lib/security/inline-script-hashes.ts`; a unit test there recomputes them
 * from these exports, so editing this script without updating the hash fails
 * the suite rather than silently emitting CSP violations.
 *
 * Two variants exist because the development build prepends a console.error
 * filter (see the long rationale in `ThemeScript.tsx`); production ships the
 * theme snippet alone. Both variants are hashed so the CSP can allow
 * whichever one the running mode renders.
 */

const WARNING_FRAGMENT = 'Encountered a script tag while rendering';

/** Dev-only console.error filter — see `ThemeScript.tsx` for the rationale. */
export const DEV_CONSOLE_FILTER_SCRIPT = `(function(){var W=${JSON.stringify(WARNING_FRAGMENT)};var n=console.error;var i=n;var d=0;function f(){var a=arguments[0];if(typeof a==='string'&&a.indexOf(W)!==-1)return;if(d>0)return n.apply(console,arguments);d++;try{return i.apply(console,arguments);}finally{d--;}}try{Object.defineProperty(console,'error',{configurable:true,enumerable:true,get:function(){return f;},set:function(v){i=v;}});}catch(e){console.error=f;}})();`;

const THEME_SNIPPET = `(function(){try{var d=document.documentElement;var s=localStorage.getItem('${THEME_STORAGE_KEY}');var t=s==='${THEME_LIGHT_CLASS}'||s==='${THEME_DARK_CLASS}'?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'${THEME_DARK_CLASS}':'${THEME_LIGHT_CLASS}');d.classList.remove('${THEME_LIGHT_CLASS}','${THEME_DARK_CLASS}');d.classList.add(t);d.style.colorScheme=t;}catch(e){}})();`;

/** Exact script text rendered in production builds. */
export const THEME_BOOTSTRAP_SCRIPT_PROD = THEME_SNIPPET;

/** Exact script text rendered in development (console filter + theme). */
export const THEME_BOOTSTRAP_SCRIPT_DEV = DEV_CONSOLE_FILTER_SCRIPT + THEME_SNIPPET;
