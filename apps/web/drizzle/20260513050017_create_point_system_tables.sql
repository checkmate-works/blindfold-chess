CREATE TABLE "point_batch_watermarks" (
	"batch_type" varchar(50) PRIMARY KEY NOT NULL,
	"watermark" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"category" varchar(30) NOT NULL,
	"source" varchar(50) NOT NULL,
	"source_id" varchar(255),
	"idempotency_key" varchar(255) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"payment_provider" varchar(30) NOT NULL,
	"payment_intent_id" varchar(255) NOT NULL,
	"status" varchar(20) NOT NULL,
	"point_event_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "point_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_code" varchar(100) NOT NULL,
	"cost" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"point_event_id" uuid,
	"user_grant_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_point_balances" (
	"user_id" uuid NOT NULL,
	"category" varchar(30) NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_point_balances_user_id_category_pk" PRIMARY KEY("user_id","category")
);
--> statement-breakpoint
ALTER TABLE "point_purchases" ADD CONSTRAINT "point_purchases_point_event_id_point_events_id_fk" FOREIGN KEY ("point_event_id") REFERENCES "public"."point_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_redemptions" ADD CONSTRAINT "point_redemptions_point_event_id_point_events_id_fk" FOREIGN KEY ("point_event_id") REFERENCES "public"."point_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_redemptions" ADD CONSTRAINT "point_redemptions_user_grant_id_user_grants_id_fk" FOREIGN KEY ("user_grant_id") REFERENCES "public"."user_grants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_point_events_user_created" ON "point_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_point_events_source" ON "point_events" USING btree ("source","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_point_events_idempotency_key" ON "point_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_point_purchases_user_created" ON "point_purchases" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_point_purchases_payment_intent" ON "point_purchases" USING btree ("payment_provider","payment_intent_id");--> statement-breakpoint
CREATE INDEX "idx_point_redemptions_user_created" ON "point_redemptions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_point_redemptions_status" ON "point_redemptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_user_point_balances_user" ON "user_point_balances" USING btree ("user_id");