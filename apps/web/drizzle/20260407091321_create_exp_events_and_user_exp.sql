CREATE TABLE "exp_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source" varchar(50) NOT NULL,
	"source_id" uuid,
	"menu_type" varchar(30),
	"amount" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_exp" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"total_exp" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_exp_events_user_created" ON "exp_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_exp_events_source" ON "exp_events" USING btree ("source","source_id");--> statement-breakpoint
CREATE INDEX "idx_user_exp_total" ON "user_exp" USING btree ("total_exp");