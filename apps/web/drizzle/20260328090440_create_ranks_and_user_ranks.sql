CREATE TABLE "ranks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(50) NOT NULL,
	"level" integer NOT NULL,
	"color" varchar(20),
	"requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ranks_slug_unique" UNIQUE("slug"),
	CONSTRAINT "ranks_level_unique" UNIQUE("level")
);
--> statement-breakpoint
CREATE TABLE "user_ranks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"rank_id" uuid NOT NULL,
	"achieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_user_rank" UNIQUE("user_id","rank_id")
);
--> statement-breakpoint
ALTER TABLE "user_ranks" ADD CONSTRAINT "user_ranks_rank_id_ranks_id_fk" FOREIGN KEY ("rank_id") REFERENCES "public"."ranks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_ranks_user" ON "user_ranks" USING btree ("user_id");