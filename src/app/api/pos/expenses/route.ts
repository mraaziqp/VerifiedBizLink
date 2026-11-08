import { NextRequest, NextResponse } from 'next/server';
import { requirePosAccess } from '@/lib/pos/auth-helper';
import { getPosExpenses, createPosExpense, EXPENSE_CATEGORIES } from '@/lib/pos/pos-service';
import { posErrorResponse, readJson } from '@/lib/pos/errors';

const isDate = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export async function GET(req: NextRequest) {
  const guard = await requirePosAccess(req, 'expenses.read');
  if (!guard.ok) return guard.response;
  try {
    const sp = req.nextUrl.searchParams;
    const expenses = await getPosExpenses(guard.auth.businessId, isDate(sp.get('from')), isDate(sp.get('to')));
    return NextResponse.json({ expenses, categories: EXPENSE_CATEGORIES });
  } catch (err) {
    return posErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  const guard = await requirePosAccess(req, 'expenses.write');
  if (!guard.ok) return guard.response;
  try {
    const body = await readJson(req);
    const expense = await createPosExpense(guard.auth.businessId, body, guard.auth.session.id);
    return NextResponse.json({ success: true, expense }, { status: 201 });
  } catch (err) {
    return posErrorResponse(err);
  }
}
