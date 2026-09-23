import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { cleanSkills } from '@/lib/talent';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/talent/profile — the signed-in person's professional profile.
 * PUT — create or update it.
 *
 * Open to any signed-in account, not just customers: a business owner looking
 * for work is an ordinary case, and gating this by role would tell them their
 * own CV is not allowed.
 *
 * Scoped to the session id throughout, so there is no way to edit somebody
 * else's profile by putting a different id in the body.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = (await db`
      SELECT id, headline, summary, location, skills, work_history, education,
             portfolio_links, cv_url, video_intro_url, is_published, open_to_work,
             created_at, updated_at
      FROM talent_profiles WHERE user_id = ${session.id} LIMIT 1
    `.catch(() => [])) as unknown as Row[];

    if (rows.length === 0) {
      // Not an error — most people have never opened this page. An empty
      // shell lets the form render without a special "no profile" branch.
      return NextResponse.json({
        exists: false,
        profile: {
          headline: '', summary: '', location: '', skills: [],
          workHistory: [], education: [], portfolioLinks: [],
          cvUrl: null, videoIntroUrl: null,
          isPublished: false, openToWork: true,
        },
      });
    }

    const p = rows[0];
    return NextResponse.json({
      exists: true,
      profile: {
        id: p.id,
        headline: p.headline ?? '',
        summary: p.summary ?? '',
        location: p.location ?? '',
        skills: (p.skills as string[]) ?? [],
        workHistory: p.work_history ?? [],
        education: p.education ?? [],
        portfolioLinks: p.portfolio_links ?? [],
        cvUrl: p.cv_url ?? null,
        videoIntroUrl: p.video_intro_url ?? null,
        isPublished: p.is_published === true,
        openToWork: p.open_to_work === true,
        updatedAt: p.updated_at,
      },
    });
  } catch (error) {
    console.error('Talent profile read error:', error);
    return NextResponse.json({ error: 'Could not load your profile' }, { status: 500 });
  }
}

/** Keeps a free-form list small enough that one profile cannot bloat a response. */
function boundedJson(value: unknown, maxItems: number): string {
  const list = Array.isArray(value) ? value.slice(0, maxItems) : [];
  return JSON.stringify(list);
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const headline = String(body.headline ?? '').trim().slice(0, 160);
    const summary = String(body.summary ?? '').trim().slice(0, 4000);
    const location = String(body.location ?? '').trim().slice(0, 120);
    const skills = cleanSkills(body.skills);

    // Publishing is what makes a profile visible to employers, so it needs
    // enough on it to be worth reading.
    const wantsPublished = body.isPublished === true;
    if (wantsPublished && (!headline || skills.length === 0)) {
      return NextResponse.json(
        { error: 'Add a headline and at least one skill before publishing your profile.' },
        { status: 400 },
      );
    }

    const rows = (await db`
      INSERT INTO talent_profiles (
        user_id, headline, summary, location, skills,
        work_history, education, portfolio_links,
        video_intro_url, is_published, open_to_work, updated_at
      ) VALUES (
        ${session.id}, ${headline || null}, ${summary || null}, ${location || null}, ${skills},
        ${boundedJson(body.workHistory, 30)}::jsonb,
        ${boundedJson(body.education, 20)}::jsonb,
        ${boundedJson(body.portfolioLinks, 20)}::jsonb,
        ${String(body.videoIntroUrl ?? '').trim() || null},
        ${wantsPublished}, ${body.openToWork !== false}, NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        headline = EXCLUDED.headline,
        summary = EXCLUDED.summary,
        location = EXCLUDED.location,
        skills = EXCLUDED.skills,
        work_history = EXCLUDED.work_history,
        education = EXCLUDED.education,
        portfolio_links = EXCLUDED.portfolio_links,
        video_intro_url = EXCLUDED.video_intro_url,
        is_published = EXCLUDED.is_published,
        open_to_work = EXCLUDED.open_to_work,
        updated_at = NOW()
      RETURNING id, is_published
    `) as unknown as Row[];

    return NextResponse.json({
      ok: true,
      id: rows[0]?.id,
      isPublished: rows[0]?.is_published === true,
      message: rows[0]?.is_published
        ? 'Your profile is saved and visible to verified employers.'
        : 'Your profile is saved. It stays private until you publish it.',
    });
  } catch (error) {
    console.error('Talent profile save error:', error);
    return NextResponse.json({ error: 'Could not save your profile' }, { status: 500 });
  }
}
