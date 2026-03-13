ALTER TABLE "blocks" RENAME TO "user_blocks";--> statement-breakpoint
ALTER TABLE "follows" RENAME TO "user_follows";--> statement-breakpoint
ALTER TABLE "user_blocks" DROP CONSTRAINT "uq_block";--> statement-breakpoint
ALTER TABLE "user_follows" DROP CONSTRAINT "uq_follow";--> statement-breakpoint
DROP INDEX "idx_blocks_blocker";--> statement-breakpoint
DROP INDEX "idx_blocks_blocked";--> statement-breakpoint
DROP INDEX "idx_follows_follower";--> statement-breakpoint
DROP INDEX "idx_follows_following";--> statement-breakpoint
CREATE INDEX "idx_user_blocks_blocker" ON "user_blocks" USING btree ("blocker_id");--> statement-breakpoint
CREATE INDEX "idx_user_blocks_blocked" ON "user_blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "idx_user_follows_follower" ON "user_follows" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "idx_user_follows_following" ON "user_follows" USING btree ("following_id");--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "uq_user_block" UNIQUE("blocker_id","blocked_id");--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "uq_user_follow" UNIQUE("follower_id","following_id");