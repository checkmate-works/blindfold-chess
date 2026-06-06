CREATE TABLE "repertoire_annotations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"repertoire_id" uuid NOT NULL,
	"position_key" varchar(100) NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_repertoire_annotation" UNIQUE("repertoire_id","position_key")
);
--> statement-breakpoint
CREATE TABLE "repertoire_chapters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"repertoire_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"seq" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repertoire_deviations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"repertoire_id" uuid NOT NULL,
	"game_id" uuid,
	"position_key" varchar(100) NOT NULL,
	"ply" integer NOT NULL,
	"played_move" varchar(16) NOT NULL,
	"expected_moves" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "repertoire_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"repertoire_id" uuid NOT NULL,
	"chapter_id" uuid,
	"name" varchar(255),
	"pgn" text NOT NULL,
	"starting_fen" varchar(100),
	"seq" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repertoire_openings" (
	"repertoire_id" uuid NOT NULL,
	"opening_id" uuid NOT NULL,
	CONSTRAINT "repertoire_openings_repertoire_id_opening_id_pk" PRIMARY KEY("repertoire_id","opening_id")
);
--> statement-breakpoint
CREATE TABLE "repertoire_reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"repertoire_id" uuid NOT NULL,
	"position_key" varchar(100) NOT NULL,
	"state" varchar(20) DEFAULT 'new' NOT NULL,
	"stability" real,
	"difficulty" real,
	"due_at" timestamp with time zone,
	"last_reviewed_at" timestamp with time zone,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_repertoire_review" UNIQUE("user_id","repertoire_id","position_key")
);
--> statement-breakpoint
CREATE TABLE "repertoires" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"name" varchar(255) NOT NULL,
	"side" varchar(5) NOT NULL,
	"phase" varchar(20) DEFAULT 'opening' NOT NULL,
	"description" text,
	"starting_fen" varchar(100),
	"status" varchar(20) DEFAULT 'private' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "repertoire_annotations" ADD CONSTRAINT "repertoire_annotations_repertoire_id_repertoires_id_fk" FOREIGN KEY ("repertoire_id") REFERENCES "public"."repertoires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repertoire_chapters" ADD CONSTRAINT "repertoire_chapters_repertoire_id_repertoires_id_fk" FOREIGN KEY ("repertoire_id") REFERENCES "public"."repertoires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repertoire_deviations" ADD CONSTRAINT "repertoire_deviations_repertoire_id_repertoires_id_fk" FOREIGN KEY ("repertoire_id") REFERENCES "public"."repertoires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repertoire_lines" ADD CONSTRAINT "repertoire_lines_repertoire_id_repertoires_id_fk" FOREIGN KEY ("repertoire_id") REFERENCES "public"."repertoires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repertoire_lines" ADD CONSTRAINT "repertoire_lines_chapter_id_repertoire_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."repertoire_chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repertoire_openings" ADD CONSTRAINT "repertoire_openings_repertoire_id_repertoires_id_fk" FOREIGN KEY ("repertoire_id") REFERENCES "public"."repertoires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repertoire_openings" ADD CONSTRAINT "repertoire_openings_opening_id_chess_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."chess_openings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repertoire_reviews" ADD CONSTRAINT "repertoire_reviews_repertoire_id_repertoires_id_fk" FOREIGN KEY ("repertoire_id") REFERENCES "public"."repertoires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_repertoire_chapters_repertoire" ON "repertoire_chapters" USING btree ("repertoire_id","seq");--> statement-breakpoint
CREATE INDEX "idx_repertoire_deviations_user" ON "repertoire_deviations" USING btree ("user_id","repertoire_id");--> statement-breakpoint
CREATE INDEX "idx_repertoire_deviations_open" ON "repertoire_deviations" USING btree ("user_id","resolved_at");--> statement-breakpoint
CREATE INDEX "idx_repertoire_lines_repertoire" ON "repertoire_lines" USING btree ("repertoire_id","seq");--> statement-breakpoint
CREATE INDEX "idx_repertoire_openings_opening" ON "repertoire_openings" USING btree ("opening_id");--> statement-breakpoint
CREATE INDEX "idx_repertoire_reviews_due" ON "repertoire_reviews" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "idx_repertoires_user" ON "repertoires" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_repertoires_public" ON "repertoires" USING btree ("id" DESC NULLS LAST) WHERE deleted_at IS NULL AND status = 'public';