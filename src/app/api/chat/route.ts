import { NextRequest, NextResponse } from 'next/server';

// Fallback FAQ knowledge base (used when AI isn't available)
const FAQ: Array<{ patterns: string[]; response: string }> = [
  {
    patterns: ["hi", "hello", "hey", "howzit", "greetings", "good morning", "good afternoon", "sup", "yo"],
    response: "Hey there! 👋 Great to see you on **VerifiedBizLink**.\n\nI can help you with:\n• Business verification & documents\n• Privacy & POPI Act rights\n• Account management & settings\n• Connections & networking\n• Ads & platform features\n\nType your question or try asking about verification!",
  },
  {
    patterns: ["verify", "verification", "vetting", "gold badge", "get verified", "trust badge", "checkmark", "verified"],
    response: "To get your business **Gold Verification badge**, go to the **Vetting Hub** in the navigation.\n\nYou'll need to upload 5 documents:\n• CIPC Registration Certificate\n• VAT Compliance Letter\n• Identity Proof of Directors\n• Proof of Bank Account\n• Proof Business Exists\n\nVerification takes **3–7 business days** after submission.",
  },
  {
    patterns: ["upload", "document", "docs", "file", "cipc", "vat", "id proof", "bank letter", "letterhead"],
    response: "To upload verification documents:\n1. Go to **Vetting** from the sidebar\n2. Check each required document\n3. Click **'Mark Uploaded'** for each\n4. Once all 5 are uploaded, click **'Submit for Vetting'**\n\nAll documents are encrypted and only visible to our compliance team.",
  },
  {
    patterns: ["privacy", "popi", "popia", "personal information", "gdpr", "data protection", "collect", "what data"],
    response: "VerifiedBizLink is fully **POPI Act compliant**.\n\nWe collect:\n• Your name & email\n• Contact details & address\n• Business registration info\n\nWe **never** sell your data. Manage your data in **Settings → Data & Privacy**.",
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
  return "I'm not sure I can answer that specifically. Please email **support@verifiedbizlink.co.za** or visit our [Contact Page](/contact) for help. We respond within 24 hours!";
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

    if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
      try {
        const { ai } = await import('@/ai/genkit');
        const SYSTEM_PROMPT = `You are the VBL Assistant for VerifiedBizLink — South Africa's B2B verification network.
Help with verification, privacy (POPI), accounts, networking, and features. Be friendly and concise.
Key facts: Verification takes 3-7 days, free for all, POPI compliant.
Support: support@verifiedbizlink.co.za`;

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
