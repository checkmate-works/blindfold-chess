DROP INDEX "idx_repertoires_public";--> statement-breakpoint
ALTER TABLE "repertoires" ALTER COLUMN "status" SET DEFAULT 'building';--> statement-breakpoint
ALTER TABLE "repertoires" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
-- Every existing repertoire is 'public' (created before the 'building' status
-- existed) and was effectively published at creation time.
UPDATE "repertoires" SET "published_at" = "created_at" WHERE "status" = 'public';--> statement-breakpoint
CREATE INDEX "idx_repertoires_public" ON "repertoires" USING btree ("published_at" DESC NULLS LAST) WHERE deleted_at IS NULL AND status = 'public';