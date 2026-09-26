import db from '@/lib/db';
import { sendRawEmail } from '@/lib/email';

/**
 * Direct messaging: one place for every read and write.
 *
 * Built on the existing `messages` table (sender_id / receiver_id), which
 * the floating widget, the /messages page and every "Message this business"
 * button already use — so no history moves and nothing that works today
 * breaks. What the hub adds is additive:
 *
 *   messages                 + edit / soft-delete / reply / attachment /
 *                              structured kinds (quote, payment request)
 *   message_thread_prefs     per person, per conversation: pinned, archived,
 *                              category, label
 *   canned_responses         saved replies, triggered with "/" in the composer
 *   message_files            private attachments (PDF, images), served only
 *                              to the two people in the conversation
 *   users.last_active_at     presence, for the online dot
 *
 * A "conversation" is the pair of people. Everything is scoped to the
 * signed-in user in SQL, never trusted from the client.
 */

export type ThreadCategory = 'general' | 'lead' | 'support' | 'verification';
export const THREAD_CATEGORIES: ThreadCategory[] = ['general', 'lead', 'support', 'verification'];
export type MessageKind = 'text' | 'quote' | 'payment_request';

export const MESSAGE_MAX_CHARS = 4000;
export const ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

let ready: Promise<void> | null = null;

export function ensureMessagingSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await db`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT FALSE`;
      await db`ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ`;
      await db`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE`;
      await db`ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
      await db`ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID`;
      await db`ALTER TABLE messages ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'text'`;
      await db`ALTER TABLE messages ADD COLUMN IF NOT EXISTS meta JSONB`;
      await db`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT`;
      await db`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name TEXT`;
      await db`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT`;
      await db`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_size INTEGER`;
      await db`CREATE INDEX IF NOT EXISTS messages_pair_idx ON messages (sender_id, receiver_id, created_at DESC)`;
      await db`CREATE INDEX IF NOT EXISTS messages_receiver_unread_idx ON messages (receiver_id, read) WHERE read = FALSE`;

      await db`
        CREATE TABLE IF NOT EXISTS message_thread_prefs (
          user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          other_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          is_pinned     BOOLEAN NOT NULL DEFAULT FALSE,
          is_archived   BOOLEAN NOT NULL DEFAULT FALSE,
          category      TEXT NOT NULL DEFAULT 'general',
          custom_label  TEXT,
          updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (user_id, other_user_id)
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS canned_responses (
          id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          shortcut_trigger TEXT NOT NULL,
          full_text        TEXT NOT NULL,
          created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (user_id, shortcut_trigger)
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS message_files (
          id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          file_name   TEXT NOT NULL,
          mime_type   TEXT NOT NULL,
          size_bytes  INTEGER NOT NULL,
          data_base64 TEXT NOT NULL,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ`;
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

// ---------------------------------------------------------------- types

export interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  kind: MessageKind;
  meta: Record<string, unknown> | null;
  attachment: Attachment | null;
  replyTo: { id: string; content: string; senderId: string } | null;
  read: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
}

export interface InboxThread {
  otherUserId: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  companyName: string | null;
  businessId: string | null;
  isVerified: boolean;
  online: boolean;
  lastMessage: string;
  lastMessageAt: string | null;
  lastFromMe: boolean;
  unread: number;
  isPinned: boolean;
  isArchived: boolean;
  category: ThreadCategory;
  label: string | null;
  isConnection: boolean;
}

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);

function preview(row: Record<string, unknown>): string {
  if (row.is_deleted) return 'This message was deleted';
  if (row.kind === 'quote') return '📄 Sent a quote';
  if (row.kind === 'payment_request') return '💳 Payment request';
  const text = String(row.content ?? '').trim();
  if (text) return text.slice(0, 140);
  if (row.attachment_name) return `📎 ${row.attachment_name}`;
  if (row.image_url) return '📷 Photo';
  return '';
}

export function toChatMessage(r: Record<string, unknown>): ChatMessage {
  const deleted = r.is_deleted === true;
  const attachmentUrl = (r.attachment_url as string) || (r.image_url as string) || null;
  return {
    id: String(r.id),
    senderId: String(r.sender_id),
    receiverId: String(r.receiver_id),
    // Soft delete: the row stays for the audit trail, the text does not
    // reach the other person's screen.
    content: deleted ? '' : String(r.content ?? ''),
    kind: deleted ? 'text' : ((r.kind as MessageKind) || 'text'),
    meta: deleted ? null : ((r.meta as Record<string, unknown>) ?? null),
    attachment: deleted || !attachmentUrl
      ? null
      : {
          url: attachmentUrl,
          name: (r.attachment_name as string) || 'Photo',
          type: (r.attachment_type as string) || 'image/jpeg',
          size: Number(r.attachment_size ?? 0),
        },
    replyTo: r.reply_id
      ? { id: String(r.reply_id), content: r.reply_deleted ? 'This message was deleted' : String(r.reply_content ?? '').slice(0, 160), senderId: String(r.reply_sender_id) }
      : null,
    read: r.read === true,
    isEdited: r.is_edited === true,
    isDeleted: deleted,
    createdAt: iso(r.created_at) ?? new Date().toISOString(),
  };
}

// ---------------------------------------------------------------- presence

/** Marks the user active, at most once a minute (it is called on every poll). */
export async function touchPresence(userId: string): Promise<void> {
  await db`
    UPDATE users SET last_active_at = NOW()
    WHERE id = ${userId} AND (last_active_at IS NULL OR last_active_at < NOW() - INTERVAL '60 seconds')
  `.catch(() => {});
}

// ---------------------------------------------------------------- reads

/**
 * Every conversation the user is part of, plus accepted connections they
 * have not messaged yet (so the hub is a starting point, not only a log).
 */
export async function getInbox(userId: string): Promise<InboxThread[]> {
  await ensureMessagingSchema();
  const rows = await db`
    WITH pairs AS (
      SELECT CASE WHEN sender_id = ${userId} THEN receiver_id ELSE sender_id END AS other_id,
             id, content, kind, image_url, attachment_name, is_deleted, created_at, sender_id
      FROM messages
      WHERE sender_id = ${userId} OR receiver_id = ${userId}
    ),
    latest AS (
      SELECT DISTINCT ON (other_id) * FROM pairs ORDER BY other_id, created_at DESC
    ),
    unread AS (
      SELECT sender_id AS other_id, COUNT(*)::int AS n
      FROM messages WHERE receiver_id = ${userId} AND read = FALSE AND is_deleted = FALSE
      GROUP BY sender_id
    ),
    conns AS (
      SELECT CASE WHEN requester_id = ${userId} THEN receiver_id ELSE requester_id END AS other_id
      FROM connections
      WHERE (requester_id = ${userId} OR receiver_id = ${userId}) AND status = 'accepted'
    ),
    everyone AS (
      SELECT other_id FROM latest UNION SELECT other_id FROM conns
    )
    SELECT e.other_id,
           u.full_name, u.avatar_url, u.headline, u.last_active_at,
           b.id AS business_id, b.company_name, b.status AS business_status,
           l.content, l.kind, l.image_url, l.attachment_name, l.is_deleted, l.created_at AS last_at, l.sender_id AS last_sender,
           COALESCE(un.n, 0) AS unread,
           COALESCE(p.is_pinned, FALSE) AS is_pinned,
           COALESCE(p.is_archived, FALSE) AS is_archived,
           COALESCE(p.category, 'general') AS category,
           p.custom_label,
           (e.other_id IN (SELECT other_id FROM conns)) AS is_connection
    FROM everyone e
    JOIN users u ON u.id = e.other_id
    LEFT JOIN businesses b ON b.user_id = e.other_id
    LEFT JOIN latest l ON l.other_id = e.other_id
    LEFT JOIN unread un ON un.other_id = e.other_id
    LEFT JOIN message_thread_prefs p ON p.user_id = ${userId} AND p.other_user_id = e.other_id
    WHERE e.other_id <> ${userId}
    ORDER BY COALESCE(p.is_pinned, FALSE) DESC, l.created_at DESC NULLS LAST, u.full_name ASC
    LIMIT 300
  `;
  const now = Date.now();
  return rows.map((r) => ({
    otherUserId: String(r.other_id),
    name: String(r.company_name || r.full_name || 'Member'),
    avatarUrl: (r.avatar_url as string) || null,
    headline: r.company_name ? String(r.full_name ?? '') : ((r.headline as string) || null),
    companyName: (r.company_name as string) || null,
    businessId: r.business_id ? String(r.business_id) : null,
    isVerified: r.business_status === 'verified',
    online: r.last_active_at ? now - new Date(r.last_active_at as string).getTime() < 2 * 60 * 1000 : false,
    lastMessage: r.last_at ? preview(r) : 'Connected — say hello',
    lastMessageAt: iso(r.last_at),
    lastFromMe: String(r.last_sender ?? '') === userId,
    unread: Number(r.unread ?? 0),
    isPinned: r.is_pinned === true,
    isArchived: r.is_archived === true,
    category: (THREAD_CATEGORIES as string[]).includes(String(r.category)) ? (r.category as ThreadCategory) : 'general',
    label: (r.custom_label as string) || null,
    isConnection: r.is_connection === true,
  }));
}

/** The latest messages between two people, oldest first. Marks theirs read. */
export async function getThread(userId: string, otherId: string, limit = 150): Promise<ChatMessage[]> {
  await ensureMessagingSchema();
  const rows = await db`
    SELECT * FROM (
      SELECT m.*, r.id AS reply_id, r.content AS reply_content, r.sender_id AS reply_sender_id, r.is_deleted AS reply_deleted
      FROM messages m
      LEFT JOIN messages r ON r.id = m.reply_to_id
      WHERE (m.sender_id = ${userId} AND m.receiver_id = ${otherId})
         OR (m.sender_id = ${otherId} AND m.receiver_id = ${userId})
      ORDER BY m.created_at DESC
      LIMIT ${limit}
    ) t ORDER BY created_at ASC
  `;
  await db`
    UPDATE messages SET read = TRUE
    WHERE receiver_id = ${userId} AND sender_id = ${otherId} AND read = FALSE
  `;
  return rows.map(toChatMessage);
}

export interface ContactContext {
  userId: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  location: string | null;
  memberSince: string | null;
  online: boolean;
  business: {
    id: string;
    companyName: string;
    industry: string | null;
    status: string;
    trustScore: number;
    regNumber: string | null;
    hasVat: boolean;
    website: string | null;
    phone: string | null;
    verifiedAt: string | null;
  } | null;
  sharedFiles: { messageId: string; url: string; name: string; type: string; createdAt: string }[];
  isConnection: boolean;
}

/** Everything the right-hand drawer shows about the other person. */
export async function getContactContext(userId: string, otherId: string): Promise<ContactContext | null> {
  await ensureMessagingSchema();
  const [u] = await db`
    SELECT u.id, u.full_name, u.avatar_url, u.headline, u.location, u.created_at, u.last_active_at,
           b.id AS business_id, b.company_name, b.industry, b.status, b.trust_score, b.reg_number,
           b.vat_number, b.website, b.phone, b.verified_at
    FROM users u LEFT JOIN businesses b ON b.user_id = u.id
    WHERE u.id = ${otherId} LIMIT 1
  `;
  if (!u) return null;
  const files = await db`
    SELECT id, COALESCE(attachment_url, image_url) AS url, attachment_name, attachment_type, image_url, created_at
    FROM messages
    WHERE ((sender_id = ${userId} AND receiver_id = ${otherId}) OR (sender_id = ${otherId} AND receiver_id = ${userId}))
      AND is_deleted = FALSE AND (attachment_url IS NOT NULL OR image_url IS NOT NULL)
    ORDER BY created_at DESC LIMIT 60
  `;
  const [conn] = await db`
    SELECT 1 FROM connections
    WHERE status = 'accepted'
      AND ((requester_id = ${userId} AND receiver_id = ${otherId}) OR (requester_id = ${otherId} AND receiver_id = ${userId}))
    LIMIT 1
  `;
  return {
    userId: String(u.id),
    name: String(u.full_name || 'Member'),
    avatarUrl: (u.avatar_url as string) || null,
    headline: (u.headline as string) || null,
    location: (u.location as string) || null,
    memberSince: iso(u.created_at),
    online: u.last_active_at ? Date.now() - new Date(u.last_active_at as string).getTime() < 2 * 60 * 1000 : false,
    business: u.business_id
      ? {
          id: String(u.business_id),
          companyName: String(u.company_name ?? ''),
          industry: (u.industry as string) || null,
          status: String(u.status ?? 'unregistered'),
          trustScore: Number(u.trust_score ?? 0),
          regNumber: (u.reg_number as string) || null,
          hasVat: Boolean(u.vat_number),
          website: (u.website as string) || null,
          phone: (u.phone as string) || null,
          verifiedAt: iso(u.verified_at),
        }
      : null,
    sharedFiles: files.map((f) => ({
      messageId: String(f.id),
      url: String(f.url),
      name: (f.attachment_name as string) || 'Photo',
      type: (f.attachment_type as string) || (f.image_url ? 'image/jpeg' : 'application/octet-stream'),
      createdAt: iso(f.created_at) ?? '',
    })),
    isConnection: Boolean(conn),
  };
}

// ---------------------------------------------------------------- writes

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface SendInput {
  senderId: string;
  senderName: string;
  senderEmail: string;
  receiverId: string;
  content?: string;
  kind?: MessageKind;
  meta?: Record<string, unknown> | null;
  attachment?: Attachment | null;
  /** Legacy image_url from the widget's photo upload. */
  imageUrl?: string | null;
  replyToId?: string | null;
}

export type SendResult = { ok: true; message: ChatMessage } | { ok: false; error: string; status: number };

/**
 * Sends one message. Validates everything server-side, including that a
 * reply points into THIS conversation and an attachment is either one of our
 * private files or an upload URL we issued.
 */
export async function sendDirectMessage(input: SendInput): Promise<SendResult> {
  await ensureMessagingSchema();
  const content = String(input.content ?? '').trim().slice(0, MESSAGE_MAX_CHARS);
  const kind: MessageKind = input.kind === 'quote' || input.kind === 'payment_request' ? input.kind : 'text';

  if (!isUuid(input.receiverId)) return { ok: false, error: 'Choose who to message.', status: 400 };
  if (input.receiverId === input.senderId) return { ok: false, error: 'You cannot message yourself.', status: 400 };
  if (!content && !input.attachment && !input.imageUrl && kind === 'text') {
    return { ok: false, error: 'Type a message or attach a file.', status: 400 };
  }

  const [receiver] = await db`SELECT id, email, full_name, is_suspended FROM users WHERE id = ${input.receiverId} LIMIT 1`;
  if (!receiver) return { ok: false, error: 'That person could not be found.', status: 404 };

  let replyToId: string | null = null;
  if (input.replyToId) {
    if (!isUuid(input.replyToId)) return { ok: false, error: 'Invalid reply.', status: 400 };
    const [target] = await db`
      SELECT id FROM messages WHERE id = ${input.replyToId}
        AND ((sender_id = ${input.senderId} AND receiver_id = ${input.receiverId})
          OR (sender_id = ${input.receiverId} AND receiver_id = ${input.senderId}))
      LIMIT 1
    `;
    if (!target) return { ok: false, error: 'You can only reply to a message in this conversation.', status: 400 };
    replyToId = String(target.id);
  }

  const att = input.attachment ?? null;
  if (att) {
    const own = att.url.match(/^\/api\/messages\/files\/([0-9a-f-]{36})$/i);
    const hosted = /^https:\/\//.test(att.url) || /^data:image\/(png|jpe?g|webp|gif);base64,/.test(att.url);
    if (own) {
      const [f] = await db`SELECT id FROM message_files WHERE id = ${own[1]} AND uploader_id = ${input.senderId} LIMIT 1`;
      if (!f) return { ok: false, error: 'That attachment could not be found. Upload it again.', status: 400 };
    } else if (!hosted) {
      return { ok: false, error: 'That attachment could not be used.', status: 400 };
    }
  }

  const meta = kind === 'text' ? null : sanitiseCardMeta(kind, input.meta);
  if (kind !== 'text' && !meta) return { ok: false, error: 'Fill in the amount and description.', status: 400 };

  // Email only when the conversation was quiet: one per 15 minutes per
  // sender, instead of one per message.
  const [recent] = await db`
    SELECT 1 FROM messages
    WHERE sender_id = ${input.senderId} AND receiver_id = ${input.receiverId}
      AND created_at > NOW() - INTERVAL '15 minutes'
    LIMIT 1
  `;

  const [saved] = await db`
    INSERT INTO messages (sender_id, receiver_id, content, image_url, reply_to_id, kind, meta,
                          attachment_url, attachment_name, attachment_type, attachment_size)
    VALUES (${input.senderId}, ${input.receiverId}, ${content}, ${input.imageUrl || null}, ${replyToId}, ${kind},
            ${meta ? JSON.stringify(meta) : null}::jsonb,
            ${att?.url ?? null}, ${att?.name?.slice(0, 200) ?? null}, ${att?.type ?? null}, ${att?.size ?? null})
    RETURNING *
  `;

  // A sent message un-archives the thread for the sender — they are clearly
  // using it again.
  await db`
    UPDATE message_thread_prefs SET is_archived = FALSE, updated_at = NOW()
    WHERE user_id = ${input.senderId} AND other_user_id = ${input.receiverId} AND is_archived = TRUE
  `.catch(() => {});

  if (!recent && receiver.email && !receiver.is_suspended) {
    const who = escapeHtml(input.senderName || input.senderEmail || 'A VerifiedBizLink member');
    const body = kind === 'quote' ? '📄 Sent you a quote'
      : kind === 'payment_request' ? '💳 Sent you a payment request'
      : content ? escapeHtml(content.slice(0, 500)) : '📎 Sent you a file';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.verifiedbizlink.co.za';
    sendRawEmail(
      String(receiver.email),
      `New message from ${input.senderName || 'a VerifiedBizLink member'}`,
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
         <div style="background:#0f172a;padding:20px;border-radius:8px 8px 0 0;"><h2 style="color:#fbbf24;margin:0;">New message</h2></div>
         <div style="background:#ffffff;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;">
           <p style="color:#0f172a;"><strong>From:</strong> ${who}</p>
           <div style="background:#f8fafc;padding:15px;border-radius:6px;border-left:3px solid #fbbf24;">
             <p style="color:#0f172a;margin:0;line-height:1.6;">${body}</p>
           </div>
           <p style="margin-top:16px;"><a href="${appUrl}/dashboard/messages?with=${input.senderId}" style="background:#fbbf24;color:#0f172a;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Reply now</a></p>
         </div>
       </div>`,
    ).catch((e) => console.error('Message email failed:', e));
  }

  return { ok: true, message: toChatMessage(saved) };
}

function sanitiseCardMeta(kind: MessageKind, raw: unknown): Record<string, unknown> | null {
  const m = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const amount = Math.round(Number(m.amount) * 100) / 100;
  const description = String(m.description ?? '').trim().slice(0, 500);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000 || !description) return null;
  const date = String(m.date ?? '').slice(0, 10);
  return {
    amount,
    currency: 'ZAR',
    description,
    reference: String(m.reference ?? '').trim().slice(0, 60) || null,
    // quote: valid until · payment request: due by
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
  };
}

export async function editDirectMessage(userId: string, messageId: string, content: string) {
  await ensureMessagingSchema();
  const text = String(content ?? '').trim().slice(0, MESSAGE_MAX_CHARS);
  if (!isUuid(messageId)) return { ok: false as const, error: 'Message not found.' };
  if (!text) return { ok: false as const, error: 'A message cannot be empty. Delete it instead.' };
  // Own, not deleted, text messages only, within 24 hours — editing a quote
  // or an old message after the other side acted on it would rewrite history.
  const [row] = await db`
    UPDATE messages SET content = ${text}, is_edited = TRUE, edited_at = NOW()
    WHERE id = ${messageId} AND sender_id = ${userId} AND is_deleted = FALSE AND kind = 'text'
      AND created_at > NOW() - INTERVAL '24 hours'
    RETURNING *
  `;
  return row ? { ok: true as const, message: toChatMessage(row) } : { ok: false as const, error: 'You can edit your own messages for 24 hours.' };
}

export async function deleteDirectMessage(userId: string, messageId: string) {
  await ensureMessagingSchema();
  if (!isUuid(messageId)) return { ok: false as const, error: 'Message not found.' };
  const [row] = await db`
    UPDATE messages SET is_deleted = TRUE, deleted_at = NOW()
    WHERE id = ${messageId} AND sender_id = ${userId} AND is_deleted = FALSE
    RETURNING *
  `;
  return row ? { ok: true as const, message: toChatMessage(row) } : { ok: false as const, error: 'You can only delete your own messages.' };
}

export async function setThreadPrefs(
  userId: string,
  otherId: string,
  prefs: { isPinned?: boolean; isArchived?: boolean; category?: ThreadCategory; label?: string | null },
) {
  await ensureMessagingSchema();
  if (!isUuid(otherId) || otherId === userId) return { ok: false as const, error: 'Conversation not found.' };
  const category = prefs.category && THREAD_CATEGORIES.includes(prefs.category) ? prefs.category : null;
  const label = prefs.label === undefined ? undefined : (prefs.label ?? '').trim().slice(0, 40) || null;
  await db`
    INSERT INTO message_thread_prefs (user_id, other_user_id, is_pinned, is_archived, category, custom_label)
    VALUES (${userId}, ${otherId}, ${prefs.isPinned ?? false}, ${prefs.isArchived ?? false}, ${category ?? 'general'}, ${label ?? null})
    ON CONFLICT (user_id, other_user_id) DO UPDATE SET
      is_pinned    = COALESCE(${prefs.isPinned ?? null}::boolean, message_thread_prefs.is_pinned),
      is_archived  = COALESCE(${prefs.isArchived ?? null}::boolean, message_thread_prefs.is_archived),
      category     = COALESCE(${category}::text, message_thread_prefs.category),
      custom_label = CASE WHEN ${label === undefined} THEN message_thread_prefs.custom_label ELSE ${label ?? null} END,
      updated_at   = NOW()
  `;
  return { ok: true as const };
}

export interface CannedResponse { id: string; shortcut: string; text: string }

export async function listCannedResponses(userId: string): Promise<CannedResponse[]> {
  await ensureMessagingSchema();
  const rows = await db`SELECT id, shortcut_trigger, full_text FROM canned_responses WHERE user_id = ${userId} ORDER BY shortcut_trigger`;
  return rows.map((r) => ({ id: String(r.id), shortcut: String(r.shortcut_trigger), text: String(r.full_text) }));
}

export async function saveCannedResponse(userId: string, shortcut: string, text: string) {
  await ensureMessagingSchema();
  const key = String(shortcut ?? '').trim().toLowerCase().replace(/^\//, '').replace(/[^a-z0-9_-]/g, '').slice(0, 24);
  const body = String(text ?? '').trim().slice(0, 2000);
  if (!key || !body) return { ok: false as const, error: 'Give the reply a shortcut and some text.' };
  const [{ n }] = await db`SELECT COUNT(*)::int AS n FROM canned_responses WHERE user_id = ${userId}`;
  if (Number(n) >= 50) return { ok: false as const, error: 'You can save up to 50 replies.' };
  const [row] = await db`
    INSERT INTO canned_responses (user_id, shortcut_trigger, full_text) VALUES (${userId}, ${key}, ${body})
    ON CONFLICT (user_id, shortcut_trigger) DO UPDATE SET full_text = EXCLUDED.full_text
    RETURNING id, shortcut_trigger, full_text
  `;
  return { ok: true as const, response: { id: String(row.id), shortcut: String(row.shortcut_trigger), text: String(row.full_text) } };
}

export async function deleteCannedResponse(userId: string, id: string) {
  await ensureMessagingSchema();
  if (!isUuid(id)) return { ok: false as const };
  await db`DELETE FROM canned_responses WHERE id = ${id} AND user_id = ${userId}`;
  return { ok: true as const };
}

/** Unread total for badges. */
export async function unreadTotal(userId: string): Promise<number> {
  await ensureMessagingSchema();
  const [r] = await db`SELECT COUNT(*)::int AS n FROM messages WHERE receiver_id = ${userId} AND read = FALSE AND is_deleted = FALSE`;
  return Number(r?.n ?? 0);
}
