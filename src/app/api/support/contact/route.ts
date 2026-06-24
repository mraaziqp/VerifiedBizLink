import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message, type } = await request.json();

    // Validate input
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Send to business email
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@verifiedbizlink.co.za',
        to: 'info@verifiedbizlink.co.za',
        replyTo: email,
        subject: `[${type || 'Support'}] ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="color: #fbbf24; margin: 0;">New Support Request</h2>
              <p style="color: #cbd5e1; margin: 5px 0 0 0;">${type ? type.toUpperCase() : 'SUPPORT'}</p>
            </div>

            <div style="background: #1e293b; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #334155;">
              <div style="margin-bottom: 15px;">
                <p style="color: #cbd5e1; margin: 0;">
                  <strong style="color: #fbbf24;">From:</strong> ${name}
                </p>
                <p style="color: #cbd5e1; margin: 5px 0 0 0;">
                  <strong style="color: #fbbf24;">Email:</strong> ${email}
                </p>
              </div>

              <div style="background: #0f172a; padding: 15px; border-radius: 6px; border-left: 3px solid #fbbf24; margin: 15px 0;">
                <h3 style="color: #fbbf24; margin: 0 0 10px 0;">Subject:</h3>
                <p style="color: #e2e8f0; margin: 0;">${subject}</p>
              </div>

              <div style="background: #0f172a; padding: 15px; border-radius: 6px; border-left: 3px solid #fbbf24;">
                <h3 style="color: #fbbf24; margin: 0 0 10px 0;">Message:</h3>
                <p style="color: #e2e8f0; margin: 0; white-space: pre-wrap; line-height: 1.6;">${message}</p>
              </div>

              <p style="color: #64748b; font-size: 12px; margin-top: 15px;">
                <strong>Received at:</strong> ${new Date().toLocaleString()}
              </p>
            </div>

            <div style="background: #0f172a; padding: 15px; text-align: center; border-top: 1px solid #334155; margin-top: 10px;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                This is an automated message. Please reply directly to this email to respond to the support request.
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.json();
      console.error('Email send failed:', error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    // Also send confirmation email to user
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@verifiedbizlink.co.za',
        to: email,
        subject: `We received your support request - ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="color: #fbbf24; margin: 0;">Support Request Received</h2>
              <p style="color: #cbd5e1; margin: 5px 0 0 0;">We're here to help!</p>
            </div>

            <div style="background: #1e293b; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #334155;">
              <p style="color: #e2e8f0; margin: 0 0 15px 0;">
                Hi ${name},
              </p>

              <p style="color: #cbd5e1; margin: 0 0 15px 0;">
                Thank you for contacting VerifiedBizLink! We've received your support request and our team will get back to you as soon as possible.
              </p>

              <div style="background: #0f172a; padding: 15px; border-radius: 6px; border-left: 3px solid #fbbf24; margin: 15px 0;">
                <p style="color: #cbd5e1; margin: 0;">
                  <strong style="color: #fbbf24;">Subject:</strong><br/>
                  ${subject}
                </p>
              </div>

              <p style="color: #cbd5e1; margin: 0 0 15px 0;">
                <strong style="color: #fbbf24;">Expected response time:</strong><br/>
                We typically respond within 24 hours during business days.
              </p>

              <p style="color: #cbd5e1; margin: 0;">
                If you have any additional information to add, please reply directly to this email.
              </p>
            </div>

            <div style="background: #0f172a; padding: 15px; text-align: center; border-top: 1px solid #334155; margin-top: 10px;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                © 2026 VerifiedBizLink. All rights reserved.<br/>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #fbbf24; text-decoration: none;">Visit our website</a>
              </p>
            </div>
          </div>
        `,
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'Support request sent successfully',
      id: `ticket-${Date.now()}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending support request:', error);
    return NextResponse.json(
      { error: 'Failed to send support request' },
      { status: 500 }
    );
  }
}
