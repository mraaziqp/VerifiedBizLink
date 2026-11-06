import { NextRequest, NextResponse } from 'next/server';
import { getPosAuth } from '@/lib/pos/auth-helper';
import { getPosStaff, assignPosStaffRole, verifyPosStaffPin } from '@/lib/pos/pos-service';

export async function GET(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const staff = await getPosStaff(auth.businessId);
  return NextResponse.json({ staff });
}

export async function POST(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action, pin, userId, role, displayName } = body;

  // 1. Quick PIN authentication for cashier switch at the terminal
  if (action === 'verify_pin') {
    if (!pin) return NextResponse.json({ error: 'PIN required' }, { status: 400 });
    const verified = await verifyPosStaffPin(auth.businessId, pin);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid staff PIN.' }, { status: 401 });
    }
    return NextResponse.json({ success: true, staff: verified });
  }

  // 2. Assign staff member (owner only)
  if (auth.posRole !== 'owner') {
    return NextResponse.json({ error: 'Only business owners can manage staff permissions.' }, { status: 403 });
  }

  if (!userId || !role) {
    return NextResponse.json({ error: 'User ID and role are required.' }, { status: 400 });
  }

  const staff = await assignPosStaffRole(auth.businessId, userId, role, pin, displayName);
  return NextResponse.json({ success: true, staff });
}
