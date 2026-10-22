import db from '@/lib/db';

let ready: Promise<void> | null = null;

export function ensureShowcaseSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const [state] = await db`
        SELECT (to_regclass('business_showcase_items') IS NOT NULL) AS up_to_date
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
        END $$;
      `;
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}
