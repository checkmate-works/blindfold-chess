/**
 * Without this file, X falls back to the root layout's static
 * `twitter.images: ['/logo.png']` (X prefers `twitter:image` over `og:image`
 * when both are present) and every shared-game link card shows the site logo
 * instead of the board. See `specs/social-sharing/README.md` for the full
 * writeup of this failure mode.
 */
export { default, size, contentType, alt } from './opengraph-image';
