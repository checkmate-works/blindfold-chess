ALTER TABLE "user_grants" ADD COLUMN "source_type" varchar(50);--> statement-breakpoint
ALTER TABLE "user_grants" ADD COLUMN "source_id" varchar(255);--> statement-breakpoint
CREATE INDEX "idx_user_grants_source" ON "user_grants" USING btree ("source_type","source_id");