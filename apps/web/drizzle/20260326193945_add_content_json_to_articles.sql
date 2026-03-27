ALTER TABLE "articles" ADD COLUMN "content_json" jsonb;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "content_format" varchar(20) DEFAULT 'markdown' NOT NULL;