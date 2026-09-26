import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { CV_MAX_BYTES, CV_MIME, aiAvailable, detectCvKind, docxText, scanCv, type CvSuggestions } from '@/lib/cv-scan';
import { cvUrlFor, ensureTalentCvTable } from '@/lib/talent-cv-store';

export const maxDuration = 60;

/**
 * POST /api/talent/cv — upload a CV (PDF, Word, or a photo of a printed one),
 * attach it to the caller's profile, and scan it into suggested fields.
 *
 * The file is saved and attached BEFORE scanning, so a failed or unavailable
 * scan never costs the person their upload. Suggestions are returned, not
 * written: the person reviews them and saves the profile themselves.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Choose a CV file to upload.' }, { status: 400 });
    }
    if (file.size > CV_MAX_BYTES) {
      return NextResponse.json(
        { error: `That file is ${(file.size / (1024 * 1024)).toFixed(1)}MB. The limit is 4MB — try exporting a smaller PDF.` },
        { status: 413 },
      );
    }

    // Each upload is an AI call; cap them so one account cannot run up the bill.
    await ensureTalentCvTable();
    const [recent] = await db`
      SELECT COUNT(*)::int AS n FROM talent_cvs
      WHERE user_id = ${session.id} AND created_at > NOW() - INTERVAL '1 hour'
    `;
    if (Number(recent?.n ?? 0) >= 10) {
      return NextResponse.json(
        { error: 'You have uploaded 10 CVs in the last hour. Please wait a little before trying again.' },
        { status: 429 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const kind = detectCvKind(buf);
    if (!kind) {
      return NextResponse.json(
        { error: 'Upload a PDF, a Word document (.docx), or a photo (JPG/PNG) of your CV.' },
        { status: 415 },
      );
    }

    const fileName = String(file.name || `cv.${kind}`).replace(/[^\w.\- ()]+/g, '_').slice(0, 120);

    const [row] = await db`
      INSERT INTO talent_cvs (user_id, file_name, mime_type, size_bytes, data_base64)
      VALUES (${session.id}, ${fileName}, ${CV_MIME[kind]}, ${buf.length}, ${buf.toString('base64')})
      RETURNING id
    `;
    const cvUrl = cvUrlFor(String(row.id));

    // Word text is free to extract, so keep it for search/matching even when
    // the AI scan is unavailable.
    const text = kind === 'docx' ? docxText(buf).slice(0, 50_000) : null;

    await db`
      INSERT INTO talent_profiles (user_id, cv_url, cv_text, updated_at)
      VALUES (${session.id}, ${cvUrl}, ${text}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        cv_url = EXCLUDED.cv_url,
        cv_text = COALESCE(EXCLUDED.cv_text, talent_profiles.cv_text),
        updated_at = NOW()
    `;

    let suggestions: CvSuggestions | null = null;
    let scanError: string | null = null;
    if (aiAvailable()) {
      try {
        suggestions = await scanCv(kind, buf);
      } catch (error) {
        console.error('CV scan failed:', error);
        scanError = 'Your CV is saved, but we could not read it automatically. You can fill in the profile by hand.';
      }
    } else {
      scanError = 'Your CV is saved. Automatic scanning is not switched on yet, so please fill in the profile by hand.';
    }

    return NextResponse.json({
      ok: true,
      cvUrl,
      cvFileName: fileName,
      scanned: suggestions !== null,
      suggestions,
      message: scanError ?? 'CV uploaded and scanned. Review what we found below.',
    });
  } catch (error) {
    console.error('CV upload error:', error);
    return NextResponse.json({ error: 'Could not upload your CV. Please try again.' }, { status: 500 });
  }
}

/**
 * DELETE /api/talent/cv — detach the CV from the profile. The stored file is
 * kept only while an application still refers to it; employers who already
 * received it keep what they were sent.
 */
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await db`UPDATE talent_profiles SET cv_url = NULL, cv_text = NULL, updated_at = NOW() WHERE user_id = ${session.id}`;
    await db`
      DELETE FROM talent_cvs c
      WHERE c.user_id = ${session.id}
        AND NOT EXISTS (
          SELECT 1 FROM job_applications a WHERE a.snapshot_cv_url = '/api/talent/cv/' || c.id::text
        )
    `.catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('CV remove error:', error);
    return NextResponse.json({ error: 'Could not remove your CV' }, { status: 500 });
  }
}
