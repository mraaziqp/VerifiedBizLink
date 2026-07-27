import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSession } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendRawEmail } from '@/lib/email';
import db from '@/lib/db';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = checkRateLimit(`contact:${ip}`, 5, 900);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rl.retryAfterSecs} seconds.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSecs) } },
    );
  }

  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Try to get user session to link ticket
    const session = await getSession().catch(() => null);
    const userId = session?.id || null;

    // Log support ticket in DB
    await db`
      INSERT INTO support_tickets (user_id, name, email, category, subject, message, status)
      VALUES (${userId}, ${name}, ${email}, 'support', ${subject || 'Support Request'}, ${message}, 'open')
    `.catch((dbErr) => {
      console.error('Failed to insert support ticket in DB:', dbErr);
    });

    let aiResponse = '';
    let usedAI = false;

    // Try to get AI response from Gemini
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `A user is contacting our support team with this query:

Name: ${name}
Email: ${email}
Subject: ${subject}
Message: ${message}

Provide a helpful, professional, and concise response to their query. If it's a simple question, answer it. If it requires escalation or is complex, acknowledge their concern and confirm they'll hear from our team shortly.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      aiResponse = response.text();
      usedAI = true;
    } catch (aiError) {
      console.error('Gemini API error:', aiError);
      aiResponse = 'Our AI assistant is temporarily unavailable. Your query will be reviewed by our team.';
    }

    try {
      await sendRawEmail(
        process.env.SUPPORT_EMAIL || 'info@verifiedbizlink.co.za',
        `[SUPPORT] ${subject} - ${name}`,
        `
            <div style="font-family: Arial, sans-serif; background: #f4f4f5; padding: 20px;">
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <h2>New Support Query</h2>
                <p><strong>From:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <hr/>
                <h3>Message:</h3>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <hr/>
                <h3>AI Response Generated:</h3>
                <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #FCC200;">
                  <p>${aiResponse.replace(/\n/g, '<br>')}</p>
                </div>
                <p style="color: #666; font-size: 12px; margin-top: 20px;">
                  <em>AI-assisted response preview. Please review and send a personalized response to ${email}</em>
                </p>
              </div>
            </div>
          `,
      );
    } catch (supportErr) {
      console.error('Error sending support notification for', email, supportErr);
    }

    try {
      await sendRawEmail(
        email,
        `We received your query - ${subject}`,
        `
            <div style="font-family: Arial, sans-serif; background: #f4f4f5; padding: 20px;">
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <h2>Thanks for reaching out, ${name}!</h2>
                <p>We received your message and our team is looking into it.</p>
                <div style="background: #f0f8ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <h3>Initial AI Response:</h3>
                  <p>${aiResponse.replace(/\n/g, '<br>')}</p>
                </div>
                <p>If you need further assistance, our team will contact you shortly.</p>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  Best regards,<br/>
                  <strong>VerifiedBizLink Support Team</strong>
                </p>
              </div>
            </div>
          `,
      );
    } catch (confirmErr) {
      console.error('Error sending confirmation to', email, confirmErr);
    }

    console.log(`[SUPPORT] Query from ${name} (${email}) - AI: ${usedAI ? 'Success' : 'Failed'}`);

    return NextResponse.json({
      success: true,
      message: 'Query submitted successfully',
      aiResponse,
    });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to process query' },
      { status: 500 }
    );
  }
}
