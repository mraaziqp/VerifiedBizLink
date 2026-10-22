import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ensureTalentSchema } from '@/lib/talent-schema';
import { ensureTalentCvTable } from '@/lib/talent-cv-store';
import { ensureMessagingSchema } from '@/lib/messaging';
import db from '@/lib/db';

/**
 * GET /api/admin/hiring
 * Returns all jobs posted by the official VerifiedBizLink account / admin team,
 * along with all applicants, their CVs, contact details, status and match scores.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['admin', 'banker', 'lawyer'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized. Staff only.' }, { status: 401 });
    }

    await Promise.all([ensureTalentSchema(), ensureTalentCvTable(), ensureMessagingSchema()]);

    const { searchParams } = new URL(request.url);
    const selectedJobId = searchParams.get('jobId');

    // 1. Fetch all company jobs (specifically VerifiedBizLink or all admin jobs)
    const companyJobs = await db`
      SELECT j.id, j.title, j.slug, j.status, j.location, j.employment_type,
             j.required_skills, j.views_count, j.created_at,
             b.company_name, b.id AS business_id,
             (SELECT COUNT(*)::int FROM job_applications a WHERE a.job_id = j.id) AS applicant_count
      FROM job_postings j
      JOIN businesses b ON b.id = j.business_id
      WHERE b.company_name ILIKE '%verifiedbizlink%'
         OR b.user_id = ${session.id}
         OR j.title ILIKE '%marketer%'
      ORDER BY j.created_at DESC
    `;

    // If no specific company jobs found with those keywords, fallback to all active jobs
    let activeJobs = companyJobs;
    if (activeJobs.length === 0) {
      activeJobs = await db`
        SELECT j.id, j.title, j.slug, j.status, j.location, j.employment_type,
               j.required_skills, j.views_count, j.created_at,
               b.company_name, b.id AS business_id,
               (SELECT COUNT(*)::int FROM job_applications a WHERE a.job_id = j.id) AS applicant_count
        FROM job_postings j
        JOIN businesses b ON b.id = j.business_id
        ORDER BY j.created_at DESC
        LIMIT 20
      `;
    }

    const targetJobId = selectedJobId || (activeJobs[0]?.id ? String(activeJobs[0].id) : null);

    // 2. Fetch applicants for the selected job (or all company jobs if none selected)
    let applications: Record<string, unknown>[] = [];
    if (targetJobId) {
      const rows = await db`
        SELECT a.id, a.job_id, a.status, a.cover_note, a.match_score, a.created_at,
               a.snapshot_headline, a.snapshot_skills, a.snapshot_cv_url,
               a.status_note, a.status_changed_at, a.employer_notes,
               u.id AS user_id, u.full_name, u.email, u.avatar_url,
               t.location, t.phone,
               c.file_name AS cv_file_name, c.mime_type AS cv_mime_type,
               j.title AS job_title
        FROM job_applications a
        JOIN users u ON u.id = a.applicant_user_id
        JOIN job_postings j ON j.id = a.job_id
        LEFT JOIN talent_profiles t ON t.user_id = a.applicant_user_id
        LEFT JOIN talent_cvs c
          ON c.id = substring(a.snapshot_cv_url from '^/api/talent/cv/([0-9a-fA-F-]{36})$')::uuid
        WHERE a.job_id = ${targetJobId}::uuid
        ORDER BY a.created_at DESC
      `;

      applications = rows.map((r) => ({
        id: r.id,
        jobId: r.job_id,
        jobTitle: r.job_title,
        status: r.status,
        coverNote: r.cover_note,
        matchScore: r.match_score,
        createdAt: r.created_at,
        headline: r.snapshot_headline,
        skills: (r.snapshot_skills as string[]) ?? [],
        cvUrl: r.snapshot_cv_url,
        cvFileName: r.cv_file_name ?? null,
        cvMimeType: r.cv_mime_type ?? null,
        applicant: {
          id: r.user_id,
          fullName: r.full_name,
          email: r.email,
          avatarUrl: r.avatar_url,
          location: r.location,
          phone: r.phone,
        },
      }));
    }

    return NextResponse.json({
      jobs: activeJobs.map((j) => ({
        id: j.id,
        title: j.title,
        companyName: j.company_name,
        businessId: j.business_id,
        location: j.location,
        status: j.status,
        applicantCount: Number(j.applicant_count ?? 0),
        createdAt: j.created_at,
      })),
      selectedJobId: targetJobId,
      applications,
    });
  } catch (error) {
    console.error('Admin hiring error:', error);
    return NextResponse.json({ error: 'Failed to fetch applicants' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/hiring
 * Update an applicant's status (e.g. shortlisted, hired, rejected)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['admin', 'banker', 'lawyer'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized. Staff only.' }, { status: 401 });
    }

    const { applicationId, status, note } = await request.json();
    if (!applicationId || !status) {
      return NextResponse.json({ error: 'Missing applicationId or status' }, { status: 400 });
    }

    await db`
      UPDATE job_applications
      SET status = ${status},
          status_note = ${note || null},
          status_changed_at = NOW()
      WHERE id = ${applicationId}::uuid
    `;

    return NextResponse.json({ success: true, message: `Applicant status updated to ${status}` });
  } catch (error) {
    console.error('Update applicant status error:', error);
    return NextResponse.json({ error: 'Failed to update applicant' }, { status: 500 });
  }
}
