ALTER TABLE "chunks" ADD COLUMN "slug" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_slug_unique" UNIQUE("slug");