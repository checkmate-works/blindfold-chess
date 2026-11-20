ALTER TABLE "challenge_results" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_ca_result" ON "challenge_attempts" USING btree ("challenge_result_id");