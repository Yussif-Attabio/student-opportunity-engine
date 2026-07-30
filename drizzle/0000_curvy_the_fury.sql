CREATE TYPE "public"."classification_status" AS ENUM('PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."education_level" AS ENUM('HIGH_SCHOOL', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'DOCTORATE', 'OTHER', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERN', 'VOLUNTEER', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."experience_level" AS ENUM('STUDENT', 'ENTRY_LEVEL', 'NEW_GRAD', 'MID_LEVEL', 'SENIOR', 'LEAD', 'MANAGER', 'EXECUTIVE', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."failure_kind" AS ENUM('SOURCE_VALIDATION', 'SOURCE_FETCH', 'NORMALIZATION', 'UPSERT', 'CLASSIFICATION', 'QUEUE_DELIVERY');--> statement-breakpoint
CREATE TYPE "public"."failure_status" AS ENUM('OPEN', 'RETRYING', 'RESOLVED', 'ABANDONED');--> statement-breakpoint
CREATE TYPE "public"."opportunity_type" AS ENUM('INTERNSHIP', 'NEW_GRAD_JOB', 'CO_OP', 'FELLOWSHIP', 'SCHOLARSHIP', 'RESEARCH', 'APPRENTICESHIP', 'CAMPUS_PROGRAM', 'ROTATIONAL_PROGRAM', 'JOB', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."remote_status" AS ENUM('REMOTE', 'HYBRID', 'ONSITE', 'FLEXIBLE', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."salary_period" AS ENUM('HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR', 'ONE_TIME', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."source_status" AS ENUM('PENDING', 'HEALTHY', 'DEGRADED', 'FAILING', 'DISABLED');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('GREENHOUSE', 'LEVER', 'ASHBY', 'CUSTOM_API', 'RSS', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."sponsorship_status" AS ENUM('AVAILABLE', 'NOT_AVAILABLE', 'RESTRICTED', 'NOT_STATED', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."sync_run_status" AS ENUM('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL');--> statement-breakpoint
CREATE TABLE "admin_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "opportunity_classifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"status" "classification_status" DEFAULT 'PENDING' NOT NULL,
	"content_hash" char(64) NOT NULL,
	"classifier_version" text NOT NULL,
	"prompt_version" text NOT NULL,
	"model" text NOT NULL,
	"confidence" real,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"result" jsonb,
	"raw_response" jsonb,
	"error_code" text,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "failure_kind" NOT NULL,
	"status" "failure_status" DEFAULT 'OPEN' NOT NULL,
	"source_id" uuid,
	"sync_run_id" uuid,
	"opportunity_id" uuid,
	"queue_message_id" text,
	"error_code" text,
	"error_message" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"next_retry_at" timestamp with time zone,
	"last_attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"source_id" uuid NOT NULL,
	"source_type" "source_type" NOT NULL,
	"organization_name" text NOT NULL,
	"organization_slug" text NOT NULL,
	"organization_logo_url" text,
	"title" text NOT NULL,
	"description_text" text,
	"description_html" text,
	"student_facing_summary" text,
	"opportunity_type" "opportunity_type" DEFAULT 'UNKNOWN' NOT NULL,
	"employment_type" "employment_type" DEFAULT 'UNKNOWN' NOT NULL,
	"experience_level" "experience_level" DEFAULT 'UNKNOWN' NOT NULL,
	"departments" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"locations" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"city" text,
	"state" text,
	"country" text,
	"remote_status" "remote_status" DEFAULT 'UNKNOWN' NOT NULL,
	"salary_minimum" numeric(14, 2),
	"salary_maximum" numeric(14, 2),
	"salary_currency" char(3),
	"salary_period" "salary_period",
	"application_url" text NOT NULL,
	"canonical_application_url" text NOT NULL,
	"source_url" text NOT NULL,
	"date_posted" timestamp with time zone,
	"application_deadline" timestamp with time zone,
	"student_eligible" boolean,
	"student_eligibility_confidence" real,
	"education_levels" "education_level"[] DEFAULT ARRAY[]::education_level[] NOT NULL,
	"eligible_graduation_years" integer[] DEFAULT ARRAY[]::integer[] NOT NULL,
	"majors" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"required_skills" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"preferred_skills" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"sponsorship_status" "sponsorship_status" DEFAULT 'UNKNOWN' NOT NULL,
	"classification_status" "classification_status" DEFAULT 'PENDING' NOT NULL,
	"classifier_version" text,
	"classified_at" timestamp with time zone,
	"content_hash" char(64) NOT NULL,
	"fingerprint" char(64) NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"missed_successful_syncs" integer DEFAULT 0 NOT NULL,
	"raw_source_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_name" text NOT NULL,
	"source_type" "source_type" NOT NULL,
	"source_identifier" text NOT NULL,
	"careers_url" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sync_frequency_minutes" integer DEFAULT 360 NOT NULL,
	"next_sync_at" timestamp with time zone,
	"last_successful_sync_at" timestamp with time zone,
	"last_attempted_sync_at" timestamp with time zone,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"status" "source_status" DEFAULT 'PENDING' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"status" "sync_run_status" DEFAULT 'QUEUED' NOT NULL,
	"queue_message_id" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"duration_ms" integer,
	"fetched_count" integer DEFAULT 0 NOT NULL,
	"valid_count" integer DEFAULT 0 NOT NULL,
	"created_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"unchanged_count" integer DEFAULT 0 NOT NULL,
	"deactivated_count" integer DEFAULT 0 NOT NULL,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"classification_queued_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "opportunity_classifications" ADD CONSTRAINT "opportunity_classifications_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_failures" ADD CONSTRAINT "ingestion_failures_source_id_opportunity_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."opportunity_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_failures" ADD CONSTRAINT "ingestion_failures_sync_run_id_opportunity_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."opportunity_sync_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_failures" ADD CONSTRAINT "ingestion_failures_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_source_id_opportunity_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."opportunity_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_sync_runs" ADD CONSTRAINT "opportunity_sync_runs_source_id_opportunity_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."opportunity_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_classifications_version_hash_uidx" ON "opportunity_classifications" USING btree ("opportunity_id","classifier_version","content_hash");--> statement-breakpoint
CREATE INDEX "opportunity_classifications_status_created_idx" ON "opportunity_classifications" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "opportunity_classifications_opportunity_idx" ON "opportunity_classifications" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "ingestion_failures_status_retry_idx" ON "ingestion_failures" USING btree ("status","next_retry_at");--> statement-breakpoint
CREATE INDEX "ingestion_failures_source_created_idx" ON "ingestion_failures" USING btree ("source_id","created_at");--> statement-breakpoint
CREATE INDEX "ingestion_failures_sync_run_idx" ON "ingestion_failures" USING btree ("sync_run_id");--> statement-breakpoint
CREATE INDEX "ingestion_failures_opportunity_idx" ON "ingestion_failures" USING btree ("opportunity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunities_source_external_uidx" ON "opportunities" USING btree ("source_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunities_canonical_url_uidx" ON "opportunities" USING btree ("canonical_application_url");--> statement-breakpoint
CREATE INDEX "opportunities_fingerprint_idx" ON "opportunities" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "opportunities_content_hash_idx" ON "opportunities" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "opportunities_active_student_date_idx" ON "opportunities" USING btree ("is_active","student_eligible","date_posted");--> statement-breakpoint
CREATE INDEX "opportunities_type_active_idx" ON "opportunities" USING btree ("opportunity_type","is_active");--> statement-breakpoint
CREATE INDEX "opportunities_remote_active_idx" ON "opportunities" USING btree ("remote_status","is_active");--> statement-breakpoint
CREATE INDEX "opportunities_source_active_idx" ON "opportunities" USING btree ("source_id","is_active");--> statement-breakpoint
CREATE INDEX "opportunities_locations_gin_idx" ON "opportunities" USING gin ("locations");--> statement-breakpoint
CREATE INDEX "opportunities_majors_gin_idx" ON "opportunities" USING gin ("majors");--> statement-breakpoint
CREATE INDEX "opportunities_required_skills_gin_idx" ON "opportunities" USING gin ("required_skills");--> statement-breakpoint
CREATE INDEX "opportunities_search_idx" ON "opportunities" USING gin (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("organization_name", '') || ' ' || coalesce("description_text", '')));--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_sources_type_identifier_uidx" ON "opportunity_sources" USING btree ("source_type","source_identifier");--> statement-breakpoint
CREATE INDEX "opportunity_sources_due_idx" ON "opportunity_sources" USING btree ("enabled","next_sync_at") WHERE "opportunity_sources"."enabled" = true;--> statement-breakpoint
CREATE INDEX "opportunity_sources_status_idx" ON "opportunity_sources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "opportunity_sync_runs_source_created_idx" ON "opportunity_sync_runs" USING btree ("source_id","created_at");--> statement-breakpoint
CREATE INDEX "opportunity_sync_runs_status_created_idx" ON "opportunity_sync_runs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "opportunity_sync_runs_queue_message_idx" ON "opportunity_sync_runs" USING btree ("queue_message_id");