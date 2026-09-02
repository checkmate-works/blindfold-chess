import type { NAMESPACE_CLASSIFICATION } from './i18n-namespaces';

/**
 * Per-route-subtree client dictionary scoping.
 *
 * The root `[locale]/layout.tsx` used to serialize every `'client'` namespace
 * (~200 KB raw) into the RSC flight payload of EVERY page — a glossary entry
 * shipped the whole practice/topics/admin dictionary it could never read. On
 * Vercel that byte count is billed four ways at once (ISR writes & reads are
 * metered in 8 KB units, plus Fast Origin Transfer and function output), so
 * the dictionary was the single largest driver of per-page cost.
 *
 * The split:
 *
 * - {@link GLOBAL_CLIENT_NAMESPACES} is the only set the root layout ships.
 *   It covers the always-mounted chrome (toast, tab bar, auth status) plus
 *   the small pages that have no scoped subtree of their own (sign-in,
 *   contact, interview, ...). ~10 KB raw.
 * - {@link INTL_SCOPES} maps each heavy route subtree to the namespaces its
 *   pages can actually reach. A nested `NextIntlClientProvider` in the
 *   subtree's `layout.tsx` serves that set — see
 *   `@/app/_layouts/scoped-intl-layout`. next-intl's provider REPLACES the
 *   parent dictionary for its subtree (it does not merge — see
 *   `use-intl/react`'s `messages === undefined ? prevContext?.messages :
 *   messages`), so every scope list must be self-sufficient: it repeats
 *   global namespaces like `Common` or `toast` when the subtree uses them.
 *
 * Each scope's list is the import-graph reachability closure of the
 * subtree's entry files (page/layout/error/loading/...): every
 * `useTranslations('ns')` literal, `useSafeTranslations` alias, and
 * namespace-prop literal (`i18nNamespace="..."` etc.) reachable from those
 * entries, plus the manual entries listed in the scope-check script for
 * translator calls whose namespace only exists at runtime (Server Action
 * error codes resolved via `resolvePostFormError`, achievement names via a
 * root-scoped translator). `scripts/check-i18n-scopes.ts` recomputes that
 * closure on every `pnpm check:i18n` run and fails when a list goes stale —
 * do not edit these lists by hand without re-running it.
 */
export type ClientNamespace = {
  [
    K in keyof typeof NAMESPACE_CLASSIFICATION
  ]: (typeof NAMESPACE_CLASSIFICATION)[K] extends 'client' ? K : never;
}[keyof typeof NAMESPACE_CLASSIFICATION];

/**
 * Namespaces served by the ROOT provider — available on every page,
 * including everything the scoped subtrees replace with their own set.
 * Keep this list small: every byte here is shipped sitewide.
 */
export const GLOBAL_CLIENT_NAMESPACES = [
  'AuthStatusDisplay',
  'Common',
  'MobileTabBar',
  'contact',
  // error: no reachable call site today (the root error boundary
  // deliberately avoids useTranslations), kept as a 0.2 KB safety net for
  // the namespace's stated purpose until it is deleted outright.
  'error',
  'forgotPassword',
  'interview',
  'openingSearch',
  'pricing',
  'redirect',
  'resetPassword',
  'signIn',
  'signUp',
  'toast',
  'unsavedChanges',
  'validation',
  'verifyEmail',
] as const satisfies readonly ClientNamespace[];

type IntlScope = {
  /** Route subtree the scope's layout provider covers, relative to `src/app/`. */
  dir: string;
  /** Namespaces the nested provider serves (self-sufficient — see module doc). */
  namespaces: readonly ClientNamespace[];
};

export const INTL_SCOPES = {
  practice: {
    dir: '[locale]/(public)/practice',
    namespaces: [
      'Common',
      'Preferences',
      'attachment',
      'authPrompt',
      'buttonInput',
      'home',
      'leaderboard',
      'moderation',
      'navigation',
      'newGame',
      'pgnDiagnosis',
      'pgnInput',
      'play',
      'postFenAttachment',
      'postVideoAttachment',
      'practice',
      'rankAchievement',
      'recall',
      'toast',
      'topics',
      'unsavedChanges',
    ],
  },
  topics: {
    dir: '[locale]/(public)/topics',
    namespaces: [
      'Common',
      'Preferences',
      'Repertoires',
      'attachment',
      'authPrompt',
      'home',
      'leaderboard',
      'moderation',
      'pgnDiagnosis',
      'play',
      'postFenAttachment',
      'postVideoAttachment',
      'sharedGames',
      'topics',
      'unsavedChanges',
    ],
  },
  games: {
    dir: '[locale]/(public)/games',
    namespaces: [
      'Common',
      'Preferences',
      'Repertoires',
      'authPrompt',
      'bulkDelete',
      'buttonInput',
      'home',
      'largeDownloadConsent',
      'newGame',
      'openingSearch',
      'pgnDiagnosis',
      'pgnInput',
      'play',
      'playError',
      'rankAchievement',
      'ranks',
      'sharedGames',
      'topics',
      'unsavedChanges',
    ],
  },
  chunks: {
    dir: '[locale]/(public)/chunks',
    namespaces: [
      'Common',
      'Preferences',
      'Repertoires',
      'attachment',
      'authPrompt',
      'chunks',
      'moderation',
      'pgnDiagnosis',
      'play',
      'postFenAttachment',
      'postVideoAttachment',
      'sharedGames',
      'toast',
      'topics',
      'unsavedChanges',
    ],
  },
  repertoires: {
    dir: '[locale]/(public)/repertoires',
    namespaces: [
      'Common',
      'Preferences',
      'Repertoires',
      'attachment',
      'authPrompt',
      'moderation',
      'openingSearch',
      'pgnDiagnosis',
      'play',
      'postFenAttachment',
      'postVideoAttachment',
      'toast',
      'topics',
      'unsavedChanges',
    ],
  },
  dojo: {
    dir: '[locale]/(public)/dojo',
    namespaces: [
      'Common',
      'Preferences',
      'dojo',
      'guides',
      'home',
      'play',
      'ranks',
      'unsavedChanges',
    ],
  },
  home: {
    dir: '[locale]/(public)/(home)',
    namespaces: [
      'Common',
      'authPrompt',
      'home',
      'leaderboard',
      'sharedGames',
      'topics',
      'unsavedChanges',
    ],
  },
  leaderboard: {
    dir: '[locale]/(public)/leaderboard',
    namespaces: ['Common', 'expLeaderboard', 'leaderboard', 'unsavedChanges'],
  },
  profile: {
    dir: '[locale]/(public)/u',
    namespaces: [
      'Common',
      'authPrompt',
      'home',
      'leaderboard',
      'publicProfile',
      'sharedGames',
      'topics',
      'unsavedChanges',
    ],
  },
  mypage: {
    dir: '[locale]/(protected)',
    namespaces: [
      'Achievements',
      'Common',
      'Mypage',
      'MypageChallengeResults',
      'MypageFollowing',
      'MypageNotifications',
      'MypagePoints',
      'MypageSubscription',
      'Preferences',
      'authPrompt',
      'deleteAccount',
      'onboardingProfile',
      'onboardingWizard',
      'profile',
      'setupUsername',
      'topics',
      'unsavedChanges',
      'validation',
    ],
  },
  preferences: {
    dir: '[locale]/(public)/preferences',
    namespaces: ['Common', 'Preferences', 'unsavedChanges'],
  },
  landing: {
    // The `/` root outside the [locale] tree. Its own layout mounts the
    // provider (there is no [locale] root above it), so its "scope" IS its
    // whole dictionary — the landing copy itself is a server-only namespace.
    dir: '(landing)',
    namespaces: ['Common', 'toast', 'unsavedChanges'],
  },
  learn: {
    dir: '[locale]/(public)/learn',
    namespaces: ['Common', 'learn', 'navigation', 'unsavedChanges'],
  },
} as const satisfies Record<string, IntlScope>;

export type IntlScopeId = keyof typeof INTL_SCOPES;

/**
 * Pick one scope's dictionary out of the full messages object. Missing
 * namespaces are skipped rather than serialized as `undefined` — the
 * scope-check script is what guarantees they exist.
 */
export function pickScopedMessages(
  allMessages: Record<string, unknown>,
  scope: IntlScopeId
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const ns of INTL_SCOPES[scope].namespaces) {
    if (allMessages[ns] !== undefined) picked[ns] = allMessages[ns];
  }
  return picked;
}

const GLOBAL_SET = new Set<string>(GLOBAL_CLIENT_NAMESPACES);

/** True if the namespace ships in the root provider's sitewide dictionary. */
export function isGlobalClientNamespace(name: string): boolean {
  return GLOBAL_SET.has(name);
}
