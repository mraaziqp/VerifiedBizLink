import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// POST /api/messages/send  { receiver_id, content }
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { receiver_id, content } = await request.json();

    if (!receiver_id || !content || !content.trim()) {
      return NextResponse.json({ error: 'receiver_id and content are required' }, { status: 400 });
    }
    if (receiver_id === session.id) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
    }

    const receiver = await db`SELECT id, email, full_name FROM users WHERE id = ${receiver_id} LIMIT 1`;
    if (receiver.length === 0) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    const [saved] = await db`
      INSERT INTO messages (sender_id, receiver_id, content)
      VALUES (${session.id}, ${receiver_id}, ${content.trim()})
      RETURNING id, sender_id, receiver_id, content, read, created_at
    `;

    // Fire-and-forget email notification (never blocks the message send)
    if (process.env.RESEND_API_KEY && receiver[0].email) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'info@verifiedbizlink.co.za',
          to: receiver[0].email,
          subject: `New message from ${session.fullName || 'a VerifiedBizLink member'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background:#0f172a;padding:20px;border-radius:8px 8px 0 0;">
                <h2 style="color:#fbbf24;margin:0;">New Message</h2>
              </div>
              <div style="background:#1e293b;padding:20px;border-radius:0 0 8px 8px;border:1px solid #334155;">
                <p style="color:#e2e8f0;"><strong style="color:#fbbf24;">From:</strong> ${session.fullName || session.email}</p>
                <div style="background:#0f172a;padding:15px;border-radius:6px;border-left:3px solid #fbbf24;">
                  <p style="color:#e2e8f0;margin:0;line-height:1.6;">${content.trim().replace(/</g, '&lt;')}</p>
                </div>
                <p style="margin-top:16px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/messages" style="background:#fbbf24;color:#0f172a;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Reply Now</a>
                </p>
              </div>
            </div>`,
        }),
      }).catch((e) => console.error('Message email failed:', e));
    }

    return NextResponse.json({ success: true, message: saved }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
