-- Initial schema for Bengo MVP

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other', 'unspecified');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE interest_category_enum AS ENUM ('youth_policy', 'childcare_policy');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE region_code_enum AS ENUM ('seoul_gangnam', 'seoul_mapo', 'seoul_songpa');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE policy_status_enum AS ENUM ('draft', 'active', 'inactive', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE question_type_enum AS ENUM ('string', 'number', 'boolean', 'select');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE eligibility_result_enum AS ENUM ('eligible', 'conditional', 'ineligible');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_policy_state_enum AS ENUM ('discovered', 'in_review', 'applied', 'hidden');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email varchar(255) NOT NULL UNIQUE,
  "passwordHash" varchar(255) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  age int NOT NULL,
  gender gender_enum NOT NULL DEFAULT 'unspecified',
  "regionCode" region_code_enum NOT NULL,
  interests interest_category_enum[] NOT NULL DEFAULT '{}',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code varchar(64) NOT NULL UNIQUE,
  title varchar(255) NOT NULL,
  "shortDescription" text NOT NULL,
  description text NOT NULL,
  "providerName" varchar(120) NOT NULL,
  "sourceUrl" varchar(500),
  "applicationUrl" varchar(500),
  "applicationMethod" text,
  status policy_status_enum NOT NULL DEFAULT 'active',
  categories interest_category_enum[] NOT NULL DEFAULT '{}',
  "regionCodes" region_code_enum[] NOT NULL DEFAULT '{}',
  "targetGenders" gender_enum[] NOT NULL DEFAULT '{}',
  "minAge" int,
  "maxAge" int,
  "startsAt" date,
  "endsAt" date,
  "extraMeta" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policy_requirements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "policyId" uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  key varchar(64) NOT NULL,
  label varchar(160) NOT NULL,
  description text,
  type question_type_enum NOT NULL,
  options jsonb,
  "isRequired" boolean NOT NULL DEFAULT true,
  "displayOrder" int NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policy_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "policyId" uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  version int NOT NULL,
  definition jsonb NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  notes text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eligibility_checks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "policyId" uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  "inputAnswers" jsonb NOT NULL DEFAULT '{}'::jsonb,
  result eligibility_result_enum NOT NULL,
  reasons text[] NOT NULL DEFAULT '{}',
  explanation text,
  "evaluatedRuleVersion" int,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_policy_states (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "policyId" uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  state user_policy_state_enum NOT NULL DEFAULT 'discovered',
  note text,
  "appliedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE("userId", "policyId")
);

CREATE TABLE IF NOT EXISTS raw_policy_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source varchar(120) NOT NULL,
  "sourceUrl" varchar(500),
  title varchar(255) NOT NULL,
  body text NOT NULL,
  "fetchedAt" timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_ingestion_runs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "rawDocumentId" uuid NOT NULL REFERENCES raw_policy_documents(id) ON DELETE CASCADE,
  "policyId" uuid REFERENCES policies(id) ON DELETE SET NULL,
  normalized jsonb NOT NULL,
  validation jsonb NOT NULL,
  persisted boolean NOT NULL,
  action varchar(16) NOT NULL,
  message text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_categories ON policies USING GIN (categories);
CREATE INDEX IF NOT EXISTS idx_policies_regions ON policies USING GIN ("regionCodes");
CREATE INDEX IF NOT EXISTS idx_eligibility_checks_user_policy ON eligibility_checks("userId", "policyId");
CREATE INDEX IF NOT EXISTS idx_raw_policy_documents_source ON raw_policy_documents(source);
CREATE INDEX IF NOT EXISTS idx_pipeline_ingestion_runs_raw ON pipeline_ingestion_runs("rawDocumentId");
