import type { DbRow } from '@/lib/db';

/**
 * CSV for exports. Values are quoted, and a cell that a spreadsheet would
 * execute as a formula (=, +, -, @, tab, CR at the start) is prefixed with
 * an apostrophe — merchant-entered product names reach these files.
 */
function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = v instanceof Date ? v.toISOString() : typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: DbRow[], columns?: string[]): string {
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]) : []);
  const lines = [cols.join(',')];
  for (const r of rows) lines.push(cols.map((c) => cell(r[c])).join(','));
  return lines.join('\r\n') + '\r\n';
}

export function csvResponse(filename: string, rows: DbRow[], columns?: string[]): Response {
  return new Response(toCsv(rows, columns), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename.replace(/[^a-z0-9._-]/gi, '_')}"`,
      'Cache-Control': 'no-store',
    },
  });
}
