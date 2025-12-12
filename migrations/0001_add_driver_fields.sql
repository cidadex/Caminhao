CREATE TABLE "routes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"distance" numeric(10, 2),
	"estimated_time" text,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "birth_date" timestamp;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "cep" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "street" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "number" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "complement" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "neighborhood" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "emergency_contact_name" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "emergency_contact_phone" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "emergency_contact_relation" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "health_insurance" text;