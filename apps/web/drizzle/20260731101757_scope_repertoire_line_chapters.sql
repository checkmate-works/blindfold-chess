-- Keep a line and the chapter it is filed under in the same repertoire. The
-- single-column FK only checked that the chapter existed, so a bug or a forged
-- request could file a line under another course's chapter.
--
-- Statement order matters: the composite FK's target UNIQUE has to exist before
-- the FK can reference it (drizzle-kit generated these the other way round).
ALTER TABLE "repertoire_chapters" ADD CONSTRAINT "uq_repertoire_chapter_scope" UNIQUE("id","repertoire_id");--> statement-breakpoint

ALTER TABLE "repertoire_lines" DROP CONSTRAINT "repertoire_lines_chapter_id_repertoire_chapters_id_fk";--> statement-breakpoint

-- NO ACTION, not SET NULL: the FK spans (chapter_id, repertoire_id) and a plain
-- SET NULL would try to null repertoire_id too, which is NOT NULL. Postgres 15+
-- could say SET NULL (chapter_id), but drizzle-kit cannot express the column
-- list, so the snapshot would disagree with the database forever. Deleting a
-- chapter therefore clears its lines' chapter_id in the mutation instead.
ALTER TABLE "repertoire_lines" ADD CONSTRAINT "fk_repertoire_lines_chapter_scope" FOREIGN KEY ("chapter_id","repertoire_id") REFERENCES "public"."repertoire_chapters"("id","repertoire_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Line order is now scoped to the chapter, so the ordering index is too.
DROP INDEX "idx_repertoire_lines_repertoire";--> statement-breakpoint
CREATE INDEX "idx_repertoire_lines_repertoire" ON "repertoire_lines" USING btree ("repertoire_id","chapter_id","seq");
