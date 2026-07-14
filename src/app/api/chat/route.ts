import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

const STATUS_QUERY_PATTERNS = [
  "where am i", "my status", "verification status", "my verification",
  "check my status", "check my verification", "queue", "ticket number",
  "how long will", "when will i be verified", "am i verified",
];

async function findVerificationStatusResponse(): Promise<string | null> {
  const session = await getSession();
  if (!session) {
    return "You'll need to be logged in for me to look up your verification status — [sign in here](/login) and ask me again.";
  }

  const rows = await db`
    SELECT id, company_name, status, submitted_at, trust_score
    FROM businesses WHERE user_id = ${session.id} LIMIT 1
  `;

  if (rows.length === 0) {
    return "I don't see a business profile on your account yet. Head to the **Vetting Hub** to set one up and start the verification process.";
  }

  const biz = rows[0];
  const ticketNumber = `VBL-${biz.id.slice(0, 8).toUpperCase()}`;

  if (biz.status === 'verified') {
    return `Great news — **${biz.company_name}** is fully **Verified** ✅ (Trust Score: ${biz.trust_score ?? 0}/100). Your Gold Verification badge is live on your public profile.`;
  }
  if (biz.status === 'rejected') {
    return `Your submission for **${biz.company_name}** (Ticket ${ticketNumber}) needs attention — it was returned by our compliance team. Head to the **Vetting Hub** to review the feedback and resubmit your documents.`;
  }
  if (!biz.submitted_at || biz.status === 'unregistered') {
    return `Looks like **${biz.company_name}** hasn't been submitted for verification yet. Upload your documents in the **Vetting Hub** and click "Submit for Vetting" to join the queue.`;
  }

  const [queueRow] = await db`
    SELECT
      (SELECT COUNT(*) FROM businesses WHERE status IN ('pending', 'reviewing') AND submitted_at <= ${biz.submitted_at}) AS position,
      (SELECT COUNT(*) FROM businesses WHERE status IN ('pending', 'reviewing')) AS total
  `;
  const position = parseInt(queueRow.position);
  const total = parseInt(queueRow.total);
  const submittedDate = new Date(biz.submitted_at).toLocaleDateString();

  return `Here's where you stand:\n\n**${biz.company_name}** — Ticket **${ticketNumber}**\nStatus: **${biz.status === 'reviewing' ? 'Under Review' : 'Pending Review'}**\nQueue position: **#${position} of ${total}**\nSubmitted: ${submittedDate}\n\nVerification typically takes 3–7 business days once review starts. You'll get a notification the moment your status changes.`;
}

function isStatusQuery(query: string): boolean {
  const q = query.toLowerCase();
  return STATUS_QUERY_PATTERNS.some((p) => q.includes(p));
}

const ESCALATION_PATTERNS = [
  "human", "real person", "agent", "talk to someone", "speak to", "speak with",
  "escalate", "complaint", "complain", "not helpful", "call centre", "call center",
  "customer service", "representative", "manager",
];

function isEscalationRequest(query: string): boolean {
  const q = query.toLowerCase();
  return ESCALATION_PATTERNS.some((p) => q.includes(p));
}

const ESCALATION_RESPONSE =
  "Of course — I'll get you to a real person.\n\n" +
  "📧 Email us directly: **info@verifiedbizlink.co.za**\n" +
  "📝 Or fill out the [Contact form](/contact) and our team will respond within 24 hours.\n\n" +
  "If this is about your verification status, an ad, or a payment, mention your business name or ticket number so we can find your account fast.";

// Fallback FAQ knowledge base (used when AI isn't available)
const FAQ: Array<{ patterns: string[]; response: string }> = [
  {
    patterns: ["hi", "hello", "hey", "howzit", "greetings", "good morning", "good afternoon", "sup", "yo"],
    response: "Hey there! 👋 Great to see you on **VerifiedBizLink**.\n\nI can help you with:\n• Business verification & documents\n• Privacy & POPI Act rights\n• Account management & settings\n• Connections & networking\n• Ads, boosting, and billing\n\nType your question, or ask to **speak to a human** if you'd rather deal with our team directly.",
  },
  {
    patterns: ["verify", "verification", "vetting", "gold badge", "get verified", "trust badge", "checkmark", "verified"],
    response: "To get your business **Gold Verification badge**, go to the **Vetting Hub** in the navigation.\n\nYou'll need to upload 4 documents:\n• CIPC Registration Certificate\n• Identity Proof of Directors\n• Proof of Bank Account\n• Proof of Operating Address\n\nVerification takes **3–7 business days** after submission. Already submitted? Ask me \"where am I in the verification process\" and I'll pull your live status.",
  },
  {
    patterns: ["upload", "document", "docs", "file", "cipc", "vat", "id proof", "bank letter", "letterhead"],
    response: "To upload verification documents:\n1. Go to **Vetting** from the sidebar\n2. Check each required document\n3. Click **'Mark Uploaded'** for each\n4. Once all documents are uploaded, click **'Submit for Vetting'**\n\nAll documents are encrypted and only visible to our compliance team.",
  },
  {
    patterns: ["privacy", "popi", "popia", "personal information", "gdpr", "data protection", "collect", "what data"],
    response: "VerifiedBizLink is fully **POPI Act compliant**.\n\nWe collect:\n• Your name & email\n• Contact details & address\n• Business registration info\n\nWe **never** sell your data. Manage your data in **Settings → Data & Privacy**.",
  },
  {
    patterns: ["ad", "ads", "advertise", "advertising", "boost", "sponsored", "campaign"],
    response: "You can create and manage sponsored ads from **Business Dashboard → Ad Campaigns**.\n\n• Free plans don't include ads — upgrade to Standard or Premium in Settings → Billing\n• Once you've created an ad, click **Boost — R100** on it to get 7 days of priority placement across the platform\n• Boosted ads always show first to other members browsing the site",
  },
  {
    patterns: ["payment", "pay", "billing", "invoice", "subscription", "upgrade", "price", "pricing", "cost", "refund"],
    response: "Payments run through **PayFast**. You can upgrade your plan or boost an ad from **Settings → Billing** or **Business Dashboard → Ad Campaigns**.\n\nRefunds follow our [Refund Policy](/refund-policy) — a 7-day cooling-off period applies, non-refundable after that. If a payment didn't go through correctly, contact us and include your reference number.",
  },
  {
    patterns: ["message", "messaging", "chat with", "dm", "contact a business"],
    response: "You can message any business or connection directly from the chat icon, or from their profile page. Look for the message bubble in the bottom corner, or open **Messages** from the menu.",
  },
  {
    patterns: ["password", "forgot password", "reset password", "can't log in", "cant log in", "login issue", "locked out"],
    response: "Forgot your password? Use the **Forgot password?** link on the login page — we'll email you a reset link (valid for 1 hour).\n\nStill stuck? [Contact us](/contact) and we'll help you regain access.",
  },
];

function findResponse(query: string): string {
  const q = query.toLowerCase().trim();
  let bestScore = 0;
  let bestResponse = "";
  for (const entry of FAQ) {
    let score = 0;
    for (const p of entry.patterns) {
      if (q.includes(p)) score += p.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestResponse = entry.response;
    }
  }
  if (bestScore > 0) return bestResponse;
  return "I'm not sure I can answer that specifically. Please email **info@verifiedbizlink.co.za** or visit our [Contact Page](/contact) for help. We respond within 24 hours!";
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Try to use AI if available, otherwise fall back to FAQ
    let responseText: string;

    if (isEscalationRequest(message)) {
      responseText = ESCALATION_RESPONSE;
    } else if (isStatusQuery(message)) {
      responseText = (await findVerificationStatusResponse().catch((err) => {
        console.error('Chat status lookup failed:', err);
        return null;
      })) ?? "I couldn't look up your verification status just now — please try again shortly, or check the Vetting Hub directly.";
    } else if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
      try {
        const { ai } = await import('@/ai/genkit');
        const SYSTEM_PROMPT = `You are the VBL Assistant — the call-centre-style support assistant for VerifiedBizLink,
South Africa's B2B verification network. Act like a helpful, competent call-centre agent: greet warmly, listen to
the actual question, and try to fully resolve it in your reply rather than giving a vague answer.

You can help with:
- Business verification/vetting (CIPC, SARS, ID, bank, address documents — takes 3-7 business days after submission)
- Verification queue status and ticket numbers (tell users to ask "where am I in the verification process" — a separate system pulls their live status)
- Account management, password resets, profile/settings changes
- Messaging and connecting with other businesses
- Sponsored ads: creating an ad requires a paid plan (Standard/Premium); boosting an ad costs R100 for 7 days of priority placement
- Billing and subscriptions via PayFast; refunds follow a 7-day cooling-off policy
- Privacy and POPI Act compliance — we never sell user data

Be concise, friendly, and use South African context naturally. If the question is something you genuinely can't
resolve (a specific account issue, a billing dispute, a bug report, or anything you're not confident about), say so
plainly and direct them to email info@verifiedbizlink.co.za or use the Contact page — don't guess or make up details.`;

        const fullPrompt = `${SYSTEM_PROMPT}\n\nUser question: ${message.trim()}`;
        const response = await ai.generate(fullPrompt);
        responseText = response.text || 'Unable to process your request.';
      } catch (error) {
        // Fall back to FAQ if AI fails
        console.error('Genkit error:', error);
        responseText = findResponse(message);
      }
    } else {
      // Use FAQ fallback
      responseText = findResponse(message);
    }

    return NextResponse.json({
      success: true,
      message: responseText,
      timestamp: new Date(),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Chat API error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to process message', detail: errorMsg },
      { status: 500 }
    );
  }
}
