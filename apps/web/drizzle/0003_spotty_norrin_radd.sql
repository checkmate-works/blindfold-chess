CREATE TABLE "glossary_term_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" uuid NOT NULL,
	"fen" varchar(100) NOT NULL,
	"sort_order" integer DEFAULT 0,
	"caption" varchar(255),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "glossary_term_positions" ADD CONSTRAINT "glossary_term_positions_term_id_glossary_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."glossary_terms"("id") ON DELETE cascade ON UPDATE no action;