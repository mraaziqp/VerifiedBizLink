import { sendRawEmail, sendWithin } from '@/lib/email';

/**
 * The two emails the hiring flow sends: "someone applied" to an employer and
 * "your application moved" to a candidate. Same frame as the new-message
 * email, so they read as coming from the same place.
 */

export const escapeHtml = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface JobEmail {
  to: string;
  subject: string;
  heading: string;
  /** Plain text; escaped here. */
  lines: string[];
  /** A person's own words (cover note, employer's message); escaped here. */
  quote?: string | null;
  cta: { label: string; url: string };
}

/**
 * Sends, waiting at most a few seconds.
 *
 * Awaited rather than fired and forgotten: on serverless the function can be
 * frozen the moment the response is returned, and an un-awaited send is then
 * simply never finished. Capped so a slow mail server cannot hold up the
 * person who just clicked Apply. Never throws — an email is a courtesy on top
 * of the in-app notification, not part of the action succeeding.
 */
export async function sendJobEmail(email: JobEmail, waitMs = 4500): Promise<void> {
  if (!email.to) return;
  const body = email.lines
    .filter(Boolean)
    .map((line) => `<p style="color:#0f172a;margin:0 0 10px;line-height:1.6;">${escapeHtml(line)}</p>`)
    .join('');
  const quote = email.quote
    ? `<div style="background:#f8fafc;padding:15px;border-radius:6px;border-left:3px solid #fbbf24;margin:6px 0 4px;">
         <p style="color:#0f172a;margin:0;line-height:1.6;white-space:pre-wrap;">${escapeHtml(email.quote.slice(0, 1200))}</p>
       </div>`
    : '';
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#0f172a;padding:20px;border-radius:8px 8px 0 0;"><h2 style="color:#fbbf24;margin:0;">${escapeHtml(email.heading)}</h2></div>
      <div style="background:#ffffff;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;">
        ${body}${quote}
        <p style="margin-top:18px;"><a href="${escapeHtml(email.cta.url)}" style="background:#fbbf24;color:#0f172a;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">${escapeHtml(email.cta.label)}</a></p>
      </div>
    </div>`;
  try {
    await sendWithin(sendRawEmail(email.to, email.subject, html), waitMs);
  } catch (error) {
    console.error('Job email not confirmed sent:', (error as Error)?.message ?? error);
  }
}
