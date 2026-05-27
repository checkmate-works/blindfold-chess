CREATE TABLE "chunk_edit_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chunk_id" uuid NOT NULL,
	"proposer_id" uuid,
	"proposed_title" varchar(255),
	"proposed_description" text,
	"comment" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolver_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chunk_feedback_topics" (
	"chunk_id" uuid NOT NULL,
	"topic" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chunk_feedback_topics_chunk_id_topic_pk" PRIMARY KEY("chunk_id","topic")
);
--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "status" varchar(20) DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
-- Backfill: every existing row defaults to status='published' (see ADD COLUMN
-- default above), so seed `published_at` from `created_at` for those rows.
-- New draft inserts via the UGC flow leave `published_at` NULL and the
-- application's publish path sets it on the status transition.
UPDATE "chunks" SET "published_at" = "created_at" WHERE "status" = 'published' AND "published_at" IS NULL;--> statement-breakpoint
ALTER TABLE "chunk_edit_requests" ADD CONSTRAINT "chunk_edit_requests_chunk_id_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunk_feedback_topics" ADD CONSTRAINT "chunk_feedback_topics_chunk_id_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chunk_edit_requests_chunk_status_created" ON "chunk_edit_requests" USING btree ("chunk_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_chunk_edit_requests_proposer_created" ON "chunk_edit_requests" USING btree ("proposer_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_chunk_edit_requests_one_pending" ON "chunk_edit_requests" USING btree ("chunk_id","proposer_id") WHERE status = 'pending';