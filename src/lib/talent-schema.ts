import db from '@/lib/db';

/**
 * The Jobs & Talent tables, brought up to date on first use.
 *
 * scripts/migrate-talent.mjs holds the same statements for anyone running
 * migrations by hand, but nothing in the deploy pipeline runs scripts — a
 * release that needed one would ship code reading columns that are not there
 * yet, and every query here would quietly return nothing. So the routes call
 * this first, the same way messaging and CV storage already look after their
 * own tables.
 *
 * Steady state is one cheap read per server instance: the DDL only runs when
 * that read says something is missing, so a warm deployment never takes a
 * table lock just to be told a column already exists.
 *
 * Everything is additive. The stored values 'open' (a published job) and
 * 'hired' / 'interview' (application stages) are unchanged; 'draft' and
 * 'reviewing' are new values in existing TEXT columns and need no migration.
 *
 * When adding to the DO block, add the new object to the check above it.
 */

let ready: Promise<void> | null = null;

export function ensureTalentSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const [state] = await db`
        SELECT (
          to_regclass('job_application_events') IS NOT NULL
          AND to_regclass('saved_jobs') IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'job_postings' AND column_name = 'published_at'
          )
          AND EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'job_applications' AND column_name = 'employer_notes'
          )
          AND EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'talent_profiles' AND column_name = 'years_experience'
          )
        ) AS up_to_date
      `;
      if (state?.up_to_date === true) return;

      // One statement, so one round trip and one transaction: either the whole
      // upgrade lands or none of it does.
      await db`
        DO $$
        BEGIN
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
            is_published    BOOLEAN NOT NULL DEFAULT FALSE,
            open_to_work    BOOLEAN NOT NULL DEFAULT TRUE,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          ALTER TABLE talent_profiles ADD COLUMN IF NOT EXISTS years_experience INTEGER;
          CREATE INDEX IF NOT EXISTS talent_profiles_skills_idx ON talent_profiles USING GIN (skills);
          CREATE INDEX IF NOT EXISTS talent_profiles_published_idx ON talent_profiles (is_published, open_to_work);

          CREATE TABLE IF NOT EXISTS job_postings (
            id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id          UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            created_by           UUID REFERENCES users(id) ON DELETE SET NULL,
            title                TEXT NOT NULL,
            description          TEXT NOT NULL,
            required_skills      TEXT[] NOT NULL DEFAULT '{}',
            employment_type      TEXT NOT NULL DEFAULT 'full_time',
            location_type        TEXT NOT NULL DEFAULT 'on_site',
            location             TEXT,
            salary_min_cents     BIGINT,
            salary_max_cents     BIGINT,
            salary_period        TEXT DEFAULT 'month',
            salary_visible       BOOLEAN NOT NULL DEFAULT TRUE,
            application_deadline DATE,
            status               TEXT NOT NULL DEFAULT 'open',
            views_count          INTEGER NOT NULL DEFAULT 0,
            created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            closed_at            TIMESTAMPTZ
          );
          ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS slug TEXT;
          ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS requirements TEXT;
          ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS benefits TEXT;
          ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'ZAR';
          ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

          -- Roles posted before slugs existed get one now, so their share
          -- links are as readable as a new role's. md5(id) keeps it unique
          -- without a sequence and gives the same answer if this ever re-runs.
          UPDATE job_postings
          SET slug = COALESCE(
                NULLIF(trim(both '-' from left(regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'), 60)), ''),
                'role'
              ) || '-' || substr(md5(id::text), 1, 6)
          WHERE slug IS NULL;
          UPDATE job_postings SET published_at = created_at
          WHERE published_at IS NULL AND status <> 'draft';

          -- Belt and braces before the unique index: if two generated slugs
          -- ever came out the same, the later row takes more of its own hash.
          -- Without this, one collision would fail the whole upgrade.
          UPDATE job_postings j
          SET slug = j.slug || '-' || substr(md5(j.id::text), 7, 6)
          WHERE EXISTS (SELECT 1 FROM job_postings o WHERE o.slug = j.slug AND o.id < j.id);

          CREATE UNIQUE INDEX IF NOT EXISTS job_postings_slug_idx ON job_postings (slug);
          CREATE INDEX IF NOT EXISTS job_postings_business_idx ON job_postings (business_id);
          CREATE INDEX IF NOT EXISTS job_postings_open_idx ON job_postings (status, created_at DESC);
          CREATE INDEX IF NOT EXISTS job_postings_skills_idx ON job_postings USING GIN (required_skills);

          CREATE TABLE IF NOT EXISTS job_applications (
            id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            job_id            UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
            applicant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            cover_note        TEXT,
            snapshot_headline TEXT,
            snapshot_skills   TEXT[] NOT NULL DEFAULT '{}',
            snapshot_cv_url   TEXT,
            status            TEXT NOT NULL DEFAULT 'applied',
            status_note       TEXT,
            status_changed_at TIMESTAMPTZ,
            status_changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
            match_score       INTEGER,
            created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          -- The employer's own notes on a candidate. Never returned to the
          -- candidate: status_note is what they are told, this is what the
          -- employer thinks.
          ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS employer_notes TEXT;
          CREATE UNIQUE INDEX IF NOT EXISTS job_applications_once_idx ON job_applications (job_id, applicant_user_id);
          CREATE INDEX IF NOT EXISTS job_applications_job_status_idx ON job_applications (job_id, status);
          CREATE INDEX IF NOT EXISTS job_applications_applicant_idx ON job_applications (applicant_user_id, created_at DESC);

          CREATE TABLE IF NOT EXISTS saved_jobs (
            user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            job_id     UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (user_id, job_id)
          );
          CREATE INDEX IF NOT EXISTS saved_jobs_job_idx ON saved_jobs (job_id);

          -- What happened to an application, in order: applied, each stage
          -- change, and the chat message that told the candidate about it.
          -- message_id is the link between an application and the direct
          -- conversation it lives in — conversations are a pair of people,
          -- so the thread itself needs no second copy here.
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
          );
          CREATE INDEX IF NOT EXISTS job_application_events_app_idx
            ON job_application_events (application_id, created_at);
        END
        $$
      `;
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}
