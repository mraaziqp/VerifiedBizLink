'use server';

import { getSession, type SessionUser } from '@/lib/auth';
import { REQUIRE_EMAIL_VERIFICATION } from '@/lib/feature-flags';
import {
  deleteCannedResponse as deleteCanned,
  deleteDirectMessage,
  editDirectMessage,
  getContactContext as loadContactContext,
  listCannedResponses as loadCanned,
  saveCannedResponse as saveCanned,
  sendDirectMessage,
  setThreadPrefs,
  type Attachment,
  type CannedResponse,
  type ChatMessage,
  type ContactContext,
  type MessageKind,
  type ThreadCategory,
} from '@/lib/messaging';

/**
 * Server actions behind the messaging hub and widget.
 *
 * Every action re-reads the session and scopes the change to that user in
 * SQL (lib/messaging), so an id sent from the browser can only ever touch
 * the caller's own messages and threads.
 *
 * Server actions post to the page, not to /api/messages, so the
 * middleware's email-verification gate does not see them — the same rule
 * is applied here instead.
 */

type Fail = { ok: false; error: string };

async function requireUser(forSending = false): Promise<SessionUser | Fail> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Please sign in again.' };
  const staff = ['admin', 'banker', 'lawyer'].includes(session.role);
  if (forSending && REQUIRE_EMAIL_VERIFICATION && !session.emailVerified && !staff) {
    return { ok: false, error: 'Please confirm your email address to send messages — check your inbox for the link.' };
  }
  return session;
}
const failed = (u: SessionUser | Fail): u is Fail => 'ok' in u;

export interface SendMessageInput {
  receiverId: string;
  content?: string;
  kind?: MessageKind;
  meta?: { amount: number; description: string; reference?: string; date?: string } | null;
  attachment?: Attachment | null;
  replyToId?: string | null;
}

export async function sendMessage(input: SendMessageInput): Promise<{ ok: true; message: ChatMessage } | Fail> {
  const user = await requireUser(true);
  if (failed(user)) return user;
  try {
    const result = await sendDirectMessage({
      senderId: user.id,
      senderName: user.fullName,
      senderEmail: user.email,
      receiverId: input.receiverId,
      content: input.content,
      kind: input.kind,
      meta: input.meta ?? null,
      attachment: input.attachment ?? null,
      replyToId: input.replyToId ?? null,
    });
    return result.ok ? { ok: true, message: result.message } : { ok: false, error: result.error };
  } catch (error) {
    console.error('sendMessage action error:', error);
    return { ok: false, error: 'Message not sent. Please try again.' };
  }
}

export async function editMessage(messageId: string, content: string): Promise<{ ok: true; message: ChatMessage } | Fail> {
  const user = await requireUser(true);
  if (failed(user)) return user;
  try {
    return await editDirectMessage(user.id, messageId, content);
  } catch (error) {
    console.error('editMessage action error:', error);
    return { ok: false, error: 'Could not edit that message.' };
  }
}

export async function deleteMessage(messageId: string): Promise<{ ok: true; message: ChatMessage } | Fail> {
  const user = await requireUser();
  if (failed(user)) return user;
  try {
    return await deleteDirectMessage(user.id, messageId);
  } catch (error) {
    console.error('deleteMessage action error:', error);
    return { ok: false, error: 'Could not delete that message.' };
  }
}

export async function togglePin(otherUserId: string, isPinned: boolean): Promise<{ ok: true } | Fail> {
  const user = await requireUser();
  if (failed(user)) return user;
  return setThreadPrefs(user.id, otherUserId, { isPinned: Boolean(isPinned) }).catch(() => ({ ok: false as const, error: 'Could not update the conversation.' }));
}

export async function toggleArchive(otherUserId: string, isArchived: boolean): Promise<{ ok: true } | Fail> {
  const user = await requireUser();
  if (failed(user)) return user;
  return setThreadPrefs(user.id, otherUserId, { isArchived: Boolean(isArchived) }).catch(() => ({ ok: false as const, error: 'Could not update the conversation.' }));
}

export async function setThreadCategory(otherUserId: string, category: ThreadCategory, label?: string | null): Promise<{ ok: true } | Fail> {
  const user = await requireUser();
  if (failed(user)) return user;
  return setThreadPrefs(user.id, otherUserId, { category, ...(label === undefined ? {} : { label }) })
    .catch(() => ({ ok: false as const, error: 'Could not update the conversation.' }));
}

export async function getContactContext(otherUserId: string): Promise<{ ok: true; context: ContactContext } | Fail> {
  const user = await requireUser();
  if (failed(user)) return user;
  try {
    const context = await loadContactContext(user.id, otherUserId);
    return context ? { ok: true, context } : { ok: false, error: 'That person could not be found.' };
  } catch (error) {
    console.error('getContactContext action error:', error);
    return { ok: false, error: 'Could not load their profile.' };
  }
}

export async function listCannedResponses(): Promise<{ ok: true; responses: CannedResponse[] } | Fail> {
  const user = await requireUser();
  if (failed(user)) return user;
  try {
    return { ok: true, responses: await loadCanned(user.id) };
  } catch {
    return { ok: false, error: 'Could not load saved replies.' };
  }
}

export async function saveCannedResponse(shortcut: string, text: string): Promise<{ ok: true; response: CannedResponse } | Fail> {
  const user = await requireUser();
  if (failed(user)) return user;
  return saveCanned(user.id, shortcut, text).catch(() => ({ ok: false as const, error: 'Could not save that reply.' }));
}

export async function deleteCannedResponse(id: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (failed(user)) return { ok: false };
  return deleteCanned(user.id, id).catch(() => ({ ok: false }));
}
