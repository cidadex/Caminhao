ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "username" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "password_hash" text;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "drivers" ADD CONSTRAINT "drivers_username_unique" UNIQUE("username");
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;
