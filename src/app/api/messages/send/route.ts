import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sendDirectMessage } from '@/lib/messaging';

// POST /api/messages/send  { receiver_id, content, image_url?, attachment?, reply_to_id? }
// Kept for the floating widget and the /messages page; the hub uses the
// sendMessage server action. Both go through the same sendDirectMessage.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const result = await sendDirectMessage({
      senderId: session.id,
      senderName: session.fullName,
      senderEmail: session.email,
      receiverId: String(body.receiver_id ?? ''),
      content: body.content,
      imageUrl: body.image_url ?? null,
      attachment: body.attachment ?? null,
      replyToId: body.reply_to_id ?? null,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    // Both shapes: snake_case for the existing widget, camelCase for the store.
    const m = result.message;
    return NextResponse.json({
      success: true,
      message: {
        id: m.id, sender_id: m.senderId, receiver_id: m.receiverId, content: m.content,
        image_url: m.attachment?.type.startsWith('image/') ? m.attachment.url : null,
        read: m.read, created_at: m.createdAt,
      },
      chatMessage: m,
    }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
