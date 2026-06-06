ALTER TABLE "user_lines" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_lines" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_lines" ADD COLUMN "status" varchar(20) DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_lines" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_user_lines_public" ON "user_lines" USING btree ("id" DESC NULLS LAST) WHERE deleted_at IS NULL AND status = 'public';