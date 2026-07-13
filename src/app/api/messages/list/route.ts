import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/messages/list                 — list the current user's conversations
// GET /api/messages/list?with=<userId>   — full message thread with one user
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const withUser = request.nextUrl.searchParams.get('with');

  try {
    // ── Thread view ────────────────────────────────────────────────
    if (withUser) {
      const messages = await db`
        SELECT id, sender_id, receiver_id, content, image_url, read, created_at
        FROM messages
        WHERE (sender_id = ${session.id} AND receiver_id = ${withUser})
           OR (sender_id = ${withUser} AND receiver_id = ${session.id})
        ORDER BY created_at ASC
        LIMIT 200
      `;
      // Mark messages from the other user as read
      await db`
        UPDATE messages SET read = TRUE
        WHERE receiver_id = ${session.id} AND sender_id = ${withUser} AND read = FALSE
      `;
      return NextResponse.json(
        { success: true, messages },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      );
    }

    // ── Conversation list (latest message per counterpart) ─────────
    const conversations = await db`
      SELECT
        other.id          AS participant_id,
        other.full_name   AS participant_name,
        other.email       AS participant_email,
        other.role        AS participant_type,
        other.avatar_url  AS participant_avatar,
        CASE WHEN latest.content = '' AND latest.image_url IS NOT NULL THEN '📷 Photo' ELSE latest.content END AS last_message,
        latest.created_at AS last_message_time,
        (SELECT COUNT(*) FROM messages m
          WHERE m.sender_id = other.id AND m.receiver_id = ${session.id} AND m.read = FALSE
        )::int             AS unread_count
      FROM (
        SELECT DISTINCT ON (other_id) other_id, content, image_url, created_at
        FROM (
          SELECT
            CASE WHEN sender_id = ${session.id} THEN receiver_id ELSE sender_id END AS other_id,
            content, image_url, created_at
          FROM messages
          WHERE sender_id = ${session.id} OR receiver_id = ${session.id}
        ) paired
        ORDER BY other_id, created_at DESC
      ) latest
      JOIN users other ON other.id = latest.other_id
      ORDER BY latest.created_at DESC
    `;

    return NextResponse.json(
      { success: true, conversations, total: conversations.length },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
