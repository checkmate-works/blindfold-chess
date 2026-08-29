/**
 * The single error code every write choke point returns when a block bars the
 * interaction — see `assertNotBlocked` in `./block`, which produces it.
 *
 * Namespace-qualified on purpose. `assertNotBlocked` is shared by features
 * that each own a different error dictionary, and a bare `blocked` only
 * renders in the ones that happen to carry their own sentence for it — the
 * topic forms resolve unknown bare codes to a generic "something went wrong",
 * so a namespace without the key would degrade silently. A dotted code always
 * resolves against the global `moderation` dictionary instead, so a new choke
 * point gets a correct message with no catalogue work; a surface that wants
 * wording tailored to its own action still maps the code to a local sentence
 * (the chunk / position suggestion forms and the game comment thread do).
 *
 * It sits in its own module, apart from the guard that returns it, because
 * those tailored surfaces are Client Components: importing the constant from
 * `./block` would drag `server-only` and the Drizzle client into their bundle.
 */
export const MODERATION_BLOCKED_ERROR = 'moderation.blocked';
