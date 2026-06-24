import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sender_id, sender_name, receiver_id, receiver_email, content, receiver_name } = await request.json();

    // Validate input
    if (!sender_id || !receiver_id || !content || !receiver_email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In production: Save to database
    // const message = await db.messages.create({...})

    // Send email notification to receiver
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'messages@verifiedbizlink.co.za',
        to: receiver_email,
        subject: `New message from ${sender_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="color: #fbbf24; margin: 0;">New Message</h2>
              <p style="color: #cbd5e1; margin: 5px 0 0 0;">You have a new message on VerifiedBizLink</p>
            </div>

            <div style="background: #1e293b; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #334155;">
              <p style="color: #e2e8f0; margin: 0 0 15px 0;">
                <strong style="color: #fbbf24;">From:</strong> ${sender_name}
              </p>

              <div style="background: #0f172a; padding: 15px; border-radius: 6px; border-left: 3px solid #fbbf24; margin-bottom: 15px;">
                <p style="color: #e2e8f0; margin: 0; line-height: 1.6;">${content}</p>
              </div>

              <p style="color: #cbd5e1; margin-bottom: 15px;">
                <small>Sent at ${new Date().toLocaleString()}</small>
              </p>

              <a href="${process.env.NEXT_PUBLIC_APP_URL}/messages"
                 style="display: inline-block; background: #fbbf24; color: #0f172a; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                Reply Now
              </a>
            </div>

            <div style="background: #0f172a; padding: 15px; text-align: center; border-top: 1px solid #334155; margin-top: 10px;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                © 2026 VerifiedBizLink. All rights reserved.
              </p>
              <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #fbbf24; text-decoration: none;">Visit our website</a> |
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color: #fbbf24; text-decoration: none;">Notification Settings</a>
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      console.error('Email send failed:', await emailResponse.json());
      // Don't fail the request if email fails, message was still created
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
