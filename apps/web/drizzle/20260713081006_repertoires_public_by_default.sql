ALTER TABLE "repertoires" ALTER COLUMN "status" SET DEFAULT 'public';--> statement-breakpoint
-- Every existing repertoire was created under the old private-by-default rule,
-- while nothing in the app ever wrote this column — so they are all "private"
-- only by accident of the default, not by an author's choice. Bring them in
-- line with the new default; the paid-plan toggle will be the first thing to
-- actually set 'private'.
UPDATE "repertoires" SET "status" = 'public' WHERE "status" = 'private';
