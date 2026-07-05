import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { businessId, action, reviewNotes } = await request.json();

    if (!businessId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (action === 'approve') {
      await db`
        UPDATE businesses
        SET status = 'verified',
            verified_at = NOW(),
            reviewed_by = ${session.id},
            review_notes = ${reviewNotes || ''},
            trust_score = 95,
            updated_at = NOW()
        WHERE id = ${businessId}
      `;

      // Update owner's vetting score
      const business = await db`SELECT user_id FROM businesses WHERE id = ${businessId} LIMIT 1`;
      if (business[0]) {
        await db`UPDATE users SET vetting_score = 95 WHERE id = ${business[0].user_id}`;
      }

      // Create notification
      await db`
        INSERT INTO notifications (user_id, type, title, content)
        VALUES (${business[0]?.user_id}, 'success', 'Business verified', 'Your business has been verified!')
      `.catch(() => {}); // non-fatal
    } else if (action === 'reject') {
      await db`
        UPDATE businesses
        SET status = 'rejected',
            reviewed_by = ${session.id},
            review_notes = ${reviewNotes || 'Rejected by admin'},
            updated_at = NOW()
        WHERE id = ${businessId}
      `;

      const business = await db`SELECT user_id FROM businesses WHERE id = ${businessId} LIMIT 1`;
      if (business[0]) {
        await db`
          INSERT INTO notifications (user_id, type, title, content)
          VALUES (${business[0]?.user_id}, 'error', 'Verification rejected', 'Your business verification was rejected. Please review the feedback and resubmit.')
        `.catch(() => {}); // non-fatal
      }
    }

    // Log to audit trail
    await db`
      INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, metadata)
      VALUES (
        ${session.id},
        ${session.fullName},
        ${`${action === 'approve' ? 'Approved' : 'Rejected'} Business Verification`},
        'business',
        ${businessId},
        ${{ notes: reviewNotes }}::jsonb
      )
    `;

    return NextResponse.json({
      success: true,
      message: `Business ${action}${action === 'approve' ? 'ed' : 'ed'} successfully`,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Vetting approval error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to process approval', detail: errorMsg },
      { status: 500 }
    );
  }
}
