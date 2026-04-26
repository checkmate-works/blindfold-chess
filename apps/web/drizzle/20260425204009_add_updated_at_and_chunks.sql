CREATE TABLE "chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"representative_fen" varchar(100) NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "position_chunks" (
	"position_id" uuid NOT NULL,
	"chunk_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "position_chunks_position_id_chunk_id_pk" PRIMARY KEY("position_id","chunk_id")
);
--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "position_chunks" ADD CONSTRAINT "position_chunks_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_chunks" ADD CONSTRAINT "position_chunks_chunk_id_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."chunks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chunks_user" ON "chunks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_chunks_created_at" ON "chunks" USING btree ("created_at" DESC NULLS LAST) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_position_chunks_chunk" ON "position_chunks" USING btree ("chunk_id");