'use client';

/**
 * Browser-side helpers for the POS pages. No server imports.
 */

export const OPERATOR_STORAGE_KEY = 'vbl_pos_operator';

export interface TillOperatorSession {
  token: string;
  userId: string;
  displayName: string;
  role: string;
  businessId: string;
}

export function getOperator(businessId?: string): TillOperatorSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(OPERATOR_STORAGE_KEY);
    if (!raw) return null;
    const op = JSON.parse(raw) as TillOperatorSession;
    if (businessId && op.businessId !== businessId) return null;
    return op;
  } catch {
    return null;
  }
}

export function setOperator(op: TillOperatorSession | null) {
  try {
    if (op) sessionStorage.setItem(OPERATOR_STORAGE_KEY, JSON.stringify(op));
    else sessionStorage.removeItem(OPERATOR_STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** fetch() for POS APIs: JSON, plus the till operator header when one is signed in by PIN. */
export async function posFetch(url: string, init: RequestInit & { json?: unknown } = {}) {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set('Content-Type', 'application/json');
  const op = getOperator();
  if (op) headers.set('x-pos-operator', op.token);
  const res = await fetch(url, { ...init, headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body });
  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (res.status === 401 && data.code === 'OPERATOR_EXPIRED') setOperator(null);
  return { ok: res.ok, status: res.status, data };
}

export function newIdempotencyKey(prefix = 'sale'): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${rand}`;
}

export function zar(cents: number | string | null | undefined): string {
  const n = Number(cents ?? 0) / 100;
  return `R${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function pct(bps: number | string | null | undefined): string {
  const n = Number(bps ?? 0) / 100;
  return `${Number.isInteger(n) ? n : n.toFixed(2)}%`;
}

export const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card_external: 'Card (own machine)',
  card_tap: 'Tap on phone',
  qr_online: 'QR / payment link',
};

export interface PosAccess {
  mode: 'full' | 'read_only';
  status: string;
  message: string;
  graceEndsAt?: string | null;
}
