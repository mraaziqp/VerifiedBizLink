import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isStaff } from '@/lib/roles';
import { getAdminMerchants, getAdminStatements, getAdminCharges, getAdminAuditLog } from '@/lib/pos/pos-admin';
import { csvResponse } from '@/lib/pos/csv';
import { posErrorResponse } from '@/lib/pos/errors';
import { logPosAudit } from '@/lib/pos/audit';

const isDate = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

/** GET /api/admin/pos/export?type=merchants|statements|charges|audit[&from&to] */
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session || !isStaff(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const sp = req.nextUrl.searchParams;
    const type = sp.get('type') || 'charges';
    let rows;
    if (type === 'merchants') rows = await getAdminMerchants();
    else if (type === 'statements') rows = await getAdminStatements(sp.get('status') || undefined);
    else if (type === 'charges') rows = await getAdminCharges(isDate(sp.get('from')), isDate(sp.get('to')));
    else if (type === 'audit') rows = await getAdminAuditLog(1000);
    else return NextResponse.json({ error: 'Unknown export type' }, { status: 400 });
    await logPosAudit({ businessId: null, actorUserId: session.id, actorRole: `platform:${session.role}`, action: 'admin_export', targetType: 'export', targetId: type, detail: { rows: rows.length } });
    return csvResponse(`vbl-pos-admin-${type}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  } catch (err) {
    return posErrorResponse(err);
  }
}
