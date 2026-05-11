CREATE TABLE "position_themes" (
	"position_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"attached_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "position_themes_position_id_term_id_pk" PRIMARY KEY("position_id","term_id")
);
--> statement-breakpoint
ALTER TABLE "glossary_terms" ADD COLUMN "is_theme" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "position_chunks" ADD COLUMN "attached_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "position_themes" ADD CONSTRAINT "position_themes_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_themes" ADD CONSTRAINT "position_themes_term_id_glossary_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."glossary_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_position_themes_term" ON "position_themes" USING btree ("term_id");