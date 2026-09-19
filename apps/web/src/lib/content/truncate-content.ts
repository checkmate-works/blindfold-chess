/**
 * App-side import path for the truncation helper, whose implementation and
 * contract live in `@blindfold-chess/features/utils` so the mobile app gets the
 * same one. Kept as a seam because the `@/lib/...` spelling is what the import
 * order convention sorts and what every list page in this app already uses;
 * `truncateContent` itself is not redefined here.
 */
export { truncateContent } from '@blindfold-chess/features/utils';
