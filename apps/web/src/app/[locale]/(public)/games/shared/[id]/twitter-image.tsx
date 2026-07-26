/**
 * Without this file, X falls back to the root layout's static
 * `twitter.images: ['/logo.png']` and every shared-game link card shows the
 * site logo instead of the board — X prefers `twitter:image` over `og:image`
 * when both are present, so adding `opengraph-image.tsx` alone does not fix
 * the X card. The two file conventions are separate resolutions; this
 * re-export is what keeps them in sync.
 */
export { default, size, contentType, alt } from './opengraph-image';
