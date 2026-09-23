/**
 * Verified Talent: professional profiles, job postings and applications.
 *
 * Raw SQL in a standalone script, like every other migration here. This
 * project has no ORM — ~80 API routes use tagged-template SQL through
 * @neondatabase/serverless, and introducing a second data layer for one
 * module would mean two ways to read the same tables.
 *
 * Shapes worth explaining:
 *
 *   skills are TEXT[] rather than a join table. Matching a candidate to a job
 *   is an overlap test between two lists, which Postgres does directly on an
 *   array with a GIN index. A skills table would need two joins and a group-by
 *   to answer the same question.
 *
 *   work history and education are JSONB. They are displayed as written and
 *   never queried field-by-field; modelling them relationally would add two
 *   tables to support an edit form that always rewrites the whole list.
 *
 *   an application stores a snapshot of the headline and skills as they were
 *   when it was sent. An applicant who later rewrites their profile must not
 *   silently rewrite what an employer already read and judged.
 *
 * Additive and safe to re-run.
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const f of ['.env.local', '.env.production', '.env']) {
    if (!fs.existsSync(f)) continue;
    const m = fs.readFileSync(f, 'utf8').match(/^DATABASE_URL=(.*)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found');
}
const db = neon(databaseUrl());

/* ---------------------------------------------------------------- profiles */

await db`
  CREATE TABLE IF NOT EXISTS talent_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    headline        TEXT,
    summary         TEXT,
    location        TEXT,
    skills          TEXT[] NOT NULL DEFAULT '{}',

    work_history    JSONB NOT NULL DEFAULT '[]'::jsonb,
    education       JSONB NOT NULL DEFAULT '[]'::jsonb,
    portfolio_links JSONB NOT NULL DEFAULT '[]'::jsonb,

    cv_url          TEXT,
    cv_text         TEXT,
    video_intro_url TEXT,

    -- Off by default. A profile becomes visible to employers only when its
    -- owner says so: someone quietly updating their CV while employed must
    -- not appear in an employer's search the moment they save a draft.
    is_published    BOOLEAN NOT NULL DEFAULT FALSE,
    open_to_work    BOOLEAN NOT NULL DEFAULT TRUE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
console.log('talent_profiles ready');

await db`CREATE INDEX IF NOT EXISTS talent_profiles_skills_idx ON talent_profiles USING GIN (skills)`;
await db`CREATE INDEX IF NOT EXISTS talent_profiles_published_idx ON talent_profiles (is_published, open_to_work)`;

/* ------------------------------------------------------------------- jobs */

await db`
  CREATE TABLE IF NOT EXISTS job_postings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,

    title               TEXT NOT NULL,
    description         TEXT NOT NULL,
    required_skills     TEXT[] NOT NULL DEFAULT '{}',

    employment_type     TEXT NOT NULL DEFAULT 'full_time',
    location_type       TEXT NOT NULL DEFAULT 'on_site',
    location            TEXT,

    -- Stored in cents like every other money column in this database, so a
    -- salary can never be half-rand out depending on which table read it.
    salary_min_cents    BIGINT,
    salary_max_cents    BIGINT,
    salary_period       TEXT DEFAULT 'month',
    salary_visible      BOOLEAN NOT NULL DEFAULT TRUE,

    application_deadline DATE,
    status              TEXT NOT NULL DEFAULT 'open',

    views_count         INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at           TIMESTAMPTZ
  )
`;
console.log('job_postings ready');

await db`CREATE INDEX IF NOT EXISTS job_postings_business_idx ON job_postings (business_id)`;
await db`CREATE INDEX IF NOT EXISTS job_postings_open_idx ON job_postings (status, created_at DESC)`;
await db`CREATE INDEX IF NOT EXISTS job_postings_skills_idx ON job_postings USING GIN (required_skills)`;

/* ----------------------------------------------------------- applications */

await db`
  CREATE TABLE IF NOT EXISTS job_applications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id            UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    applicant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    cover_note        TEXT,

    -- What the employer actually read, frozen at the moment of applying.
    snapshot_headline TEXT,
    snapshot_skills   TEXT[] NOT NULL DEFAULT '{}',
    snapshot_cv_url   TEXT,

    -- applied -> shortlisted -> interview -> hired, or rejected / withdrawn.
    status            TEXT NOT NULL DEFAULT 'applied',
    status_note       TEXT,
    status_changed_at TIMESTAMPTZ,
    status_changed_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Recorded when sent rather than recomputed on read: the score an employer
    -- sorted by must not change because the candidate edited their skills.
    match_score       INTEGER,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
console.log('job_applications ready');

// One application per person per job. Without this a double-clicked Apply
// button puts the same candidate in an employer's pipeline twice.
await db`
  CREATE UNIQUE INDEX IF NOT EXISTS job_applications_once_idx
  ON job_applications (job_id, applicant_user_id)
`;
await db`CREATE INDEX IF NOT EXISTS job_applications_job_status_idx ON job_applications (job_id, status)`;
await db`CREATE INDEX IF NOT EXISTS job_applications_applicant_idx ON job_applications (applicant_user_id, created_at DESC)`;
console.log('indexes ready');

/* ------------------------------------------------------------------ report */

for (const t of ['talent_profiles', 'job_postings', 'job_applications']) {
  const [r] = await db.query(`SELECT COUNT(*)::int n FROM "${t}"`);
  console.log(`  ${t}: ${r.n} row(s)`);
}

const [{ n: eligible }] = await db`
  SELECT COUNT(*)::int n FROM businesses WHERE status = 'verified'`;
console.log(`\n${eligible} verified business(es) may post jobs.`);
