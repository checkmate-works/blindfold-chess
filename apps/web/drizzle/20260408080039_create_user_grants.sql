CREATE TABLE "user_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"benefit_type" varchar(50) NOT NULL,
	"grant_type" varchar(50) NOT NULL,
	"resource_type" varchar(50),
	"resource_id" varchar(255),
	"reason" text,
	"starts_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "idx_user_grants_benefit_lookup" ON "user_grants" USING btree ("user_id","benefit_type","expires_at");--> statement-breakpoint
CREATE INDEX "idx_user_grants_user" ON "user_grants" USING btree ("user_id");