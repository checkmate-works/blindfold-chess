/* eslint-disable no-param-reassign -- Sentry's beforeSend contract is mutate-in-place: the hook edits the event it is handed, and returning a copy would drop the fields Sentry attaches after it runs. Matches `./scrub`. */
/**
 * Stamps the Vercel deployment id onto Sentry events as a searchable tag,
 * shared by the `beforeSend` hooks on all three runtimes (browser, node,
 * edge).
 *
 * The tag is what makes deployment skew distinguishable from a framework bug.
 * A browser that loaded its bundle before a deploy keeps running that older
 * bundle until the tab navigates, so a client-side error can originate from a
 * deployment that is no longer the one serving traffic. Without the tag every
 * such event looks like it came from current production and the two causes are
 * indistinguishable; with it, comparing the event's `deployment_id` against the
 * deployment currently promoted to production answers the question directly.
 * The same value rides on RSC navigation responses as the
 * `x-nextjs-deployment-id` header, so a network log and a Sentry event can be
 * lined up against each other.
 */

/**
 * Reads the ambient deployment id, normalizing every "not available" spelling
 * to `undefined`.
 *
 * `raw` is `unknown` on purpose. `process.env.NEXT_DEPLOYMENT_ID` is not an
 * environment variable read at runtime — Next replaces the expression at build
 * time, and the replacement is only a string when a deployment id exists. When
 * Skew Protection is off (and in every local `next dev` run) the expression is
 * replaced with the boolean literal `false`, which a `?? fallback` or a
 * `string | undefined` annotation would both wave straight through and stamp
 * onto every event as the text `"false"`.
 */
export function normalizeDeploymentId(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

/**
 * The subset of a Sentry event this module needs. Declared structurally rather
 * than imported from `@sentry/nextjs` so the module stays dependency-free and
 * its tests can hand it plain objects. Mirrors `./scrub`.
 */
type EventWithTags = {
  tags?: Record<string, string | number | boolean | null | undefined>;
};

/**
 * Adds `deployment_id` to `event.tags` when a deployment id is available, and
 * leaves the event untouched otherwise.
 *
 * Deliberately reads the deployment id per call rather than caching it at
 * module scope. On the client, Next replaces the expression with a reference to
 * `globalThis.NEXT_DEPLOYMENT_ID`, a global its own bootstrap assigns; reading
 * it inside the hook means this module never has to be evaluated after that
 * bootstrap. The read is a property access, so repeating it per event costs
 * nothing worth caching.
 */
export function tagDeploymentIdInPlace(event: EventWithTags): void {
  const deploymentId = normalizeDeploymentId(process.env.NEXT_DEPLOYMENT_ID);
  if (!deploymentId) return;

  event.tags = { ...event.tags, deployment_id: deploymentId };
}
