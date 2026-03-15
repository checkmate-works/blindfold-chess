/**
 * Reserved username list for the Blindfold Chess platform.
 *
 * ## Policy
 *
 * Usernames listed here are blocked from registration to prevent:
 * 1. Conflict with RFC 2142 standard role-based addresses (postmaster, abuse, etc.)
 * 2. URL routing collisions with application paths (api, auth, admin, etc.)
 * 3. Impersonation of staff, administrators, or official accounts
 * 4. Misuse of well-known brand/platform names and geopolitical identifiers
 * 5. Squatting on domain-specific chess terminology reserved for official content
 * 6. Conflict with common testing, development, and operational account names
 * 7. Registration of overly generic or placeholder names
 *
 * ## Matching rules
 *
 * - Exact match only (e.g., "admin" is blocked but "admin123" is allowed)
 * - Case-insensitive comparison is unnecessary because the username format
 *   validation already restricts usernames to lowercase ASCII letters,
 *   digits, and underscores (see username.ts)
 *
 * ## Maintenance
 *
 * When adding new application routes or features, review this list and add
 * corresponding path names to Category 2. When new official accounts or
 * brand partnerships are established, add them to the appropriate category.
 *
 * ## References
 *
 * - RFC 2142: Mailbox Names for Common Services, Roles and Functions
 * - https://github.com/shouldbee/reserved-usernames
 * - https://gist.github.com/caseyohara/1453705
 */

/**
 * Category 1: RFC 2142 standard role-based addresses.
 *
 * These mailbox names are defined by RFC 2142 for common internet services
 * and roles. Reserving them prevents confusion with official role accounts
 * such as postmaster, abuse, and hostmaster.
 */
const RFC_2142_ROLE_NAMES = [
  'postmaster',
  'hostmaster',
  'webmaster',
  'abuse',
  'info',
  'support',
  'noreply',
  'no_reply',
  'security',
  'mailer_daemon',
  'usenet',
  'news',
  'www',
  'ftp',
  'root',
] as const;

/**
 * Category 2: URL routing collision prevention.
 *
 * These names correspond to actual application routes and commonly used
 * web paths. Reserving them prevents a user profile from shadowing an
 * internal route or a path likely to be added in the future.
 */
const URL_ROUTING_NAMES = [
  // Actual application routes
  'api',
  'auth',
  'practice',
  'games',
  'profile',
  'sign_in',
  'sign_up',
  'sign_out',
  'mypage',
  'onboarding',
  'learn',
  'manual',
  'glossary',
  'posts',
  'topics',
  'faq',
  'contact',
  'company',
  'privacy',
  'terms',
  'preferences',
  'banned',
  'getting_started',
  'affiliate_disclosure',
  // Common web paths
  'app',
  'settings',
  'config',
  'dashboard',
  'search',
  'explore',
  'trending',
  'discover',
  'feed',
  'rss',
  'sitemap',
  'robots',
  'blog',
  'docs',
  'documentation',
  'wiki',
  'help',
  'about',
  'status',
  'checkout',
  'cart',
  'shop',
  'order',
  'download',
  'upload',
  'static',
  'assets',
  'media',
  'cdn',
  'oauth',
  'callback',
  'login',
  'logout',
  'signup',
  'register',
  'account',
  'activate',
  'deactivate',
  'delete',
  'edit',
  'new',
  'create',
  'update',
  'remove',
  'notifications',
  'messages',
  'inbox',
  'followers',
  'following',
  'friends',
  'lists',
  'bookmarks',
  'favorites',
  'likes',
  'share',
  'embed',
  'export',
  'import',
  'billing',
  'pricing',
  'plans',
  'enterprise',
  'pro',
  'premium',
  'upgrade',
  'health',
  'ping',
  'version',
  'graphql',
  'webhook',
  'webhooks',
  'cron',
] as const;

/**
 * Category 3: Impersonation prevention.
 *
 * These names could be used to impersonate administrators, staff, or
 * official system accounts. Blocking them prevents social engineering
 * attacks and user confusion.
 *
 * Note: "root", "webmaster", and "support" also appear in Categories 1/2
 * but are listed here as the impersonation concern is the primary reason
 * for reservation.
 *
 * "admin" is excluded from this list because it is reserved for use as an
 * operator's own username.
 */
const IMPERSONATION_NAMES = [
  'administrator',
  'sysadmin',
  'moderator',
  'mod',
  'staff',
  'team',
  'official',
  'system',
  'bot',
  'service',
  'operator',
  'helpdesk',
  'owner',
  'founder',
  'ceo',
  'cto',
  'coo',
] as const;

/**
 * Category 4: Well-known brand, platform, and geopolitical names.
 *
 * Reserving major platform names, widely spoken language names, and
 * two-letter country-code TLDs prevents trademark confusion and
 * impersonation of well-known entities.
 */
const BRAND_AND_GEO_NAMES = [
  // Major platforms and services
  'github',
  'twitter',
  'facebook',
  'google',
  'apple',
  'microsoft',
  'amazon',
  'meta',
  'discord',
  'slack',
  'reddit',
  'youtube',
  'twitch',
  'tiktok',
  'instagram',
  'linkedin',
  'chess_com',
  'lichess',
  // Top spoken languages (matching username character rules)
  'english',
  'spanish',
  'french',
  'german',
  'japanese',
  'korean',
  'chinese',
  'arabic',
  'hindi',
  'portuguese',
  'russian',
  'italian',
  'dutch',
  'swedish',
  'polish',
  'turkish',
  'thai',
  'vietnamese',
  'indonesian',
  'malay',
  'persian',
  'hebrew',
  'greek',
  'czech',
  'romanian',
  'hungarian',
  'finnish',
  'danish',
  'norwegian',
  'bengali',
  'tamil',
  'telugu',
  'marathi',
  'gujarati',
  'kannada',
  'urdu',
  'punjabi',
  // Two-letter country-code TLDs
  'us',
  'uk',
  'ca',
  'au',
  'de',
  'fr',
  'jp',
  'br',
  'cn',
  'kr',
  'in',
  'ru',
  'it',
  'es',
  'nl',
  'se',
  'no',
  'dk',
  'fi',
  'pl',
  'cz',
  'at',
  'ch',
  'be',
  'ie',
  'pt',
  'mx',
  'ar',
  'cl',
  'co',
  'pe',
  'za',
  'eg',
  'ng',
  'ke',
  'sg',
  'hk',
  'tw',
  'ph',
  'my',
  'th',
  'vn',
  'id',
  'nz',
] as const;

/**
 * Category 5: Blindfold Chess domain-specific terms.
 *
 * Chess terminology reserved for official content, feature pages, and
 * to prevent impersonation of authoritative chess-related accounts.
 */
const CHESS_DOMAIN_NAMES = [
  'chess',
  'blindfold',
  'game',
  'match',
  'tournament',
  'player',
  'engine',
  'grandmaster',
  'master',
  'rating',
  'elo',
  'board',
  'piece',
  'pawn',
  'king',
  'queen',
  'rook',
  'bishop',
  'knight',
  'puzzle',
  'opening',
  'endgame',
  'middlegame',
  'checkmate',
  'stalemate',
  'castling',
  'promotion',
  'gambit',
  'defense',
  'attack',
  'blitz',
  'rapid',
  'classical',
  'bullet',
  'arena',
  'league',
  'club',
  'coach',
  'trainer',
  'analysis',
  'stockfish',
  'leela',
] as const;

/**
 * Category 6: Testing, development, and operational names.
 *
 * These names are commonly used for test accounts, development environments,
 * and operational purposes. Reserving them prevents confusion with real users
 * and avoids accidental use in production.
 */
const TESTING_AND_DEV_NAMES = [
  'test',
  'testing',
  'demo',
  'example',
  'sample',
  'dev',
  'development',
  'staging',
  'production',
  'debug',
  'sandbox',
  'qa',
  'temp',
  'tmp',
  'dummy',
  'localhost',
] as const;

/**
 * Category 7: Generic and placeholder names.
 *
 * These names are too generic for real user accounts, could be confused with
 * system-generated labels, or may cause technical issues due to being
 * programming reserved words.
 */
const GENERIC_PLACEHOLDER_NAMES = [
  'user',
  'me',
  'anonymous',
  'anon',
  'guest',
  'unknown',
  'nobody',
  'deleted',
  'null',
  'undefined',
] as const;

const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  ...RFC_2142_ROLE_NAMES,
  ...URL_ROUTING_NAMES,
  ...IMPERSONATION_NAMES,
  ...BRAND_AND_GEO_NAMES,
  ...CHESS_DOMAIN_NAMES,
  ...TESTING_AND_DEV_NAMES,
  ...GENERIC_PLACEHOLDER_NAMES,
]);

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username);
}
