import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import { cleanPortfolioLinks, isUuid } from '@/lib/talent';
import { avatarUrlFor, ownedBusiness } from '@/lib/jobs-server';
import { ensureTalentSchema } from '@/lib/talent-schema';
import db from '@/lib/db';

/**
 * GET /api/talent/profiles/<userId> — one person's professional profile.
 *
 * Readable by its owner, by staff, by a verified business if the owner has
 * listed it, and by an employer the person has applied to. Everyone else gets
 * a 404, not a 403, so the endpoint does not confirm who has a profile.
 *
 * The CV itself is not linked from here unless the viewer already has a
 * right to it (their own, or one sent with an application): it carries a
 * phone number and a home address, which listing a profile does not offer up.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isUuid(id)) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    await ensureTalentSchema();

    const [p] = await db`
      SELECT t.*, u.full_name, u.avatar_url, u.is_suspended
      FROM talent_profiles t
      JOIN users u ON u.id = t.user_id
      WHERE t.user_id = ${id} LIMIT 1
    `;
    if (!p) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const isOwner = session.id === id;
    const [application] = isOwner ? [] : await db`
      SELECT a.snapshot_cv_url
      FROM job_applications a
      JOIN job_postings j ON j.id = a.job_id
      JOIN businesses b ON b.id = j.business_id
      WHERE a.applicant_user_id = ${id} AND b.user_id = ${session.id}
      ORDER BY a.created_at DESC
      LIMIT 1
    `;
    const receivedApplication = Boolean(application);

    let allowed = isOwner || isStaff(session) || receivedApplication;
    if (!allowed && p.is_published === true && !p.is_suspended) {
      allowed = (await ownedBusiness(session.id))?.verified === true;
    }
    if (!allowed) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    return NextResponse.json({
      profile: {
        userId: p.user_id,
        name: p.full_name || 'Member',
        avatarUrl: avatarUrlFor(p.user_id, p.avatar_url),
        headline: p.headline ?? '',
        summary: p.summary ?? '',
        location: p.location ?? null,
        skills: (p.skills as string[]) ?? [],
        yearsExperience: p.years_experience ?? null,
        openToWork: p.open_to_work === true,
        isPublished: p.is_published === true,
        portfolioLinks: cleanPortfolioLinks(p.portfolio_links),
        workHistory: Array.isArray(p.work_history) ? p.work_history.slice(0, 30) : [],
        education: Array.isArray(p.education) ? p.education.slice(0, 20) : [],
        hasCv: Boolean(p.cv_url),
        cvUrl: isOwner || isStaff(session)
          ? (p.cv_url ?? null)
          : receivedApplication ? (application.snapshot_cv_url ?? null) : null,
        updatedAt: p.updated_at,
      },
      isOwner,
    });
  } catch (error) {
    console.error('Talent profile view error:', error);
    return NextResponse.json({ error: 'Could not load this profile' }, { status: 500 });
  }
}
