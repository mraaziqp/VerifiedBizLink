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

/* ---------------------------------------------- jobs & talent portal upgrade */

// The same statements src/lib/talent-schema.ts runs on first use in the
// deployed app, kept here so the upgrade can also be applied by hand. If one
// changes, change the other.
//
// No stored value is renamed: 'open' is still a published job, and 'draft'
// (jobs) and 'reviewing' (applications) are simply new values in TEXT columns.

await db`ALTER TABLE talent_profiles ADD COLUMN IF NOT EXISTS years_experience INTEGER`;

await db`ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS slug TEXT`;
await db`ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS requirements TEXT`;
await db`ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS benefits TEXT`;
await db`ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'ZAR'`;
await db`ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ`;

// Roles posted before slugs existed get one, so their share links read as
// well as a new role's. md5(id) keeps it unique and repeatable.
await db`
  UPDATE job_postings
  SET slug = COALESCE(
        NULLIF(trim(both '-' from left(regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'), 60)), ''),
        'role'
      ) || '-' || substr(md5(id::text), 1, 6)
  WHERE slug IS NULL
`;
await db`UPDATE job_postings SET published_at = created_at WHERE published_at IS NULL AND status <> 'draft'`;
// If two generated slugs ever came out the same, the later row takes more of
// its own hash, so the unique index below cannot fail on a collision.
await db`
  UPDATE job_postings j
  SET slug = j.slug || '-' || substr(md5(j.id::text), 7, 6)
  WHERE EXISTS (SELECT 1 FROM job_postings o WHERE o.slug = j.slug AND o.id < j.id)
`;
await db`CREATE UNIQUE INDEX IF NOT EXISTS job_postings_slug_idx ON job_postings (slug)`;

// The employer's private notes on a candidate. status_note is what the
// candidate is told; this never leaves the employer's side.
await db`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS employer_notes TEXT`;

await db`
  CREATE TABLE IF NOT EXISTS saved_jobs (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id     UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, job_id)
  )
`;
await db`CREATE INDEX IF NOT EXISTS saved_jobs_job_idx ON saved_jobs (job_id)`;

// An application's history. message_id is the link to the direct
// conversation between employer and candidate: threads are a pair of people,
// so this records which message carried each update rather than copying it.
await db`
  CREATE TABLE IF NOT EXISTS job_application_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    actor_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    kind           TEXT NOT NULL,
    from_status    TEXT,
    to_status      TEXT,
    detail         TEXT,
    message_id     UUID,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
await db`
  CREATE INDEX IF NOT EXISTS job_application_events_app_idx
  ON job_application_events (application_id, created_at)
`;
console.log('portal upgrade applied');

/* ------------------------------------------------------------------ report */

for (const t of ['talent_profiles', 'job_postings', 'job_applications', 'saved_jobs', 'job_application_events']) {
  const [r] = await db.query(`SELECT COUNT(*)::int n FROM "${t}"`);
  console.log(`  ${t}: ${r.n} row(s)`);
}

const [{ n: eligible }] = await db`
  SELECT COUNT(*)::int n FROM businesses WHERE status = 'verified'`;
console.log(`\n${eligible} verified business(es) may post jobs.`);
