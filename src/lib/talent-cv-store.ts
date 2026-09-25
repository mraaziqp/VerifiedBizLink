import db from '@/lib/db';

/**
 * Uploaded CVs.
 *
 * Kept in their own table and served through /api/talent/cv/<id>, behind a
 * permission check, rather than as a public bucket URL or a data: URL. A CV
 * carries a phone number, a home address and often an ID number; it should
 * be readable by the person, staff, and employers they applied to — nobody
 * who merely guesses a link. (Browsers also refuse to open data: URLs in a
 * new tab, which is how employers open an applicant's CV.)
 *
 * Rows are never updated in place. Uploading a new CV adds a row, so an
 * application already sent keeps pointing at the CV the employer received.
 */

let ready: Promise<void> | null = null;

export function ensureTalentCvTable(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await db`
        CREATE TABLE IF NOT EXISTS talent_cvs (
          id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          file_name   TEXT NOT NULL,
          mime_type   TEXT NOT NULL,
          size_bytes  INTEGER NOT NULL,
          data_base64 TEXT NOT NULL,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS talent_cvs_user_idx ON talent_cvs (user_id, created_at DESC)`;
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

export const cvUrlFor = (id: string) => `/api/talent/cv/${id}`;

const CV_URL = /^\/api\/talent\/cv\/([0-9a-f-]{36})$/i;

/** The CV id inside a stored cv_url, or null for anything else (e.g. an old external link). */
export function cvIdFromUrl(url: unknown): string | null {
  const m = String(url ?? '').match(CV_URL);
  return m ? m[1].toLowerCase() : null;
}
