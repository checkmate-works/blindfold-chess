CREATE TABLE "user_interview_answers" (
	"user_id" uuid NOT NULL,
	"question_key" varchar(50) NOT NULL,
	"answer_value" varchar(500) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_interview_answers_pkey" PRIMARY KEY("user_id","question_key")
);
--> statement-breakpoint
CREATE INDEX "idx_user_interview_answers_question" ON "user_interview_answers" USING btree ("question_key");