import { redirect } from 'next/navigation';

/**
 * The old messages page. Everything moved to the hub at /dashboard/messages;
 * this keeps old links, bookmarks and notification emails working
 * (including ?with=<userId>).
 */
export default async function LegacyMessagesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const withId = typeof sp.with === 'string' ? sp.with : null;
  redirect(withId ? `/dashboard/messages?with=${encodeURIComponent(withId)}` : '/dashboard/messages');
}
