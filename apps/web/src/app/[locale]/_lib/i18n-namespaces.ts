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
  privacy: 'server',
  terms: 'server',
  company: 'server',
  landing: 'server',
  licenses: 'server',
  // Mypage sub-pages rendered as Server Components (getTranslations only).
  MypageBenefits: 'server',
  MypageBenefitHistory: 'server',
  MypageProblems: 'server',
  MypageProblemsIndex: 'server',
  MypagePuzzles: 'server',
  // Chunk post rendering (server-rendered post bodies).
  postVideoAttachmentRender: 'server',
  // Admin: the /admin tree lives OUTSIDE the [locale] tree (no
  // NextIntlClientProvider is mounted there) and reads this namespace only
  // via server-side getTranslations in its own layout/pages. Classifying it
  // 'client' shipped ~16.6 KB of admin-only strings in the RSC payload of
  // every public page for nothing — verified 2026-08-15: zero
  // useTranslations('Admin') call sites exist anywhere in src/.
  Admin: 'server',
  // The eight below were audited 2026-08-15 (import-graph reachability over
  // all client entry points): each is read exclusively through server-side
  // getTranslations — Footer/affiliateDisclosure by the server-rendered
  // Footer, the rest by their own Server Component pages. No client file
  // reaches any of them.
  Footer: 'server',
  MypageChallenges: 'server',
  MypageLikes: 'server',
  MypagePosts: 'server',
  affiliateDisclosure: 'server',
  // announcements: the members-only lock chip was the last client reader.
  // It stopped consulting `useAuth` (the chip marks the announcement, not
  // the viewer) and became a Server Component, so nothing renders these
  // strings outside `getTranslations` any more.
  announcements: 'server',
  articles: 'server',
  banned: 'server',
  gamesPage: 'server',

  // --- Client-allowed (included in client payload) ------------------------
  // learn: the `learn/[category]/[slug]` loading skeleton is a Client
  // Component (a server-side locale read there would force the whole static
  // route dynamic — see `@/i18n/get-locale-from-pathname-header`), and it
  // renders three section titles from this namespace. ~0.7 KB.
  learn: 'client',
  Achievements: 'client',
  AuthStatusDisplay: 'client',
  // Common: deletedUser (feed/comment cards) and pagination
  // (LeaderboardDetailContent) are read via useTranslations in Client
  // Components.
  Common: 'client',
  // Repertoires: Delete/Import/LineViewer client components read it via
  // useTranslations.
  Repertoires: 'client',
  MobileTabBar: 'client',
  Mypage: 'client',
  MypageChallengeResults: 'client',
  MypageFollowing: 'client',
  MypageNotifications: 'client',
  MypagePoints: 'client',
  MypageSubscription: 'client',
  Preferences: 'client',
  attachment: 'client',
  authPrompt: 'client',
  bulkDelete: 'client',
  buttonInput: 'client',
  chunks: 'client',
  contact: 'client',
  deleteAccount: 'client',
  dojo: 'client',
  // The embeddable game replay's own strings. Client-side because the widget
  // is one interactive component (`EmbedGameReplay`); its page hands it just
  // this namespace plus `Common`, never the full dictionary.
  embed: 'client',
  error: 'client',
  expLeaderboard: 'client',
  forgotPassword: 'client',
  guides: 'client',
  home: 'client',
  interview: 'client',
  largeDownloadConsent: 'client',
  leaderboard: 'client',
  // moderation: every write choke point that a block bars returns the error
  // CODE 'moderation.blocked' (`assertNotBlocked`); the topic forms resolve it
  // against the global translator in `resolvePostFormError`, so the namespace
  // must reach the client dictionary. ~50 bytes.
  moderation: 'client',
  navigation: 'client',
  newGame: 'client',
  onboardingProfile: 'client',
  onboardingWizard: 'client',
  openingSearch: 'client',
  pgnDiagnosis: 'client',
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
