CREATE TABLE "rate_limit_key_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_key" varchar(255) NOT NULL,
	"action" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_rate_limit_key_events_lookup" ON "rate_limit_key_events" USING btree ("subject_key","action","created_at");