CREATE TABLE "dojo_step_completions" (
	"user_id" uuid NOT NULL,
	"step_key" varchar(64) NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dojo_step_completions_user_id_step_key_pk" PRIMARY KEY("user_id","step_key"),
	CONSTRAINT "dojo_step_completions_chk_step_key" CHECK ("dojo_step_completions"."step_key" ~ '^[a-z0-9][a-z0-9:_-]{0,63}$')
);
