import db from "@/lib/db";

export async function migrateDocuments() {
  try {
    await db`
      ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS approved_by UUID,
      ADD COLUMN IF NOT EXISTS review_notes TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ
    `;
    console.log("Migration successful");
  } catch (error) {
    console.error("Migration error:", error);
  }
}
