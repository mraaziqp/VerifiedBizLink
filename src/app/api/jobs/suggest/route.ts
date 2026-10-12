import { NextRequest, NextResponse } from 'next/server';
import { likePattern } from '@/lib/jobs-server';
import { ensureTalentSchema } from '@/lib/talent-schema';
import db from '@/lib/db';

/**
 * GET /api/jobs/suggest?q= — what the search box offers while someone types.
 *
 * Drawn only from roles that are live right now, so every suggestion leads
 * somewhere: offering a company with no open roles, or a skill no listing
 * asks for, would be a dead end dressed up as help.
 */
export async function GET(request: NextRequest) {
  try {
    const q = String(new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 60);
    if (q.length < 2) return NextResponse.json({ suggestions: [] });
    await ensureTalentSchema();

    const pattern = likePattern(q);
    const rows = await db`
      WITH live AS (
        SELECT j.title, j.location, j.required_skills, b.company_name
        FROM job_postings j
        JOIN businesses b ON b.id = j.business_id
        WHERE j.status = 'open' AND b.status = 'verified'
      )
      SELECT kind, value, COUNT(*)::int AS n FROM (
        SELECT 'title' AS kind, title AS value FROM live WHERE title ILIKE ${pattern}
        UNION ALL
        SELECT 'company', company_name FROM live WHERE company_name ILIKE ${pattern}
        UNION ALL
        SELECT 'skill', s FROM live, unnest(required_skills) s WHERE s ILIKE ${pattern}
        UNION ALL
        SELECT 'location', location FROM live WHERE location ILIKE ${pattern}
      ) hits
      WHERE value IS NOT NULL AND value <> ''
      GROUP BY kind, value
      ORDER BY n DESC, value ASC
      LIMIT 8
    `;

    return NextResponse.json({
      suggestions: rows.map((r) => ({ kind: String(r.kind), value: String(r.value), count: Number(r.n) })),
    });
  } catch (error) {
    console.error('Job suggestions error:', error);
    // Suggestions are a convenience; the search itself still works without them.
    return NextResponse.json({ suggestions: [] });
  }
}
