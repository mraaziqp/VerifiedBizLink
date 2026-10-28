import db from '@/lib/db';
import type { SessionUser } from '@/lib/auth';
import { hasUnlimitedAdCredits } from '@/lib/ad-credits';
import { isStaffRole } from '@/lib/roles';
import { ensureShowcaseSchema } from '@/lib/showcase-schema';
import { BUILTIN_STUDIO_ITEMS, getStudioSettings, studioAccess } from '@/lib/studio';

/**
 * Storefronts: a business's own products-and-specials page, hosted on
 * VerifiedBizLink at /business/:id/specials and linked from its profile.
 *
 * A business buys a storefront template (one of four layouts) once, in Build
 * Studio, then fills it in itself: products, prices, specials, its headline,
 * colour and cover. It goes live when the owner publishes it. A website built
 * by the studio (an order at ARP's hub) can be shown on the profile too.
 *
 * While Build Studio is not live, all of it is staff-only: visitors and
 * members see nothing, and staff can set it up and test it end to end.
 * VerifiedBizLink's own accounts (the same ones with unlimited ad credits)
 * get every template without paying.
 */

export const STOREFRONT_TEMPLATES = ['retail', 'food', 'services', 'deals'] as const;
export type StorefrontTemplate = (typeof STOREFRONT_TEMPLATES)[number];

export const STOREFRONT_ACCENTS = ['amber', 'emerald', 'sky', 'rose', 'violet', 'slate'] as const;
export type StorefrontAccent = (typeof STOREFRONT_ACCENTS)[number];

export interface TemplateInfo {
  id: StorefrontTemplate;
  /** The matching Build Studio catalogue item. */
  itemId: string;
  label: string;
  summary: string;
  listPrice: number;
  /** For members on a paid plan. */
  memberPrice: number;
}

const ITEM_FOR: Record<StorefrontTemplate, string> = {
  retail: 'vbl-showcase-retail',
  food: 'vbl-showcase-food',
  services: 'vbl-showcase-services',
  deals: 'vbl-showcase-deals',
};

const LABELS: Record<StorefrontTemplate, string> = {
  retail: 'Product Catalogue',
  food: 'Restaurant Menu',
  services: 'Service Packages',
  deals: 'Flash Deals',
};

export const TEMPLATE_INFO: TemplateInfo[] = STOREFRONT_TEMPLATES.map((id) => {
  const item = BUILTIN_STUDIO_ITEMS.find((candidate) => candidate.id === ITEM_FOR[id]);
  return {
    id,
    itemId: ITEM_FOR[id],
    label: LABELS[id],
    summary: item?.summary ?? '',
    listPrice: item?.listPrice ?? 0,
    memberPrice: item?.price ?? item?.listPrice ?? 0,
  };
});

export function isStorefrontTemplate(value: unknown): value is StorefrontTemplate {
  return typeof value === 'string' && (STOREFRONT_TEMPLATES as readonly string[]).includes(value);
}

export function templateFromItemId(itemId: unknown): StorefrontTemplate | null {
  return TEMPLATE_INFO.find((t) => t.itemId === itemId)?.id ?? null;
}

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Who can see storefronts at all: everyone once Build Studio is live, staff before that. */
export async function storefrontsVisibleTo(session: SessionUser | null): Promise<boolean> {
  if (session && isStaffRole(session.role)) return true;
  const settings = await getStudioSettings();
  return settings.isLive;
}

export interface Storefront {
  businessId: string;
  template: StorefrontTemplate;
  headline: string | null;
  tagline: string | null;
  accent: StorefrontAccent;
  coverUrl: string | null;
  whatsapp: string | null;
  published: boolean;
  siteUrl: string | null;
  siteTitle: string | null;
  siteOrderId: string | null;
  owned: StorefrontTemplate[];
}

export async function getStorefront(businessId: string): Promise<Storefront> {
  await ensureShowcaseSchema();
  const [row] = await db`SELECT * FROM business_storefronts WHERE business_id = ${businessId}::uuid LIMIT 1`;
  const owned = (await db`
    SELECT template FROM business_storefront_templates WHERE business_id = ${businessId}::uuid ORDER BY created_at
  `)
    .map((r) => r.template)
    .filter(isStorefrontTemplate);
  const template = isStorefrontTemplate(row?.template) ? row.template : owned[0] ?? 'retail';
  return {
    businessId,
    template,
    headline: row?.headline ?? null,
    tagline: row?.tagline ?? null,
    accent: (STOREFRONT_ACCENTS as readonly string[]).includes(row?.accent) ? row.accent : 'amber',
    coverUrl: row?.cover_url ?? null,
    whatsapp: row?.whatsapp ?? null,
    published: row?.is_published === true && owned.length > 0,
    siteUrl: row?.site_url ?? null,
    siteTitle: row?.site_title ?? null,
    siteOrderId: row?.site_order_id ?? null,
    owned,
  };
}

/**
 * VerifiedBizLink's own businesses, which get templates without paying: the
 * same accounts that have unlimited ad credits (staff-owned, the official
 * account, or switched on by staff).
 */
export async function isHouseBusiness(businessId: string): Promise<boolean> {
  return hasUnlimitedAdCredits(businessId).catch(() => false);
}

/** What this person pays for a template: nothing for staff and house businesses, the member price on a paid plan, else the list price. */
export async function priceFor(template: StorefrontTemplate, session: SessionUser, businessId: string): Promise<number> {
  const info = TEMPLATE_INFO.find((t) => t.id === template)!;
  if (isStaffRole(session.role) || (await isHouseBusiness(businessId))) return 0;
  const access = await studioAccess(session);
  return access.allowed && access.tier ? info.memberPrice : info.listPrice;
}

/**
 * Gives a business a template. Idempotent: the same payment reference or the
 * same template twice changes nothing. The first template a business gets
 * becomes its layout.
 */
export async function grantTemplate(input: {
  businessId: string;
  template: StorefrontTemplate;
  source: 'purchase' | 'complimentary' | 'granted';
  paymentRef?: string | null;
  amountCents?: number;
  grantedBy?: string | null;
}): Promise<{ granted: boolean }> {
  await ensureShowcaseSchema();
  const rows = await db`
    INSERT INTO business_storefront_templates (business_id, template, source, payment_ref, amount_cents, granted_by)
    VALUES (${input.businessId}::uuid, ${input.template}, ${input.source}, ${input.paymentRef ?? null}, ${input.amountCents ?? 0}, ${input.grantedBy ?? null})
    ON CONFLICT DO NOTHING
    RETURNING template
  `;
  await db`
    INSERT INTO business_storefronts (business_id, template)
    VALUES (${input.businessId}::uuid, ${input.template})
    ON CONFLICT (business_id) DO NOTHING
  `;
  return { granted: rows.length > 0 };
}

const clean = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.trim().slice(0, max);
  return text || null;
};

/** An https address, or null. */
export function cleanUrl(value: unknown): string | null {
  const text = clean(value, 2000);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Largest inline image kept (the uploader shrinks photos to 1600px first, a few hundred KB). */
const MAX_DATA_IMAGE_CHARS = 3_000_000;

/**
 * An image as /api/media/upload returns it: an https address, or, when cloud
 * storage is not configured, an inline data: image.
 */
export function cleanImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(text)) {
    return text.length <= MAX_DATA_IMAGE_CHARS ? text : null;
  }
  return cleanUrl(text);
}

/** A phone number for WhatsApp: digits only, South African numbers in international form. */
export function cleanWhatsapp(value: unknown): string | null {
  const digits = typeof value === 'string' ? value.replace(/[^0-9]/g, '') : '';
  if (digits.length < 9 || digits.length > 15) return null;
  return digits.startsWith('0') ? `27${digits.slice(1)}` : digits;
}

export class StorefrontError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Saves the owner's design. The layout must be one the business owns; publishing needs one. */
export async function saveStorefront(businessId: string, patch: Record<string, unknown>): Promise<Storefront> {
  const current = await getStorefront(businessId);
  if (current.owned.length === 0) throw new StorefrontError('Choose a storefront template first.', 402);
  const template = patch.template === undefined ? current.template : patch.template;
  if (!isStorefrontTemplate(template) || !current.owned.includes(template)) {
    throw new StorefrontError('That layout is not one of your templates yet. Get it in Build Studio first.', 402);
  }
  const accent = patch.accent === undefined ? current.accent : patch.accent;
  if (!(STOREFRONT_ACCENTS as readonly string[]).includes(accent as string)) throw new StorefrontError('Choose one of the colours offered.');
  const coverUrl = patch.coverUrl === undefined ? current.coverUrl : patch.coverUrl === null || patch.coverUrl === '' ? null : cleanImageUrl(patch.coverUrl);
  if (patch.coverUrl && !coverUrl) throw new StorefrontError('The cover image could not be used. Upload it again.');
  const whatsapp = patch.whatsapp === undefined ? current.whatsapp : patch.whatsapp === '' || patch.whatsapp === null ? null : cleanWhatsapp(patch.whatsapp);
  if (patch.whatsapp && !whatsapp) throw new StorefrontError('Enter the WhatsApp number with its area code, e.g. 082 123 4567.');

  await db`
    INSERT INTO business_storefronts (business_id, template, headline, tagline, accent, cover_url, whatsapp, is_published, updated_at)
    VALUES (
      ${businessId}::uuid, ${template},
      ${patch.headline === undefined ? current.headline : clean(patch.headline, 80)},
      ${patch.tagline === undefined ? current.tagline : clean(patch.tagline, 240)},
      ${accent as string}, ${coverUrl}, ${whatsapp},
      ${patch.published === undefined ? current.published : patch.published === true},
      NOW()
    )
    ON CONFLICT (business_id) DO UPDATE SET
      template = EXCLUDED.template, headline = EXCLUDED.headline, tagline = EXCLUDED.tagline,
      accent = EXCLUDED.accent, cover_url = EXCLUDED.cover_url, whatsapp = EXCLUDED.whatsapp,
      is_published = EXCLUDED.is_published, updated_at = NOW()
  `;
  return getStorefront(businessId);
}

/** Shows (or, with null, stops showing) a studio-built website on the business's profile. */
export async function setStudioSite(businessId: string, site: { url: string; title: string; orderId: string } | null): Promise<Storefront> {
  await ensureShowcaseSchema();
  await db`
    INSERT INTO business_storefronts (business_id, site_url, site_title, site_order_id, updated_at)
    VALUES (${businessId}::uuid, ${site?.url ?? null}, ${site?.title ?? null}, ${site?.orderId ?? null}, NOW())
    ON CONFLICT (business_id) DO UPDATE SET
      site_url = EXCLUDED.site_url, site_title = EXCLUDED.site_title, site_order_id = EXCLUDED.site_order_id, updated_at = NOW()
  `;
  return getStorefront(businessId);
}

/** The business a signed-in owner (or staff, naming one) is managing; null when they may not. */
export async function managedBusiness(session: SessionUser, businessId?: unknown): Promise<{ id: string; userId: string } | null> {
  const id = typeof businessId === 'string' && UUID_REGEX.test(businessId) ? businessId : null;
  const [biz] = id
    ? await db`SELECT id, user_id FROM businesses WHERE id = ${id}::uuid LIMIT 1`
    : await db`SELECT id, user_id FROM businesses WHERE user_id = ${session.id} ORDER BY updated_at DESC NULLS LAST LIMIT 1`;
  if (!biz) return null;
  if (String(biz.user_id) !== session.id && !isStaffRole(session.role)) return null;
  return { id: String(biz.id), userId: String(biz.user_id) };
}
