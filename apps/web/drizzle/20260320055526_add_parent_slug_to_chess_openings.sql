ALTER TABLE "chess_openings" ADD COLUMN "parent_slug" varchar(100);--> statement-breakpoint
CREATE INDEX "idx_chess_openings_parent_slug" ON "chess_openings" USING btree ("parent_slug");--> statement-breakpoint
ALTER TABLE "chess_openings"
  ADD CONSTRAINT "fk_chess_openings_parent_slug"
  FOREIGN KEY ("parent_slug") REFERENCES "chess_openings"("slug")
  ON DELETE SET NULL ON UPDATE CASCADE;