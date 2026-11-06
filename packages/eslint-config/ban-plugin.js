import { builtinRules } from "eslint/use-at-your-own-risk";
import tseslint from "typescript-eslint";

/**
 * The plugin every project-specific lint ban registers its rule under, so
 * that each ban owns a rule name no other config object sets.
 *
 * ## Why the bans do not use `no-restricted-imports` directly
 *
 * ESLint 9 flat config does not merge a rule's options across config
 * objects: when two objects that match the same file both set
 * `no-restricted-imports`, the later one's options replace the earlier one's
 * wholesale. Two bans built on the same core rule therefore cannot coexist
 * over the same files — adding the second silently deletes the first. That
 * happened once already: adding the chess.js ban to apps/web dropped the
 * `revalidatePath` ban, and the only symptom was its reason-annotated
 * `eslint-disable` comments turning into "unused directive" warnings.
 * The same trap applies to `no-restricted-syntax` and to every other
 * option-carrying rule, and to the `"off"` that a ban sets for its own
 * exceptions — turning the shared core rule off for test files would also
 * have turned off every other ban that rode on it there.
 *
 * Registering the unchanged core (or typescript-eslint) rule implementation
 * under a ban-specific name removes the collision by construction: each ban
 * has its own `files`, `ignores`, options and `"off"` exceptions, and config
 * order between bans stops mattering. The disable comment names the ban it
 * lifts (`eslint-disable-next-line ban/revalidate-path -- …`), so a disable
 * for one ban can no longer swallow another ban on the same line either.
 *
 * ## Adding a ban
 *
 * Add a rule here under a new name, then put the ban's config in its own
 * `*-ban.js` module that sets only `ban/<that name>` and registers this
 * plugin object via {@link banPlugins}. Never set the underlying core rule
 * name from a ban. `test/bans.test.mjs` lints fixtures through every real
 * config and fails if any ban stops firing or a disable goes unused.
 *
 * The plugin must be this one module-level object: flat config throws
 * "Cannot redefine plugin" when two config objects register different
 * objects under the same plugin name.
 */
export const banPlugin = {
  meta: { name: "@blindfold-chess/eslint-config/ban" },
  rules: {
    "revalidate-path": builtinRules.get("no-restricted-imports"),
    "chess-js": builtinRules.get("no-restricted-imports"),
    // typescript-eslint's extension rule: it supports `allowTypeImports`,
    // which the core rule lacks (see client-intl-hooks-ban.js).
    "client-intl-hooks": tseslint.plugin.rules["no-restricted-imports"],
    "hover-underline": builtinRules.get("no-restricted-syntax"),
  },
};

/** The `plugins` value each ban's config object spreads in. */
export const banPlugins = { ban: banPlugin };
