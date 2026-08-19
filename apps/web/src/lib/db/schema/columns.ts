import { timestamp } from 'drizzle-orm/pg-core';

/**
 * The `created_at` / `updated_at` pair carried by most tables.
 *
 * Spread into a table definition (`...timestamps`) rather than restated. The
 * shape had been written out 63 and 23 times respectively, and the paragraph
 * below — the part a reader actually needs — was pasted into 19 of the schema
 * modules verbatim.
 *
 * @design updated_at is refreshed by Drizzle, not by the database
 *
 * `$onUpdateFn` is attached here, so every table that spreads this gets the
 * refresh without opting in. Doing it in the ORM rather than with a trigger
 * keeps the rule visible in the schema a reader is already looking at.
 *
 * The one exception is `profiles`, which declares `updatedAt` itself, without
 * the callback: it is refreshed by a Supabase `BEFORE UPDATE` trigger
 * (`profiles_updated_at`) because it can be written through internal Supabase
 * paths that go via `auth.users` — auth hooks, for instance — which never pass
 * through Drizzle. Centralizing that one at the DB layer is what makes the
 * timestamp trustworthy there. See the `@design` note on the `profiles` table
 * for the rest of that story.
 *
 * Several call sites still pass an explicit `set({ updatedAt: new Date() })`.
 * They are redundant but harmless, and they keep working if an UPDATE path that
 * bypasses Drizzle is ever introduced.
 */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
};

/**
 * `created_at` alone, for tables that are append-only or whose rows are never
 * edited in place (ledger entries, event rows, join tables).
 */
export const createdAtOnly = {
  createdAt: timestamps.createdAt,
};

/**
 * `updated_at` alone, for tables whose row is created and then only ever
 * revised — a running balance, a high score, a watermark — where the creation
 * time carries no information the revision time does not.
 */
export const updatedAtOnly = {
  updatedAt: timestamps.updatedAt,
};

/**
 * The soft-delete marker. `NULL` means live; a timestamp means the row is
 * hidden from every read path that composes the matching predicate.
 *
 * Kept separate from {@link timestamps} because soft-deletability is a property
 * of the entity, not of being timestamped — most tables that carry
 * `created_at` are not soft-deletable, and spreading the two together would
 * quietly make them so.
 */
export const softDeleteTimestamp = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};
