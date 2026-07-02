CREATE TABLE IF NOT EXISTS "settlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"month_id" integer NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_month_id_months_id_fk" FOREIGN KEY ("month_id") REFERENCES "public"."months"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "settlements_person_month_idx" ON "settlements" ("person_id","month_id");
