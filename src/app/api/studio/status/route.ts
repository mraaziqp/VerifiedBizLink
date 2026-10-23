import { NextResponse } from 'next/server';
import { getStudioSettings } from '@/lib/studio';
import { getSession } from '@/lib/auth';
import { isStaff } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getStudioSettings();
    const session = await getSession();
    const isUserStaff = session ? isStaff(session.role) : false;

    return NextResponse.json({
      isLive: Boolean(settings.isLive),
      canView: Boolean(settings.isLive || isUserStaff),
      isStaff: isUserStaff,
    });
  } catch {
    return NextResponse.json({ isLive: false, canView: false, isStaff: false });
  }
}
