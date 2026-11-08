import db, { type Sql } from '@/lib/db';

export interface PosAuditEntry {
  businessId: string | null;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  detail?: Record<string, unknown> | null;
}

/**
 * Writes a POS audit record. Pass a transaction handle to make the record
 * part of the change it describes (it then commits or rolls back with it).
 * Outside a transaction it never throws: failing to log must not fail the
 * request, but it is reported loudly.
 */
export async function logPosAudit(entry: PosAuditEntry, sql: Sql = db): Promise<void> {
  const write = sql`
    INSERT INTO pos_audit_logs (business_id, actor_user_id, actor_role, action, target_type, target_id, detail)
    VALUES (${entry.businessId}, ${entry.actorUserId}, ${entry.actorRole}, ${entry.action},
            ${entry.targetType ?? null}, ${entry.targetId ?? null}, ${entry.detail ? JSON.stringify(entry.detail) : null})
  `;
  if (sql !== db) {
    await write;
    return;
  }
  await write.catch((err) => console.error('[pos] audit log write failed:', entry.action, err?.message));
}
