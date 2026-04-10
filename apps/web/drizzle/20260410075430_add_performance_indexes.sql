DROP INDEX IF EXISTS "idx_positions_type";--> statement-breakpoint
CREATE INDEX "idx_position_tags_tag" ON "position_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "idx_positions_type_created_at" ON "positions" USING btree ("type","created_at" DESC NULLS LAST) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_likes_user_type_created_at" ON "likes" USING btree ("user_id","target_type","created_at" DESC NULLS LAST);