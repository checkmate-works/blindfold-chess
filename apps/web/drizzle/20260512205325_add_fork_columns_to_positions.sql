ALTER TABLE "positions" ADD COLUMN "forked_from_id" uuid;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "forks_disabled_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_positions_forked_from" ON "positions" USING btree ("forked_from_id") WHERE forked_from_id IS NOT NULL;