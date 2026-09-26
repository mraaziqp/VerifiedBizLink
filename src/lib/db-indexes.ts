import db, { rawStatement } from '@/lib/db';

/**
 * Indexes for the queries the app runs on every page view.
 *
 * The indexes declared in src/db/schema.ts are never applied — the project
 * has no drizzle-kit step — so these are created here, from the SQL the
 * routes actually run. Each one is:
 *
 *   - CONCURRENTLY: builds without locking writes on a live table;
 *   - IF NOT EXISTS: safe to run on every deploy;
 *   - its own statement: one missing table can't stop the rest.
 *
 * Run by POST /api/setup/migrate (x-setup-secret header).
 */
const INDEXES: { name: string; why: string; sql: string }[] = [
  {
    name: 'idx_users_email_lower',
    why: 'login, signup and password reset all look users up by LOWER(email); the unique index on email cannot serve that',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower ON users (LOWER(email))',
  },
  {
    name: 'idx_businesses_user_id',
    why: '23 queries find "my business" by owner; the feed joins businesses on user_id for every post',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_businesses_user_id ON businesses (user_id)',
  },
  {
    name: 'idx_businesses_verified_trust',
    why: "explore, recommendations and jobs filter status = 'verified' and sort by trust score",
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_businesses_verified_trust ON businesses (status, trust_score DESC)',
  },
  {
    name: 'idx_posts_created_at',
    why: 'the home feed is ORDER BY created_at DESC LIMIT n; without this every page load sorts the whole table',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC)',
  },
  {
    name: 'idx_posts_user_created',
    why: "a member's own posts on their profile and analytics",
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_created ON posts (user_id, created_at DESC)',
  },
  {
    name: 'idx_notifications_user_created',
    why: 'the notification bell polls by user_id, newest first',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC)',
  },
  {
    name: 'idx_connections_receiver_status',
    why: 'pending invitations and the inbox look up connections by receiver_id (requester_id is covered by the unique pair)',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connections_receiver_status ON connections (receiver_id, status)',
  },
  {
    name: 'idx_job_postings_status_created',
    why: "public job board: status = 'open' ORDER BY created_at DESC",
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_postings_status_created ON job_postings (status, created_at DESC)',
  },
  {
    name: 'idx_job_postings_business_created',
    why: '"Manage job posts" lists a business\'s own postings',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_postings_business_created ON job_postings (business_id, created_at DESC)',
  },
  {
    name: 'idx_job_applications_job',
    why: 'applicant pipeline and applicant counts per job',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_applications_job ON job_applications (job_id)',
  },
  {
    name: 'idx_job_applications_applicant',
    why: '"already applied" badges and the CV access check',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_applications_applicant ON job_applications (applicant_user_id)',
  },
  {
    name: 'idx_ads_business',
    why: 'Ad Manager lists a business\'s ads',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ads_business ON ads (business_id)',
  },
  {
    name: 'idx_ads_serving',
    why: 'every page with an ad slot: active ads for a slot, boosted first, newest first',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ads_serving ON ads (slot_placement, is_boosted DESC, created_at DESC) WHERE is_active = true',
  },
];

/**
 * Two code paths each created the same pair of message indexes under
 * different names; every message insert maintains both. Keep one of each.
 * [redundant, keeper]
 */
const DUPLICATES: [string, string][] = [
  ['idx_messages_pair', 'messages_pair_idx'],
  ['idx_messages_receiver', 'messages_receiver_unread_idx'],
];

export interface IndexReport {
  created: string[];
  failed: { name: string; error: string }[];
  droppedDuplicates: string[];
}

export async function ensurePerformanceIndexes(): Promise<IndexReport> {
  const report: IndexReport = { created: [], failed: [], droppedDuplicates: [] };

  for (const idx of INDEXES) {
    try {
      // Neon's HTTP driver runs each call as its own implicit transaction,
      // which CONCURRENTLY requires (it cannot run inside BEGIN … COMMIT).
      await rawStatement(idx.sql);
      report.created.push(idx.name);
    } catch (err) {
      report.failed.push({ name: idx.name, error: err instanceof Error ? err.message : String(err) });
    }
  }

  try {
    const existing = new Set(
      (await db`SELECT indexname FROM pg_indexes WHERE tablename = 'messages'`).map((r) => String(r.indexname)),
    );
    for (const [redundant, keeper] of DUPLICATES) {
      if (existing.has(redundant) && existing.has(keeper)) {
        await rawStatement(`DROP INDEX CONCURRENTLY IF EXISTS ${redundant}`);
        report.droppedDuplicates.push(redundant);
      }
    }
  } catch (err) {
    report.failed.push({ name: 'messages duplicate cleanup', error: err instanceof Error ? err.message : String(err) });
  }

  return report;
}
