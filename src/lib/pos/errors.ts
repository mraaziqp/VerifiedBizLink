import { NextResponse } from 'next/server';
import { PaymentUnavailableError } from './payments/types';

/** An expected, user-facing POS failure with an HTTP status. */
export class PosError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly detail?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PosError';
  }
}

export const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** Converts any thrown error into a safe JSON response. Unknown errors never leak internals. */
export function posErrorResponse(err: unknown, fallback = 'Something went wrong.'): NextResponse {
  if (err instanceof PosError) {
    return NextResponse.json({ error: err.message, code: err.code, ...(err.detail ? { detail: err.detail } : {}) }, { status: err.status });
  }
  if (err instanceof PaymentUnavailableError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
  }
  console.error('[pos] unexpected error:', err);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

/** Reads a JSON body; a malformed body is a 400, not a crash. */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  throw new PosError(400, 'BAD_JSON', 'The request body must be a JSON object.');
}
