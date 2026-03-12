import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

// POST /api/support/tickets — submit a support ticket
export async function POST(req: NextRequest) {
  const session = await getSession();
  const { name, email, category, subject, message } = await req.json();

  if (!name || !email || !category || !subject || !message) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message too long.' }, { status: 400 });
  }

  try {
    await db`
      INSERT INTO support_tickets (user_id, name, email, category, subject, message, status, created_at)
      VALUES (
        ${session?.id || null},
        ${name},
        ${email},
        ${category},
        ${subject},
        ${message},
        'open',
        NOW()
      )
    `;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Support ticket error:', err);
    return NextResponse.json({ error: 'Could not submit ticket. Please try again.' }, { status: 500 });
  }
}
