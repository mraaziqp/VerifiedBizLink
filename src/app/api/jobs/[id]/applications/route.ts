import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { APPLICATION_STATUSES } from '@/lib/talent';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/jobs/<id>/applications — everyone who applied, for the employer.
 *
 * Restricted to the business that owns the listing. Applications contain
 * people's contact details and work history; any other business being able to
 * read them would be a straightforward data breach.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const owned = (await db`
      SELECT j.id, j.title, j.required_skills
      FROM job_postings j
      JOIN businesses b ON b.id = j.business_id
      WHERE j.id = ${id} AND b.user_id = ${session.id}
      LIMIT 1
    `.catch(() => [])) as unknown as Row[];

    if (owned.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = (await db`
      SELECT a.id, a.status, a.cover_note, a.match_score, a.created_at,
             a.snapshot_headline, a.snapshot_skills, a.snapshot_cv_url,
             a.status_note, a.status_changed_at,
             u.id AS user_id, u.full_name, u.email, u.avatar_url,
             t.location, t.video_intro_url, t.summary
      FROM job_applications a
      JOIN users u ON u.id = a.applicant_user_id
      LEFT JOIN talent_profiles t ON t.user_id = a.applicant_user_id
      WHERE a.job_id = ${id}
      ORDER BY a.match_score DESC NULLS LAST, a.created_at ASC
    `.catch(() => [])) as unknown as Row[];

    const applications = rows.map((a) => ({
      id: a.id,
      status: a.status,
      coverNote: a.cover_note,
      matchScore: a.match_score,
      createdAt: a.created_at,
      statusNote: a.status_note,
      statusChangedAt: a.status_changed_at,
      // Deliberately the snapshot, not the live profile: this is what was sent.
      headline: a.snapshot_headline,
      skills: (a.snapshot_skills as string[]) ?? [],
      cvUrl: a.snapshot_cv_url,
      applicant: {
        id: a.user_id,
        fullName: a.full_name,
        email: a.email,
        // Base64 avatars are served by URL, never inlined — a list of
        // applicants each carrying an image would repeat the feed's 6 MB bug.
        avatarUrl: String(a.avatar_url ?? '').startsWith('data:')
          ? `/api/users/${a.user_id}/avatar`
          : (a.avatar_url ?? null),
        location: a.location,
        summary: a.summary,
        videoIntroUrl: a.video_intro_url,
      },
    }));

    // Pre-grouped for the pipeline board, so the client does not decide which
    // statuses exist or what order they belong in.
    const byStatus: Record<string, typeof applications> = {};
    for (const s of APPLICATION_STATUSES) byStatus[s] = [];
    for (const a of applications) {
      (byStatus[String(a.status)] ??= []).push(a);
    }

    return NextResponse.json({
      job: { id: owned[0].id, title: owned[0].title, requiredSkills: owned[0].required_skills ?? [] },
      applications,
      byStatus,
      total: applications.length,
    });
  } catch (error) {
    console.error('Applications list error:', error);
    return NextResponse.json({ error: 'Could not load applications' }, { status: 500 });
  }
}
