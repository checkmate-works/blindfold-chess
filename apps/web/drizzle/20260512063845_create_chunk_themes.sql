CREATE TABLE "chunk_themes" (
	"chunk_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"attached_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chunk_themes_chunk_id_term_id_pk" PRIMARY KEY("chunk_id","term_id")
);
--> statement-breakpoint
ALTER TABLE "chunk_themes" ADD CONSTRAINT "chunk_themes_chunk_id_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunk_themes" ADD CONSTRAINT "chunk_themes_term_id_glossary_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."glossary_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chunk_themes_term" ON "chunk_themes" USING btree ("term_id");