import { useEffect, useState } from 'react';

/** Only these roles can own a business profile; nobody else has one to check. */
const BUSINESS_ROLES = ['business', 'admin', 'banker', 'lawyer'];

/**
 * One lookup per person, shared by everything on the page that needs it.
 *
 * The desktop sidebar and the slide-out menu each asked /api/business/profile
 * "is this business verified?" for themselves, and both are mounted at once
 * (CSS shows one), so every page that had a sidebar made the same request
 * twice. Shared for a minute — long enough to cover a page, short enough that
 * a business verified a moment ago sees its badge without signing out. A
 * failed lookup is not remembered.
 */
let shared: { userId: string; at: number; promise: Promise<boolean> } | null = null;

function load(userId: string): Promise<boolean> {
  if (shared && shared.userId === userId && Date.now() - shared.at < 60_000) return shared.promise;
  const promise = fetch('/api/business/profile')
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => d?.business?.status === 'verified')
    .catch(() => {
      shared = null;
      return false;
    });
  shared = { userId, at: Date.now(), promise };
  return promise;
}

/**
 * Whether the signed-in person's business is verified.
 *
 * `checked` is false while the answer is on its way, so a caller can tell
 * "not verified" from "not known yet". For someone who cannot own a business
 * there is nothing to load: `verified` is false and `checked` stays false.
 */
export function useBusinessVerified(user: { id: string; role: string } | null | undefined): {
  verified: boolean;
  checked: boolean;
} {
  const userId = user && BUSINESS_ROLES.includes(user.role) ? user.id : null;
  const [answer, setAnswer] = useState<{ userId: string; verified: boolean } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void load(userId).then((verified) => {
      if (active) setAnswer({ userId, verified });
    });
    return () => { active = false; };
  }, [userId]);

  // An answer for a previous account (sign out, sign in as someone else) is ignored.
  const current = answer && answer.userId === userId ? answer : null;
  return { verified: current?.verified ?? false, checked: current !== null };
}
