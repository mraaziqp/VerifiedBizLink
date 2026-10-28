import db from '@/lib/db';

let ready: Promise<void> | null = null;

/**
 * The storefront tables (lib/storefront): the products and specials, each
 * business's storefront design, and the templates it owns. Created on first
 * use; the check below is one cheap query once they all exist.
 */
export function ensureShowcaseSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const [state] = await db`
        SELECT (to_regclass('business_showcase_items') IS NOT NULL
            AND to_regclass('business_storefronts') IS NOT NULL
            AND to_regclass('business_storefront_templates') IS NOT NULL) AS up_to_date
      `;
      if (state?.up_to_date === true) return;

      await db`
        DO $$
        BEGIN
          CREATE TABLE IF NOT EXISTS business_showcase_items (
            id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            template            TEXT NOT NULL DEFAULT 'retail',
            title               TEXT NOT NULL,
            description         TEXT,
            price_cents         BIGINT NOT NULL DEFAULT 0,
            special_price_cents BIGINT,
            category            TEXT NOT NULL DEFAULT 'General',
            image_url           TEXT,
            is_in_stock         BOOLEAN NOT NULL DEFAULT true,
            is_featured         BOOLEAN NOT NULL DEFAULT false,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_showcase_business ON business_showcase_items (business_id);

          CREATE TABLE IF NOT EXISTS business_storefronts (
            business_id   UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
            template      TEXT NOT NULL DEFAULT 'retail',
            headline      TEXT,
            tagline       TEXT,
            accent        TEXT NOT NULL DEFAULT 'amber',
            cover_url     TEXT,
            whatsapp      TEXT,
            is_published  BOOLEAN NOT NULL DEFAULT false,
            site_url      TEXT,
            site_title    TEXT,
            site_order_id TEXT,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS business_storefront_templates (
            business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            template     TEXT NOT NULL,
            source       TEXT NOT NULL,
            payment_ref  TEXT UNIQUE,
            amount_cents BIGINT NOT NULL DEFAULT 0,
            granted_by   UUID,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (business_id, template)
          );
        END $$;
      `;
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}
