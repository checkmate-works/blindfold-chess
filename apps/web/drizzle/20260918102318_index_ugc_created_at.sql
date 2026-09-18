-- Plain (non-CONCURRENT) CREATE INDEX: the Drizzle migrator wraps each
-- migration in a transaction, which CREATE INDEX CONCURRENTLY cannot join
-- (see the connection-path policy in scripts/migrate.ts). Each statement
-- therefore holds a SHARE lock that blocks writes to its table until the
-- b-tree is built.
--
-- `IF NOT EXISTS` is deliberate, and is what makes that window optional: an
-- operator who judges the build too long for a deploy can create any of these
-- out-of-band with CREATE INDEX CONCURRENTLY beforehand, and this migration
-- then skips it instead of failing the deploy.
CREATE INDEX IF NOT EXISTS "idx_topic_posts_created_at" ON "topic_posts" USING btree ("created_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_positions_created_at" ON "positions" USING btree ("created_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_games_created_at" ON "games" USING btree ("created_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_repertoire_lines_created_at" ON "repertoire_lines" USING btree ("created_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_repertoires_created_at" ON "repertoires" USING btree ("created_at") WHERE deleted_at IS NULL;
