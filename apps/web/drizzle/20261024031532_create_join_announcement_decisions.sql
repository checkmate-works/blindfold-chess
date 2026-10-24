CREATE TABLE "join_announcement_decisions" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"outcome" varchar(20) NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Members who existed before this feature were never offered the announcement:
-- record them as not_offered so the onboarding step only appears for new sign-ups.
INSERT INTO "join_announcement_decisions" ("user_id", "outcome")
SELECT "id", 'not_offered' FROM "profiles"
ON CONFLICT ("user_id") DO NOTHING;
