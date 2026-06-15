CREATE TABLE "position_edit_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position_id" uuid NOT NULL,
	"proposer_id" uuid,
	"proposed_chunk_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"comment" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_base_chunk_ids" jsonb,
	"resolver_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "position_edit_requests" ADD CONSTRAINT "position_edit_requests_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_position_edit_requests_position_status_created" ON "position_edit_requests" USING btree ("position_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_position_edit_requests_proposer_created" ON "position_edit_requests" USING btree ("proposer_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_position_edit_requests_one_pending" ON "position_edit_requests" USING btree ("position_id","proposer_id") WHERE status = 'pending';