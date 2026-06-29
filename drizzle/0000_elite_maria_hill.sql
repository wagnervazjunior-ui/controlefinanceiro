CREATE TABLE "bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"bank" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"last_four_digits" varchar(4) NOT NULL,
	"bank" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"bank_tag_alias" text,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "category_splits" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"percentage" numeric(5, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investments" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_type" text NOT NULL,
	"description" text,
	"contribution_amount" numeric(12, 2),
	"current_balance" numeric(12, 2) NOT NULL,
	"date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "months" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"status" varchar(10) DEFAULT 'aberto' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statement_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(10) NOT NULL,
	"month_id" integer NOT NULL,
	"card_id" integer,
	"bank_account_id" integer,
	"file_name" text NOT NULL,
	"imported_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"statement_import_id" integer NOT NULL,
	"month_id" integer NOT NULL,
	"card_id" integer,
	"bank_account_id" integer,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"date" date NOT NULL,
	"category_id" integer,
	"installment_current" integer,
	"installment_total" integer,
	"installment_group_key" text,
	"bank_suggested_tag" text,
	"dedupe_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "category_splits" ADD CONSTRAINT "category_splits_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_splits" ADD CONSTRAINT "category_splits_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_imports" ADD CONSTRAINT "statement_imports_month_id_months_id_fk" FOREIGN KEY ("month_id") REFERENCES "public"."months"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_imports" ADD CONSTRAINT "statement_imports_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_imports" ADD CONSTRAINT "statement_imports_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_statement_import_id_statement_imports_id_fk" FOREIGN KEY ("statement_import_id") REFERENCES "public"."statement_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_month_id_months_id_fk" FOREIGN KEY ("month_id") REFERENCES "public"."months"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "months_year_month_idx" ON "months" USING btree ("year","month");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_dedupe_key_idx" ON "transactions" USING btree ("dedupe_key");