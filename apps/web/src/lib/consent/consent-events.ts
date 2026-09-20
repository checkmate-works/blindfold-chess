/**
 * Fired on `window` whenever the consent decision changes in this document —
 * the banner's two buttons and the footer's "Cookie settings" link.
 *
 * The decision itself is carried on `<html data-consent>`, not in the event
 * payload: the attribute is the single source of truth (the `<head>` bootstrap
 * script sets it before any React code runs), and an event that also carried
 * the value would be a second one to keep in step. Listeners re-read the
 * attribute when they hear this.
 *
 * Why an event rather than a `MutationObserver` on `<html>`: the attribute is
 * only ever written by code in this module, so an observer would be a
 * general-purpose mechanism watching for a change whose only sources already
 * know how to announce it — and it would also fire for the unrelated
 * `data-ads-hidden` / theme attributes on the same element.
 */
export const CONSENT_CHANGED_EVENT = 'blindfold-chess:consent-changed';
