/**
 * The app's entry point to the shared locale-matching rules.
 *
 * The three functions differ in how strict they are about casing and
 * whether they fall back to a language's primary subtag; which one a call
 * site wants is documented on each declaration in the shared module. They
 * are re-exported from here rather than imported directly because this path
 * is what the request-path modules (`lib/locale.ts`, `assertSupportedLocale`,
 * `getLandingLocale`, `locale-path`, the `Accept-Language` parsers) already
 * point at, and because `lib/locale.test.ts` pins the case-sensitivity
 * boundary against this module.
 */
export {
  findSupportedLocale,
  isSupportedLocale,
  matchLanguageTag,
} from '@blindfold-chess/features/locale';
