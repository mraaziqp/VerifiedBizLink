import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/talent/applications — everything the signed-in person applied to.
 *
 * Includes roles that have since been closed or paused. Someone needs to see
 * what they applied for last month even if the listing came down; hiding it
 * would read as the application having been lost.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = (await db`
      SELECT a.id, a.status, a.match_score, a.created_at, a.status_note,
             a.status_changed_at, a.cover_note,
             j.id AS job_id, j.title, j.location, j.location_type,
             j.employment_type, j.status AS job_status,
             b.company_name, b.logo_url, b.status AS business_status
      FROM job_applications a
      JOIN job_postings j ON j.id = a.job_id
      JOIN businesses b ON b.id = j.business_id
      WHERE a.applicant_user_id = ${session.id}
      ORDER BY a.created_at DESC
    `.catch(() => [])) as unknown as Row[];

    return NextResponse.json({
      applications: rows.map((a) => ({
        id: a.id,
        status: a.status,
        matchScore: a.match_score,
        createdAt: a.created_at,
        statusNote: a.status_note,
        statusChangedAt: a.status_changed_at,
        coverNote: a.cover_note,
        job: {
          id: a.job_id,
          title: a.title,
          location: a.location,
          locationType: a.location_type,
          employmentType: a.employment_type,
          status: a.job_status,
        },
        company: {
          name: a.company_name,
          logoUrl: a.logo_url,
          verified: a.business_status === 'verified',
        },
      })),
      total: rows.length,
    });
  } catch (error) {
    console.error('My applications error:', error);
    return NextResponse.json({ error: 'Could not load your applications' }, { status: 500 });
  }
}
