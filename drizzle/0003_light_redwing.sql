ALTER TYPE "public"."source_type" ADD VALUE 'STRUCTURED_DATA' BEFORE 'CUSTOM_API';--> statement-breakpoint
ALTER TYPE "public"."source_type" ADD VALUE 'CUSTOM_SCRAPER' BEFORE 'CUSTOM_API';--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "teams" text[] DEFAULT ARRAY[]::text[] NOT NULL;