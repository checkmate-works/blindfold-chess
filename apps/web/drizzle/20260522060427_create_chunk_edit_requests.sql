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
	"resolver_comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chunk_edit_requests" ADD CONSTRAINT "chunk_edit_requests_chunk_id_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chunk_edit_requests_chunk_status_created" ON "chunk_edit_requests" USING btree ("chunk_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_chunk_edit_requests_proposer_created" ON "chunk_edit_requests" USING btree ("proposer_id","created_at" DESC NULLS LAST);