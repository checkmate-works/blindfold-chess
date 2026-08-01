CREATE TABLE "repertoire_chunks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"repertoire_id" uuid NOT NULL,
	"position_key" varchar(100) NOT NULL,
	"chunk_id" uuid NOT NULL,
	"suggested_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_repertoire_chunks" UNIQUE("repertoire_id","position_key","chunk_id")
);
--> statement-breakpoint
ALTER TABLE "repertoire_chunks" ADD CONSTRAINT "repertoire_chunks_repertoire_id_repertoires_id_fk" FOREIGN KEY ("repertoire_id") REFERENCES "public"."repertoires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repertoire_chunks" ADD CONSTRAINT "repertoire_chunks_chunk_id_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."chunks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_repertoire_chunks_chunk" ON "repertoire_chunks" USING btree ("chunk_id");