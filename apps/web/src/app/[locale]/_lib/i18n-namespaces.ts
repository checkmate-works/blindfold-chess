/**
 * i18n namespace classification.
 *
 * Every top-level namespace in `src/messages/<locale>.json` must be classified
 * as either `'server'` (used only by Server Components via `getTranslations()`)
 * or `'client'` (needed by `useTranslations()` in Client Components, and
 * therefore included in the client-side dictionary payload).
 *
 * This list is the single source of truth consumed by:
 *   - `src/app/[locale]/layout.tsx` — filters `'server'` namespaces out of the
 *     client dictionary at request time to keep the payload small.
 *   - `scripts/check-i18n-namespaces.ts` — a guard script that cross-checks
 *     this classification against the actual message files and fails if any
 *     namespace is missing from here (inclusive-by-default was the historical
 *     behavior that let the client bundle silently grow; this file flips it
 *     to explicit-classification-required).
 *
 * When you add a new namespace to the messages JSON, you MUST add it here too.
 * The check script will fail otherwise.
 */
export type NamespaceClassification = 'server' | 'client';

export const NAMESPACE_CLASSIFICATION = {
  // --- Server-only (excluded from client payload) -------------------------
  metadata: 'server',
  Header: 'server',
  faq: 'server',
  glossary: 'server',
  manual: 'server',
  gettingStarted: 'server',
  learn: 'server',
  privacy: 'server',
  terms: 'server',
  company: 'server',
  landing: 'server',

  // --- Client-allowed (included in client payload) ------------------------
  Achievements: 'client',
  Admin: 'client',
  AuthStatusDisplay: 'client',
  ButtonInput: 'client',
  Common: 'client',
  Footer: 'client',
  MobileTabBar: 'client',
  Mypage: 'client',
  MypageChallengeResults: 'client',
  MypageChallenges: 'client',
  MypageFollowing: 'client',
  MypageLikes: 'client',
  MypageNotifications: 'client',
  MypagePosts: 'client',
  Preferences: 'client',
  affiliateDisclosure: 'client',
  announcements: 'client',
  articles: 'client',
  authPrompt: 'client',
  banned: 'client',
  bulkDelete: 'client',
  contact: 'client',
  deleteAccount: 'client',
  dojo: 'client',
  error: 'client',
  expLeaderboard: 'client',
  forgotPassword: 'client',
  gamesPage: 'client',
  guides: 'client',
  home: 'client',
  interview: 'client',
  leaderboard: 'client',
  navigation: 'client',
  newGame: 'client',
  onboarding: 'client',
  openingSearch: 'client',
  pgnInput: 'client',
  play: 'client',
  playError: 'client',
  postmortem: 'client',
  practice: 'client',
  pricing: 'client',
  profile: 'client',
  publicProfile: 'client',
  rankAchievement: 'client',
  ranks: 'client',
  redirect: 'client',
  resetPassword: 'client',
  setupUsername: 'client',
  signIn: 'client',
  signUp: 'client',
  subscription: 'client',
  toast: 'client',
  topics: 'client',
  unsavedChanges: 'client',
  validation: 'client',
  verifyEmail: 'client',
} as const satisfies Record<string, NamespaceClassification>;

export type KnownNamespace = keyof typeof NAMESPACE_CLASSIFICATION;

/**
 * The set of namespaces used only by Server Components. These are removed from
 * the messages object passed to the client-side `NextIntlClientProvider`.
 */
export const SERVER_ONLY_NAMESPACES: readonly KnownNamespace[] = Object.entries(
  NAMESPACE_CLASSIFICATION
)
  .filter(([, kind]) => kind === 'server')
  .map(([name]) => name as KnownNamespace);

const SERVER_ONLY_SET = new Set<string>(SERVER_ONLY_NAMESPACES);

/** True if the namespace is classified as server-only. */
export function isServerOnlyNamespace(name: string): boolean {
  return SERVER_ONLY_SET.has(name);
}
