import { NextRequest } from 'next/server';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/users/<id>/avatar — a user's profile picture.
 *
 * Same reason as the post media route next door: avatars saved as base64 data:
 * URIs were being repeated inline on every row of every feed response — 0.77 MB
 * across a single page of twenty posts, on top of the images. Served from their
 * own URL they are fetched once and cached by the browser.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const rows = (await db`
      SELECT avatar_url FROM users WHERE id = ${id} LIMIT 1
    `.catch(() => [])) as unknown as Row[];

    const stored = String(rows[0]?.avatar_url ?? '');
    if (!stored) return new Response('Not found', { status: 404 });

    if (!stored.startsWith('data:')) {
      return Response.redirect(stored, 302);
    }

    const comma = stored.indexOf(',');
    const mime = stored.slice(0, comma).match(/^data:([^;,]+)/)?.[1] || 'image/jpeg';
    const buffer = Buffer.from(stored.slice(comma + 1), 'base64');

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(buffer.length),
        // Shorter than post media: people change their avatar, and a stale one
        // for a year would be its own bug report.
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Avatar fetch error:', error);
    return new Response('Failed to load avatar', { status: 500 });
  }
}
