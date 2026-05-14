import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// GET /api/users/preferences
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db`
    SELECT * FROM user_preferences WHERE user_id = ${session.id} LIMIT 1
  `;
  return NextResponse.json({ preferences: rows[0] || null });
}

// POST /api/users/preferences — upsert preferences
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { industries, services, interests, location, province } = await request.json();

  const rows = await db`
    INSERT INTO user_preferences (user_id, industries, services, interests, location, province, onboarding_completed, updated_at)
    VALUES (
      ${session.id},
      ${JSON.stringify(industries || [])},
      ${JSON.stringify(services || [])},
      ${JSON.stringify(interests || [])},
      ${location || ''},
      ${province || ''},
      TRUE,
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      industries = EXCLUDED.industries,
      services = EXCLUDED.services,
      interests = EXCLUDED.interests,
      location = EXCLUDED.location,
      province = EXCLUDED.province,
      onboarding_completed = TRUE,
      updated_at = NOW()
    RETURNING *
  `;

  // Mark user onboarding complete
  await db`UPDATE users SET onboarding_completed = TRUE WHERE id = ${session.id}`;

  return NextResponse.json({ preferences: rows[0] });
}
