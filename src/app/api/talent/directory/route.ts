import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import { cleanPortfolioLinks } from '@/lib/talent';
import { avatarUrlFor, csv, likePattern, ownedBusiness } from '@/lib/jobs-server';
import { ensureTalentSchema } from '@/lib/talent-schema';
import db from '@/lib/db';

/**
 * GET /api/talent/directory — people who have listed their profile.
 *
 * Only verified businesses (and staff) may browse. A person lists their
 * profile on the understanding that the employers reading it have been
 * checked; opening the directory to any account would hand a list of
 * job seekers, with their towns and work histories, to anyone who signs up.
 *
 * Only profiles their owners chose to list appear here, and never a CV or
 * an email address: an employer makes contact by message, and the person
 * decides what to share from there.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await ensureTalentSchema();

    const business = await ownedBusiness(session.id);
    if (!isStaff(session) && !business?.verified) {
      return NextResponse.json(
        {
          error: 'Browsing talent is for verified businesses. People list their profiles here because the employers reading them have been checked.',
          needsVerification: true,
          hasBusiness: Boolean(business),
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '24', 10) || 24, 1), 60);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
    const search = String(searchParams.get('q') ?? '').trim().slice(0, 120);
    const location = String(searchParams.get('location') ?? '').trim().slice(0, 80);
    const skills = csv(searchParams.get('skills'), 10).map((s) => s.toLowerCase());
    const minYears = Math.max(parseInt(searchParams.get('minYears') || '0', 10) || 0, 0);
    const openOnly = searchParams.get('open') !== 'false';
    const pattern = likePattern(search);

    const rows = await db`
      SELECT t.user_id, t.headline, t.summary, t.location, t.skills, t.years_experience,
             t.open_to_work, t.portfolio_links, t.updated_at, (t.cv_url IS NOT NULL) AS has_cv,
             u.full_name, u.avatar_url
      FROM talent_profiles t
      JOIN users u ON u.id = t.user_id
      WHERE t.is_published = TRUE
        AND COALESCE(u.is_suspended, FALSE) = FALSE
        AND t.user_id <> ${session.id}
        AND (${openOnly}::boolean = FALSE OR t.open_to_work = TRUE)
        AND (${location}::text = '' OR t.location ILIKE ${likePattern(location)})
        AND (${minYears}::int = 0 OR COALESCE(t.years_experience, 0) >= ${minYears}::int)
        AND (
          cardinality(${skills}::text[]) = 0
          OR EXISTS (SELECT 1 FROM unnest(t.skills) s WHERE lower(s) = ANY(${skills}::text[]))
        )
        AND (
          ${search}::text = ''
          OR t.headline ILIKE ${pattern}
          OR t.summary ILIKE ${pattern}
          OR u.full_name ILIKE ${pattern}
          OR EXISTS (SELECT 1 FROM unnest(t.skills) s WHERE s ILIKE ${pattern})
        )
      ORDER BY t.open_to_work DESC, t.updated_at DESC
      LIMIT ${limit + 1} OFFSET ${offset}
    `;

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return NextResponse.json({
      profiles: page.map((p) => ({
        userId: p.user_id,
        name: p.full_name || 'Member',
        avatarUrl: avatarUrlFor(p.user_id, p.avatar_url),
        headline: p.headline ?? '',
        // A card shows a taste of the summary; the full text is on the profile.
        summary: String(p.summary ?? '').slice(0, 280),
        location: p.location ?? null,
        skills: (p.skills as string[]) ?? [],
        yearsExperience: p.years_experience ?? null,
        openToWork: p.open_to_work === true,
        portfolioLinks: cleanPortfolioLinks(p.portfolio_links),
        hasCv: p.has_cv === true,
        updatedAt: p.updated_at,
      })),
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
    });
  } catch (error) {
    console.error('Talent directory error:', error);
    return NextResponse.json({ error: 'Could not load the talent directory' }, { status: 500 });
  }
}
