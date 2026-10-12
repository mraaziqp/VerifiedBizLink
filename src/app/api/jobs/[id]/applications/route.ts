import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { avatarUrlFor, findJob, toJobJson } from '@/lib/jobs-server';
import { ensureMessagingSchema } from '@/lib/messaging';
import { ensureTalentCvTable } from '@/lib/talent-cv-store';
import db from '@/lib/db';

/** More than a board can usefully show; the client is told when it was cut. */
const MAX_APPLICANTS = 500;

/**
 * GET /api/jobs/<id>/applications — everyone who applied, for the employer.
 *
 * Restricted to the business that owns the listing. Applications contain
 * people's contact details and work history; any other business being able to
 * read them would be a straightforward data breach.
 *
 * This is what a card on the board needs and no more. A candidate's full
 * profile (work history, education, links) is fetched with their history when
 * the employer opens them — see GET /api/applications/<id> — rather than sent
 * for every applicant on every load.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const job = await findJob(id);
    if (!job || String(job.owner_user_id) !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // The unread count below reads columns the messaging hub adds on first
    // use, and the CV join needs its table even if nobody has uploaded one yet.
    await Promise.all([ensureMessagingSchema(), ensureTalentCvTable()]);

    const rows = await db`
      SELECT a.id, a.status, a.cover_note, a.match_score, a.created_at,
             a.snapshot_headline, a.snapshot_skills, a.snapshot_cv_url,
             a.status_note, a.status_changed_at, a.employer_notes,
             u.id AS user_id, u.full_name, u.email, u.avatar_url,
             t.location,
             c.file_name AS cv_file_name, c.mime_type AS cv_mime_type,
             (
               SELECT COUNT(*)::int FROM messages m
               WHERE m.sender_id = a.applicant_user_id AND m.receiver_id = ${session.id}
                 AND m.read = FALSE AND m.is_deleted = FALSE
             ) AS unread_messages
      FROM job_applications a
      JOIN users u ON u.id = a.applicant_user_id
      LEFT JOIN talent_profiles t ON t.user_id = a.applicant_user_id
      -- By primary key, from the id inside the stored address. Comparing the
      -- address as text would rebuild it for every CV on file, per applicant.
      LEFT JOIN talent_cvs c
        ON c.id = substring(a.snapshot_cv_url from '^/api/talent/cv/([0-9a-fA-F-]{36})$')::uuid
      WHERE a.job_id = ${job.id}
      ORDER BY a.match_score DESC NULLS LAST, a.created_at ASC
      LIMIT ${MAX_APPLICANTS + 1}
    `;

    const truncated = rows.length > MAX_APPLICANTS;
    const applications = (truncated ? rows.slice(0, MAX_APPLICANTS) : rows).map((a) => ({
      id: a.id,
      status: a.status,
      coverNote: a.cover_note,
      matchScore: a.match_score,
      createdAt: a.created_at,
      statusNote: a.status_note,
      statusChangedAt: a.status_changed_at,
      employerNotes: a.employer_notes ?? '',
      unreadMessages: Number(a.unread_messages ?? 0),
      // Deliberately the snapshot, not the live profile: this is what was sent.
      headline: a.snapshot_headline,
      skills: (a.snapshot_skills as string[]) ?? [],
      cvUrl: a.snapshot_cv_url,
      cvFileName: a.cv_file_name ?? null,
      // PDFs and photos can be shown inside the drawer; a Word file downloads.
      cvPreview: String(a.cv_mime_type ?? '') === 'application/pdf'
        ? 'pdf'
        : String(a.cv_mime_type ?? '').startsWith('image/') ? 'image' : null,
      applicant: {
        id: a.user_id,
        fullName: a.full_name,
        email: a.email,
        avatarUrl: avatarUrlFor(a.user_id, a.avatar_url),
        location: a.location,
      },
    }));

    return NextResponse.json({
      job: toJobJson(job, { forOwner: true }),
      applications,
      total: Number(job.application_count ?? applications.length),
      truncated,
    });
  } catch (error) {
    console.error('Applications list error:', error);
    return NextResponse.json({ error: 'Could not load applications' }, { status: 500 });
  }
}
