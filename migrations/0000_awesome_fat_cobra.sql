CREATE TABLE "drivers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"cpf" text,
	"cnh" text,
	"cnh_expiry" timestamp,
	"phone" text,
	"status" text DEFAULT 'active' NOT NULL,
	CONSTRAINT "drivers_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
CREATE TABLE "extra_expenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"truck_id" varchar,
	"user_id" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"total_cost" numeric(12, 2) NOT NULL,
	"notes" text,
	"receipt_url" text
);
--> statement-breakpoint
CREATE TABLE "fuel_expenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"truck_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"liters" numeric(10, 2) NOT NULL,
	"price_per_liter" numeric(10, 3) NOT NULL,
	"total_cost" numeric(12, 2) NOT NULL,
	"odometer" numeric(12, 2) NOT NULL,
	"vendor" text,
	"payment_method" text,
	"receipt_url" text
);
--> statement-breakpoint
CREATE TABLE "maintenances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"truck_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"type" text NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"date" timestamp NOT NULL,
	"observations" text,
	"receipt_url" text
);
--> statement-breakpoint
CREATE TABLE "mileage_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"truck_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"km_initial" numeric(12, 2) NOT NULL,
	"km_final" numeric(12, 2) NOT NULL,
	"km_traveled" numeric(12, 2) NOT NULL,
	"value_received" numeric(12, 2) NOT NULL,
	"value_per_km" numeric(12, 4) NOT NULL,
	"route" text NOT NULL,
	"date" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payables" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"due_date" timestamp,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"receipt_url" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "receivables" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"due_date" timestamp,
	"category" text DEFAULT 'Outros' NOT NULL,
	"description" text NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"received_at" timestamp,
	"receipt_url" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "trucks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"plate" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"total_km" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"main_driver_id" varchar,
	CONSTRAINT "trucks_number_unique" UNIQUE("number"),
	CONSTRAINT "trucks_plate_unique" UNIQUE("plate")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "extra_expenses" ADD CONSTRAINT "extra_expenses_truck_id_trucks_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_expenses" ADD CONSTRAINT "extra_expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_expenses" ADD CONSTRAINT "fuel_expenses_truck_id_trucks_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_expenses" ADD CONSTRAINT "fuel_expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_truck_id_trucks_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mileage_records" ADD CONSTRAINT "mileage_records_truck_id_trucks_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mileage_records" ADD CONSTRAINT "mileage_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_main_driver_id_drivers_id_fk" FOREIGN KEY ("main_driver_id") REFERENCES "public"."drivers"("id") ON DELETE set null ON UPDATE no action;