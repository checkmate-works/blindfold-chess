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
  coin: 'server',
  glossary: 'server',
  manual: 'server',
  gettingStarted: 'server',
  learn: 'server',
  privacy: 'server',
  terms: 'server',
  company: 'server',
  landing: 'server',
  licenses: 'server',
  thanks: 'server',
  // Mypage sub-pages rendered as Server Components (getTranslations only).
  MypageBenefits: 'server',
  MypageBenefitHistory: 'server',
  MypageProblems: 'server',
  MypageProblemsIndex: 'server',
  MypagePuzzles: 'server',
  // Chunk post rendering (server-rendered post bodies).
  postVideoAttachmentRender: 'server',

  // --- Client-allowed (included in client payload) ------------------------
  Achievements: 'client',
  Admin: 'client',
  AuthStatusDisplay: 'client',
  Footer: 'client',
  MobileTabBar: 'client',
  Mypage: 'client',
  MypageChallengeResults: 'client',
  MypageChallenges: 'client',
  MypageFollowing: 'client',
  MypageLikes: 'client',
  MypageNotifications: 'client',
  MypagePoints: 'client',
  MypagePosts: 'client',
  MypageSubscription: 'client',
  Preferences: 'client',
  affiliateDisclosure: 'client',
  announcements: 'client',
  articles: 'client',
  attachment: 'client',
  authPrompt: 'client',
  banned: 'client',
  bulkDelete: 'client',
  buttonInput: 'client',
  chunks: 'client',
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
  largeDownloadConsent: 'client',
  leaderboard: 'client',
  navigation: 'client',
  newGame: 'client',
  onboardingProfile: 'client',
  onboardingWizard: 'client',
  openingSearch: 'client',
  pgnInput: 'client',
  play: 'client',
  playError: 'client',
  postFenAttachment: 'client',
  postVideoAttachment: 'client',
  recall: 'client',
  practice: 'client',
  pricing: 'client',
  profile: 'client',
  publicProfile: 'client',
  rankAchievement: 'client',
  ranks: 'client',
  redirect: 'client',
  resetPassword: 'client',
  setupUsername: 'client',
  sharedGames: 'client',
  signIn: 'client',
  signUp: 'client',
  toast: 'client',
  topics: 'client',
  unsavedChanges: 'client',
  validation: 'client',
  verifyEmail: 'client',
} as const satisfies Record<string, NamespaceClassification>;

type KnownNamespace = keyof typeof NAMESPACE_CLASSIFICATION;

/**
 * The set of namespaces used only by Server Components. These are removed from
 * the messages object passed to the client-side `NextIntlClientProvider`.
 */
const SERVER_ONLY_NAMESPACES: readonly KnownNamespace[] = Object.entries(NAMESPACE_CLASSIFICATION)
  .filter(([, kind]) => kind === 'server')
  .map(([name]) => name as KnownNamespace);

const SERVER_ONLY_SET = new Set<string>(SERVER_ONLY_NAMESPACES);

/** True if the namespace is classified as server-only. */
export function isServerOnlyNamespace(name: string): boolean {
  return SERVER_ONLY_SET.has(name);
}
