CREATE TABLE "position_tags" (
	"position_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "uq_position_tag" UNIQUE("position_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"fen" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "position_tags" ADD CONSTRAINT "position_tags_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_tags" ADD CONSTRAINT "position_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_positions_user" ON "positions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_positions_type" ON "positions" USING btree ("type");