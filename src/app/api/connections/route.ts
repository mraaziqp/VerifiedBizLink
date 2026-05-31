import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const rawStatusFilter = url.searchParams.get('status');
    const validStatuses = ['accepted', 'pending', 'declined'];
    const statusFilter = rawStatusFilter && validStatuses.includes(rawStatusFilter) ? rawStatusFilter : null;

    const connections = await db`
      SELECT 
        c.id, c.status, c.created_at,
        CASE 
          WHEN c.requester_id = ${session.id} THEN c.receiver_id 
          ELSE c.requester_id 
        END AS connected_user_id,
        CASE 
          WHEN c.requester_id = ${session.id} THEN u2.full_name 
          ELSE u1.full_name 
        END AS full_name,
        CASE 
          WHEN c.requester_id = ${session.id} THEN u2.headline 
          ELSE u1.headline 
        END AS headline,
        CASE 
          WHEN c.requester_id = ${session.id} THEN u2.avatar_url 
          ELSE u1.avatar_url 
        END AS avatar_url,
        CASE 
          WHEN c.requester_id = ${session.id} THEN b2.company_name 
          ELSE b1.company_name 
        END AS company_name,
        CASE 
          WHEN c.requester_id = ${session.id} THEN b2.status 
          ELSE b1.status 
        END AS business_status,
        CASE WHEN c.requester_id = ${session.id} THEN true ELSE false END AS is_requester
      FROM connections c
      JOIN users u1 ON c.requester_id = u1.id
      JOIN users u2 ON c.receiver_id = u2.id
      LEFT JOIN businesses b1 ON b1.user_id = c.requester_id
      LEFT JOIN businesses b2 ON b2.user_id = c.receiver_id
      WHERE (c.requester_id = ${session.id} OR c.receiver_id = ${session.id})
        ${statusFilter ? db`AND c.status = ${statusFilter}` : db`AND c.status IN ('accepted', 'pending')`}
      ORDER BY c.created_at DESC
    `;

    return NextResponse.json({ connections });
  } catch (error) {
    console.error('Connections GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { receiverId, action } = await request.json();

    if (action === 'accept') {
      await db`
        UPDATE connections SET status = 'accepted'
        WHERE requester_id = ${receiverId} AND receiver_id = ${session.id}
      `;
      // Notify the requester their connection was accepted
      const accepter = await db`SELECT full_name FROM users WHERE id = ${session.id} LIMIT 1`;
      if (accepter.length > 0) {
        await db`
          INSERT INTO notifications (user_id, type, message, link)
          VALUES (${receiverId}, 'connection_accepted', ${`${accepter[0].full_name} accepted your connection request.`}, '/network')
        `.catch(() => {}); // non-fatal
      }
      return NextResponse.json({ success: true, status: 'accepted' });
    }

    if (receiverId === session.id) {
      return NextResponse.json({ error: 'Cannot connect to yourself' }, { status: 400 });
    }

    const existing = await db`
      SELECT id FROM connections
      WHERE (requester_id = ${session.id} AND receiver_id = ${receiverId})
         OR (requester_id = ${receiverId} AND receiver_id = ${session.id})
      LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json({ message: 'Connection already exists' });
    }

    const conn = await db`
      INSERT INTO connections (requester_id, receiver_id, status)
      VALUES (${session.id}, ${receiverId}, 'pending')
      RETURNING *
    `;

    // Notify the receiver of the new request
    const requester = await db`SELECT full_name FROM users WHERE id = ${session.id} LIMIT 1`;
    if (requester.length > 0) {
      await db`
        INSERT INTO notifications (user_id, type, message, link)
        VALUES (${receiverId}, 'connection_request', ${`${requester[0].full_name} sent you a connection request.`}, '/network')
      `.catch(() => {}); // non-fatal
    }

    return NextResponse.json({ connection: conn[0] }, { status: 201 });
  } catch (error) {
    console.error('Connections POST error:', error);
    return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { connectionId } = await request.json();

    await db`
      DELETE FROM connections
      WHERE id = ${connectionId}
        AND (requester_id = ${session.id} OR receiver_id = ${session.id})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Connections DELETE error:', error);
    return NextResponse.json({ error: 'Failed to remove connection' }, { status: 500 });
  }
}
