import db, { type DbRow } from '@/lib/db';
import { CANONICAL_ORIGIN } from '@/lib/site-url';
import {
  getStudioSettings,
  giveMemberCredit,
  grantMonthlyCredits,
  hub,
  saveStudioSettings,
  studioConfigured,
  type StudioItem,
} from '@/lib/studio';

/**
 * What Jarvis can see and do in VerifiedBizLink (routes under /api/jarvis).
 * Reads are summaries and recent rows, never password hashes, tokens or
 * documents. Actions are the Build Studio's: prices and discounts, member
 * credit, the monthly allowance. Every action is written to
 * platform_settings_history (or the studio's own history) with Jarvis's name.
 */

const JARVIS = { id: null, name: 'Jarvis' };
const n = (value: unknown) => Number(value ?? 0) || 0;
const safe = (query: () => Promise<DbRow[]>) => Promise.resolve().then(query).catch(() => [] as DbRow[]);

export const STATE_SECTIONS = ['summary', 'studio', 'businesses', 'payments', 'signups'] as const;
export type StateSection = (typeof STATE_SECTIONS)[number];

export async function jarvisState(include: Set<StateSection>) {
  const body: Record<string, unknown> = { app: 'VerifiedBizLink', origin: CANONICAL_ORIGIN, generatedAt: new Date().toISOString() };

  if (include.has('summary')) {
    const [users, businesses, tiers, payments] = await Promise.all([
      safe(() => db`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS week FROM users`),
      safe(() => db`
        SELECT COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'verified') AS verified,
          COUNT(*) FILTER (WHERE status IN ('pending', 'reviewing')) AS in_review,
          COUNT(*) FILTER (WHERE subscription_status = 'active' AND package_type IS NOT NULL AND package_type <> 'free') AS paying,
          COUNT(*) FILTER (WHERE subscription_status = 'renewal_overdue') AS overdue
        FROM businesses`),
      safe(() => db`
        SELECT package_type, COUNT(*) AS count FROM businesses
        WHERE subscription_status = 'active' AND package_type IS NOT NULL AND package_type <> 'free'
        GROUP BY package_type`),
      safe(() => db`
        SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '30 days'), 0) AS revenue_30d_cents,
          COUNT(*) FILTER (WHERE status = 'pending' AND created_at > NOW() - INTERVAL '2 days') AS pending_recent
        FROM payments`),
    ]);
    body.summary = {
      users: { total: n(users[0]?.total), newThisWeek: n(users[0]?.week) },
      businesses: {
        total: n(businesses[0]?.total),
        verified: n(businesses[0]?.verified),
        inReview: n(businesses[0]?.in_review),
        payingSubscribers: n(businesses[0]?.paying),
        renewalOverdue: n(businesses[0]?.overdue),
        payingByTier: Object.fromEntries(tiers.map((row) => [String(row.package_type), n(row.count)])),
      },
      revenueLast30Days: n(payments[0]?.revenue_30d_cents) / 100,
      paymentsPendingLast2Days: n(payments[0]?.pending_recent),
    };
  }

  if (include.has('studio')) {
    const settings = await getStudioSettings();
    if (!studioConfigured()) body.studio = { connected: false, settings };
    else {
      const month = new Date().toISOString().slice(0, 7);
      const [catalog, pricing, statement] = await Promise.all([
        hub<{ ordersOpen: boolean; items: StudioItem[] }>('/catalog').catch(() => null),
        hub<{ sharePct: number; pricing: Record<string, unknown>; items: StudioItem[] }>('/pricing').catch(() => null),
        hub<Record<string, unknown>>(`/statement?month=${month}`).catch(() => null),
      ]);
      body.studio = {
        connected: Boolean(catalog),
        ordersOpen: catalog?.ordersOpen ?? null,
        sharePct: pricing?.sharePct ?? null,
        pricing: pricing?.pricing ?? null,
        items: (pricing?.items ?? []).map((item) => ({ id: item.id, name: item.name, category: item.category, listPrice: item.listPrice, memberPrice: item.price, lowestAllowed: item.floor, hidden: item.hidden })),
        monthlyCredits: settings.monthlyCredits,
        thisMonth: statement,
      };
    }
  }

  if (include.has('businesses')) {
    body.businesses = await safe(() => db`
      SELECT b.id, COALESCE(b.company_name, b.name) AS name, b.industry, b.status, b.package_type, b.subscription_status, b.created_at, b.updated_at
      FROM businesses b ORDER BY b.updated_at DESC NULLS LAST LIMIT 50`);
  }

  if (include.has('payments')) {
    body.payments = (await safe(() => db`
      SELECT p.id, p.amount, p.status, p.reference, p.description, p.created_at, p.completed_at, COALESCE(b.company_name, u.full_name, u.email) AS payer
      FROM payments p LEFT JOIN users u ON u.id = p.user_id LEFT JOIN businesses b ON b.user_id = p.user_id
      ORDER BY p.created_at DESC LIMIT 50`)).map((row) => ({ ...row, amount: n(row.amount) / 100 }));
  }

  if (include.has('signups')) {
    body.signups = await safe(() => db`
      SELECT u.id, u.full_name, u.email, u.role, u.created_at, u.email_verified, COALESCE(b.company_name, b.name) AS business, b.package_type
      FROM users u LEFT JOIN businesses b ON b.user_id = u.id
      WHERE u.role NOT IN ('admin', 'banker', 'lawyer')
      ORDER BY u.created_at DESC LIMIT 30`);
  }

  return body;
}

/** What happened since a moment: sign-ups, payments and studio changes, newest first. */
export async function jarvisEvents(sinceMs: number | null, limit: number) {
  const since = new Date(sinceMs && sinceMs > 0 ? sinceMs : Date.now() - 7 * 24 * 3600 * 1000);
  const [signups, payments, studio] = await Promise.all([
    safe(() => db`
      SELECT u.id, u.full_name, u.email, u.created_at, COALESCE(b.company_name, b.name) AS business, b.package_type
      FROM users u LEFT JOIN businesses b ON b.user_id = u.id
      WHERE u.created_at > ${since} AND u.role NOT IN ('admin', 'banker', 'lawyer')
      ORDER BY u.created_at DESC LIMIT ${limit}`),
    safe(() => db`
      SELECT p.id, p.amount, p.description, p.completed_at, COALESCE(b.company_name, u.full_name, u.email) AS payer
      FROM payments p LEFT JOIN users u ON u.id = p.user_id LEFT JOIN businesses b ON b.user_id = p.user_id
      WHERE p.status = 'completed' AND p.completed_at > ${since}
      ORDER BY p.completed_at DESC LIMIT ${limit}`),
    safe(() => db`
      SELECT id, key, new_value, changed_by_name, created_at
      FROM platform_settings_history
      WHERE key LIKE 'build_studio%' AND created_at > ${since}
      ORDER BY created_at DESC LIMIT ${limit}`),
  ]);
  const events = [
    ...signups.map((row) => ({
      at: new Date(row.created_at).getTime(),
      type: 'user.signup',
      summary: `${row.full_name || row.email} signed up${row.business ? ` (${row.business}${row.package_type ? `, ${row.package_type}` : ''})` : ''}`,
      entityId: String(row.id),
    })),
    ...payments.map((row) => ({
      at: new Date(row.completed_at).getTime(),
      type: 'payment.completed',
      summary: `R${(n(row.amount) / 100).toFixed(2)} from ${row.payer ?? 'a member'}${row.description ? ` — ${row.description}` : ''}`,
      entityId: String(row.id),
    })),
    ...studio.map((row) => ({
      at: new Date(row.created_at).getTime(),
      type: row.key === 'build_studio_credit' ? 'studio.credit' : 'studio.settings',
      summary: row.key === 'build_studio_credit'
        ? `${row.changed_by_name ?? 'Someone'} changed a member's studio credit: ${JSON.stringify(row.new_value)}`
        : `${row.changed_by_name ?? 'Someone'} changed the studio's monthly credit`,
      entityId: String(row.id),
    })),
  ];
  return events.sort((a, b) => b.at - a.at).slice(0, limit);
}

/* ─── actions ─── */

type Payload = Record<string, unknown>;

export const JARVIS_ACTIONS: Record<string, { description: string; payload: string; run: (p: Payload) => Promise<{ result: unknown; summary: string }> }> = {
  'studio.set_pricing': {
    description:
      'Change Build Studio member prices: a % off everything, a % off per plan, or per item a fixed price, a % off, or hidden. Discounts come out of VerifiedBizLink’s 20% share, so nothing can go below list less 20%; the studio refuses with the reason. Only what you send changes.',
    payload: 'defaultDiscountPct (0-20), tierDiscountPct ({ standard: 10, premium: 15 }), items ({ "<item id>": { price | discountPct | hidden } }; null removes an item rule)',
    run: async (p) => {
      const current = await hub<{ pricing: { defaultDiscountPct: number; tierDiscountPct: Record<string, number>; items: Record<string, unknown> } }>('/pricing');
      const items = { ...current.pricing.items };
      for (const [id, rule] of Object.entries((p.items ?? {}) as Record<string, unknown>)) {
        if (rule === null) delete items[id];
        else items[id] = rule;
      }
      const next = {
        defaultDiscountPct: p.defaultDiscountPct ?? current.pricing.defaultDiscountPct,
        tierDiscountPct: { ...current.pricing.tierDiscountPct, ...((p.tierDiscountPct ?? {}) as Record<string, number>) },
        items,
      };
      const saved = await hub<{ pricing: unknown }>('/pricing', { method: 'PUT', body: { pricing: next, by: 'Jarvis' } });
      return { result: saved.pricing, summary: 'Build Studio prices updated' };
    },
  },
  'studio.set_monthly_credits': {
    description: 'Set the Build Studio credit each paid plan gets every month (in Rand). Paid for out of VerifiedBizLink’s share when spent.',
    payload: 'verified, standard, premium, enterprise (Rand each; only what you send changes)',
    run: async (p) => {
      const current = await getStudioSettings();
      const monthlyCredits = { ...current.monthlyCredits };
      for (const [tier, value] of Object.entries(p)) if (typeof value === 'number' || typeof value === 'string') monthlyCredits[tier] = Number(value);
      const saved = await saveStudioSettings({ monthlyCredits }, JARVIS);
      return { result: saved, summary: `Monthly studio credit: ${Object.entries(saved.monthlyCredits).map(([t, v]) => `${t} R${v}`).join(', ')}` };
    },
  },
  'studio.give_credit': {
    description: 'Give a member Build Studio credit (a promotion, an apology, a free build), or take it back with a negative amount.',
    payload: 'email (required), amount (Rand, required), note (the member sees it)',
    run: async (p) => {
      const result = await giveMemberCredit({ email: String(p.email ?? ''), amount: Number(p.amount), note: typeof p.note === 'string' ? p.note : '', by: JARVIS });
      return { result, summary: `${result.amount > 0 ? 'Gave' : 'Took back'} R${Math.abs(result.amount)} studio credit ${result.amount > 0 ? 'to' : 'from'} ${result.name}; they now have R${result.credits.total}` };
    },
  },
  'studio.run_allowances': {
    description: 'Give this month’s Build Studio credit to every active subscriber now (each member gets it once a month, so repeating is safe).',
    payload: '(none)',
    run: async () => {
      const result = await grantMonthlyCredits();
      return { result, summary: `Monthly allowance ${result.month}: ${result.granted} given, ${result.skipped} already had it, ${result.failed} failed` };
    },
  },
};

export async function runJarvisAction(action: string, payload: Payload) {
  const handler = JARVIS_ACTIONS[action];
  if (!handler) return { ok: false, action, error: `Unknown action "${action}". See /api/jarvis/schema.` };
  try {
    const { result, summary } = await handler.run(payload ?? {});
    return { ok: true, action, result, summary };
  } catch (error) {
    return { ok: false, action, error: error instanceof Error ? error.message : 'That did not work.' };
  }
}
