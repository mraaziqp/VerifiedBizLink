import db from '@/lib/db';

/**
 * Editable platform settings.
 *
 * Operational numbers — what a marketer earns, what the sales targets are —
 * change with the business, not with the code. Keeping them in the database
 * means changing one does not need a developer, a deploy, or a rebuild.
 *
 * Every read falls back to a hardcoded default, so a missing row or an
 * unreachable settings table degrades to the documented behaviour rather
 * than paying somebody zero.
 */

export interface Milestone {
  sales: number;
  name: string;
  reward: string;
}

export interface CommissionSettings {
  /** 0–1. 0.5 means half of the qualifying payment. */
  defaultRate: number;
  /** Which payment commission is earned on. */
  basis: 'first_payment' | 'every_payment';
  milestones: Milestone[];
}

export const COMMISSION_DEFAULTS: CommissionSettings = {
  defaultRate: 0.5,
  basis: 'first_payment',
  milestones: [
    { sales: 5, name: 'Bronze', reward: 'Free lunch' },
    { sales: 20, name: 'Silver', reward: 'Half-day off' },
    { sales: 25, name: 'Gold', reward: 'Bonus payout' },
  ],
};

type Row = Record<string, unknown>;

/** Clamps and sanitises whatever is stored, so bad data can never pay out wrongly. */
export function normaliseCommissionSettings(raw: unknown): CommissionSettings {
  const value = (raw ?? {}) as Partial<CommissionSettings>;

  const rate = Number(value.defaultRate);
  const defaultRate =
    Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : COMMISSION_DEFAULTS.defaultRate;

  const basis = value.basis === 'every_payment' ? 'every_payment' : 'first_payment';

  const milestones = Array.isArray(value.milestones)
    ? value.milestones
        .map((m) => ({
          sales: Math.max(1, Math.floor(Number(m?.sales) || 0)),
          name: String(m?.name ?? '').slice(0, 40) || 'Target',
          reward: String(m?.reward ?? '').slice(0, 120),
        }))
        .filter((m) => m.sales > 0)
        .sort((a, b) => a.sales - b.sales)
    : COMMISSION_DEFAULTS.milestones;

  return {
    defaultRate,
    basis,
    milestones: milestones.length ? milestones : COMMISSION_DEFAULTS.milestones,
  };
}

export async function getCommissionSettings(): Promise<CommissionSettings> {
  try {
    const rows = (await db`
      SELECT value FROM platform_settings WHERE key = 'commission' LIMIT 1
    `) as unknown as Row[];
    if (rows.length === 0) return COMMISSION_DEFAULTS;
    return normaliseCommissionSettings(rows[0].value);
  } catch (error) {
    console.error('Falling back to default commission settings:', error);
    return COMMISSION_DEFAULTS;
  }
}

/**
 * Writes settings and records who changed them.
 *
 * The previous value is captured in the same call, so the history is a
 * complete before/after trail rather than a list of new values with no
 * context.
 */
export async function saveCommissionSettings(
  next: CommissionSettings,
  actor: { id: string; name: string },
): Promise<CommissionSettings> {
  const clean = normaliseCommissionSettings(next);

  const previous = (await db`
    SELECT value FROM platform_settings WHERE key = 'commission' LIMIT 1
  `.catch(() => [])) as unknown as Row[];

  await db`
    INSERT INTO platform_settings (key, value, updated_at, updated_by, updated_by_name)
    VALUES ('commission', ${JSON.stringify(clean)}::jsonb, NOW(), ${actor.id}, ${actor.name})
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by,
          updated_by_name = EXCLUDED.updated_by_name
  `;

  await db`
    INSERT INTO platform_settings_history (key, old_value, new_value, changed_by, changed_by_name)
    VALUES (
      'commission',
      ${previous.length ? JSON.stringify(previous[0].value) : null}::jsonb,
      ${JSON.stringify(clean)}::jsonb,
      ${actor.id}, ${actor.name}
    )
  `.catch((e) => console.error('Settings history write failed:', e));

  return clean;
}

export interface SettingsChange {
  id: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy: string;
  createdAt: string;
}

export async function getCommissionHistory(limit = 20): Promise<SettingsChange[]> {
  const rows = (await db`
    SELECT id, old_value, new_value, changed_by_name, created_at
    FROM platform_settings_history
    WHERE key = 'commission'
    ORDER BY created_at DESC
    LIMIT ${limit}
  `.catch(() => [])) as unknown as Row[];

  return rows.map((r) => ({
    id: String(r.id),
    oldValue: r.old_value,
    newValue: r.new_value,
    changedBy: String(r.changed_by_name || 'Unknown'),
    createdAt: String(r.created_at),
  }));
}
