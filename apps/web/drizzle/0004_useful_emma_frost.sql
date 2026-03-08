ALTER TABLE "profiles" ADD COLUMN "banned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "ban_reason" text;