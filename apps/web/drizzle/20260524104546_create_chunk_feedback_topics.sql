CREATE TABLE "chunk_feedback_topics" (
	"chunk_id" uuid NOT NULL,
	"topic" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chunk_feedback_topics_chunk_id_topic_pk" PRIMARY KEY("chunk_id","topic")
);
--> statement-breakpoint
ALTER TABLE "chunk_feedback_topics" ADD CONSTRAINT "chunk_feedback_topics_chunk_id_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."chunks"("id") ON DELETE cascade ON UPDATE no action;