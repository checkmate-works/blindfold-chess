ALTER TABLE "games" ADD COLUMN "maia_charge_id" uuid;--> statement-breakpoint
CREATE INDEX "idx_games_maia_charge" ON "games" USING btree ("maia_charge_id") WHERE maia_charge_id IS NOT NULL;