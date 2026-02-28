CREATE TABLE "practice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"menu_type" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now(),
	"settings" jsonb DEFAULT '{}'::jsonb,
	"result" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_practice_sessions_user" ON "practice_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_practice_sessions_menu" ON "practice_sessions" USING btree ("user_id","menu_type");--> statement-breakpoint
CREATE INDEX "idx_practice_sessions_recent" ON "practice_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
ALTER TABLE "practice_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "practice_sessions_select" ON "practice_sessions" FOR SELECT USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "practice_sessions_insert" ON "practice_sessions" FOR INSERT WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "practice_sessions_delete" ON "practice_sessions" FOR DELETE USING (auth.uid() = user_id);