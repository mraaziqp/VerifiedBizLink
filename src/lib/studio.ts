import db, { type DbRow } from '@/lib/db';
import type { SessionUser } from '@/lib/auth';

/**
 * Build Studio: ARP Cloud Solutions' websites, apps and games, offered to
 * VerifiedBizLink's paying subscribers inside VerifiedBizLink.
 *
 * ARP's hub is the seller: it holds the catalogue, takes the payments (its
 * PayFast), builds through Agent Builder and delivers. This app is the
 * storefront and the subscriber's view of their projects. It talks to the hub
 * only from the server, with VerifiedBizLink's partner key (HUB_PARTNER_KEY),
 * which never reaches a browser.
 *
 * The deal: of each sale at list price, 80% is ARP's and 20% VerifiedBizLink's.
 * VerifiedBizLink sets its own subscriber prices and discounts, out of its 20%
 * (the hub refuses anything deeper), and can give subscribers credit, which is
 * also paid for out of its share. The hub keeps the ledger; the earnings are
 * in Admin -> Build Studio.
 *
 *   HUB_URL           default https://arpcloudsolutions.co.za
 *   HUB_PARTNER_KEY   VerifiedBizLink's key, from the hub's Admin -> Partners
 */

/** A read that never throws (the db helper can throw before it returns a promise). */
const read = (query: () => Promise<DbRow[]>): Promise<DbRow[]> => Promise.resolve().then(query).catch(() => []);

const HUB_URL = () => (process.env.HUB_URL?.trim() || 'https://arpcloudsolutions.co.za').replace(/\/+$/, '');
const HUB_KEY = () => process.env.HUB_PARTNER_KEY?.trim() || '';

export function studioConfigured(): boolean {
  return Boolean(HUB_KEY());
}

export class StudioError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

/** One call to the hub's partner API. Throws StudioError with the hub's own message. */
export async function hub<T>(path: string, init: { method?: string; body?: unknown; timeoutMs?: number } = {}): Promise<T> {
  if (!studioConfigured()) throw new StudioError('Build Studio is being connected. Please check back shortly.', 503);
  let res: Response;
  try {
    res = await fetch(`${HUB_URL()}/api/partner${path}`, {
      method: init.method ?? 'GET',
      headers: { Authorization: `Bearer ${HUB_KEY()}`, ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(init.timeoutMs ?? 20_000),
    });
  } catch {
    throw new StudioError('The studio could not be reached just now. Please try again in a moment.', 504);
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new StudioError(typeof data.error === 'string' ? data.error : `The studio answered ${res.status}.`, res.status === 401 ? 503 : res.status);
  return data as T;
}

/* ─── access ─── */

/** The paid tiers that unlock the studio (anything but the free profile). */
const PAID_STATUSES = ['active', 'renewal_overdue'];

export interface StudioAccess {
  allowed: boolean;
  /** The subscriber's tier key ("verified", "standard", "premium", "enterprise"), for their price. */
  tier: string | null;
  businessName: string | null;
  businessPhone: string | null;
  /** Why not, for the upgrade prompt. */
  reason: 'signed_out' | 'no_business' | 'not_subscribed' | null;
  /** Staff can always look (and test), whatever their own business. */
  staff: boolean;
}

export async function studioAccess(session: SessionUser | null): Promise<StudioAccess> {
  if (!session) return { allowed: false, tier: null, businessName: null, businessPhone: null, reason: 'signed_out', staff: false };
  const staff = ['admin', 'banker', 'lawyer'].includes(session.role);
  const [business] = await read(() => db`
    SELECT COALESCE(company_name, name) AS business_name, phone, package_type, subscription_status
    FROM businesses WHERE user_id = ${session.id}
    ORDER BY updated_at DESC NULLS LAST LIMIT 1
  `);
  const tier = business && business.package_type && business.package_type !== 'free' ? String(business.package_type) : null;
  const subscribed = Boolean(tier && PAID_STATUSES.includes(String(business?.subscription_status ?? '')));
  return {
    allowed: subscribed || staff,
    tier: subscribed ? tier : staff ? tier ?? 'premium' : null,
    businessName: business?.business_name ? String(business.business_name) : null,
    businessPhone: business?.phone ? String(business.phone) : null,
    reason: subscribed || staff ? null : business ? 'not_subscribed' : 'no_business',
    staff,
  };
}

/** Links the subscriber to their account at the hub (safe on every visit). */
export async function linkCustomer(session: SessionUser, access: StudioAccess) {
  return hub<{ customerId: string; credits: StudioCredits }>('/customers', {
    method: 'POST',
    body: { externalId: session.id, email: session.email, name: session.fullName || access.businessName || session.email, phone: access.businessPhone ?? '' },
  });
}

/* ─── settings: monthly credit for subscribers ─── */

export interface StudioSettings {
  /** Rand of studio credit each paid tier gets every month (paid for out of VerifiedBizLink's share). */
  monthlyCredits: Record<string, number>;
}

export const STUDIO_DEFAULTS: StudioSettings = { monthlyCredits: { verified: 0, standard: 0, premium: 0, enterprise: 0 } };

export function normaliseStudioSettings(raw: unknown): StudioSettings {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const credits = (value.monthlyCredits && typeof value.monthlyCredits === 'object' ? value.monthlyCredits : {}) as Record<string, unknown>;
  const monthlyCredits: Record<string, number> = { ...STUDIO_DEFAULTS.monthlyCredits };
  for (const [tier, amount] of Object.entries(credits)) {
    if (!/^[a-z0-9_]{1,30}$/.test(tier)) continue;
    const n = Math.round(Number(amount));
    monthlyCredits[tier] = Number.isFinite(n) ? Math.min(20_000, Math.max(0, n)) : 0;
  }
  return { monthlyCredits };
}

export async function getStudioSettings(): Promise<StudioSettings> {
  const rows = await read(() => db`SELECT value FROM platform_settings WHERE key = 'build_studio' LIMIT 1`);
  return rows.length ? normaliseStudioSettings(rows[0].value) : STUDIO_DEFAULTS;
}

export async function saveStudioSettings(next: unknown, actor: { id: string | null; name: string }): Promise<StudioSettings> {
  const clean = normaliseStudioSettings(next);
  const previous = await read(() => db`SELECT value FROM platform_settings WHERE key = 'build_studio' LIMIT 1`);
  await db`
    INSERT INTO platform_settings (key, value, updated_at, updated_by, updated_by_name)
    VALUES ('build_studio', ${JSON.stringify(clean)}::jsonb, NOW(), ${actor.id}, ${actor.name})
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by, updated_by_name = EXCLUDED.updated_by_name
  `;
  await db`
    INSERT INTO platform_settings_history (key, old_value, new_value, changed_by, changed_by_name)
    VALUES ('build_studio', ${previous.length ? JSON.stringify(previous[0].value) : null}::jsonb, ${JSON.stringify(clean)}::jsonb, ${actor.id}, ${actor.name})
  `.catch(() => undefined);
  return clean;
}

/**
 * This month's credit for every active subscriber, at their tier's amount.
 * Each grant carries the month as its key, so running this again (the daily
 * job, or the admin's button) gives nobody a second allowance.
 */
export async function grantMonthlyCredits(now = new Date()): Promise<{ granted: number; skipped: number; failed: number; month: string }> {
  const month = now.toISOString().slice(0, 7);
  const { monthlyCredits } = await getStudioSettings();
  const tiersWithCredit = Object.entries(monthlyCredits).filter(([, amount]) => amount > 0).map(([tier]) => tier);
  if (!tiersWithCredit.length || !studioConfigured()) return { granted: 0, skipped: 0, failed: 0, month };
  const rows = await db`
    SELECT b.user_id, COALESCE(b.company_name, b.name) AS business_name, b.phone, b.package_type, u.email, u.full_name
    FROM businesses b JOIN users u ON u.id = b.user_id
    WHERE b.subscription_status = 'active' AND b.package_type = ANY(${tiersWithCredit})
  `;
  let granted = 0;
  let skipped = 0;
  let failed = 0;
  for (const row of rows) {
    const amount = monthlyCredits[String(row.package_type)] ?? 0;
    try {
      await hub('/customers', { method: 'POST', body: { externalId: String(row.user_id), email: String(row.email), name: String(row.full_name || row.business_name || row.email), phone: String(row.phone ?? '') } });
      const result = await hub<{ applied: boolean }>(`/customers/${encodeURIComponent(String(row.user_id))}/credits`, {
        method: 'POST',
        body: { amount, note: `${month} Build Studio credit (${row.package_type} plan)`, grantKey: `monthly-${month}` },
      });
      if (result.applied) granted += 1;
      else skipped += 1;
    } catch (error) {
      failed += 1;
      console.error('Monthly studio credit not granted', row.user_id, error);
    }
  }
  return { granted, skipped, failed, month };
}

/* ─── shapes from the hub ─── */

export interface StudioCredits {
  total: number;
  fromPartner: number;
  fromStudio: number;
  unlimited: boolean;
}

export interface StudioItem {
  id: string;
  name: string;
  kind: 'website' | 'app' | 'template';
  category: string;
  summary: string;
  features: string[];
  timeframe: string | null;
  previewUrl: string | null;
  coverUrl: string | null;
  listPrice: number;
  price: number;
  discountPct: number;
  floor: number;
  hidden: boolean;
}

export type OrderStage = 'awaiting_payment' | 'paid' | 'building' | 'ready' | 'delivered' | 'cancelled';

export interface StudioOrder {
  id: string;
  itemId: string;
  itemName: string;
  businessName: string;
  brief: string;
  amount: number;
  listPrice: number;
  creditUsed: number;
  createdAt: number;
  paidAt: number | null;
  stage: OrderStage;
  progress: number;
  payUrl: string | null;
  previewUrl: string | null;
  orderRef: string | null;
  latestNote: string | null;
  activity: Array<{ at: string; text: string }>;
  messages: Array<{ at: number; from: 'customer' | 'studio'; text: string }>;
  receipts: Array<{ id: string; receiptNumber: string; amount: number; currency: string; paidAt: number; method: string }>;
  test: boolean;
  paidWithCredits: boolean;
  canEdit: boolean;
  edits: Array<{ id: string; at: number; status: 'pending' | 'applying' | 'done' | 'failed'; summary: string; message: string | null }>;
}

/* ─── one member's credit, by email (admin page and Jarvis) ─── */

export async function giveMemberCredit(input: { email: string; amount: number; note?: string; by: { id: string | null; name: string } }) {
  const email = input.email.trim().toLowerCase();
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!email) throw new StudioError('Enter the member’s email.', 400);
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 50_000) {
    throw new StudioError('Enter an amount between R1 and R50,000 (negative to take credit back).', 400);
  }
  const [user] = await db`
    SELECT u.id, u.email, u.full_name, COALESCE(b.company_name, b.name) AS business_name, b.phone
    FROM users u LEFT JOIN businesses b ON b.user_id = u.id
    WHERE LOWER(u.email) = ${email}
    ORDER BY b.updated_at DESC NULLS LAST LIMIT 1
  `;
  if (!user) throw new StudioError('No VerifiedBizLink account has that email.', 404);
  const name = String(user.full_name || user.business_name || user.email);
  await hub('/customers', { method: 'POST', body: { externalId: String(user.id), email: String(user.email), name, phone: String(user.phone ?? '') } });
  const note = (input.note ?? '').trim().slice(0, 200) || (amount > 0 ? 'Credit from VerifiedBizLink' : 'Credit taken back by VerifiedBizLink');
  const result = await hub<{ applied: boolean; credits: StudioCredits }>(`/customers/${encodeURIComponent(String(user.id))}/credits`, {
    method: 'POST',
    body: { amount, note: `${note} (by ${input.by.name})` },
  });
  await read(() => db`
    INSERT INTO platform_settings_history (key, old_value, new_value, changed_by, changed_by_name)
    VALUES ('build_studio_credit', NULL, ${JSON.stringify({ email, amount, note })}::jsonb, ${input.by.id}, ${input.by.name})
  `);
  return { name, email, amount, credits: result.credits };
}
