import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const user_id = request.nextUrl.searchParams.get('user_id');

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing user_id' },
        { status: 400 }
      );
    }

    // In production: fetch from database
    // const conversations = await db.conversations.findMany({
    //   where: { OR: [{ user_id }, { other_user_id: user_id }] }
    // })

    // Mock data for now
    const conversations = [
      {
        id: '1',
        participant_id: 'biz-123',
        participant_name: 'Tech Solutions Inc',
        participant_email: 'contact@techsolutions.co.za',
        participant_type: 'business',
        last_message: 'Thanks for your interest! We can help you with that.',
        last_message_time: '2 hours ago',
        unread_count: 2,
        avatar: '🏢'
      },
      {
        id: '2',
        participant_id: 'cust-456',
        participant_name: 'John Smith',
        participant_email: 'john@email.com',
        participant_type: 'customer',
        last_message: 'When can you deliver?',
        last_message_time: '30 min ago',
        unread_count: 1,
        avatar: '👤'
      }
    ];

    return NextResponse.json({
      success: true,
      conversations,
      total: conversations.length,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
