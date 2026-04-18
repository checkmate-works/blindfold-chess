ALTER TABLE "subscriptions" ADD COLUMN "cancel_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "cancel_at_period_end";