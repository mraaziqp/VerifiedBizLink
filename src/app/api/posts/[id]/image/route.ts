import { NextRequest } from 'next/server';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/posts/<id>/image[?kind=video] — the media stored on a post.
 *
 * Historically a post's image was saved as a base64 data: URI inside the row
 * itself, so the feed had to carry every image inline. Twenty posts came to
 * 6.08 MB against Lambda's ~6 MB response ceiling: the query was fine, the
 * response simply could not be delivered, the route returned 500, and the feed
 * rendered "no posts yet" as though the data had been deleted.
 *
 * Serving each image from its own URL keeps the feed itself a few kilobytes,
 * lets the browser cache and lazily load images, and means the feed can never
 * again be broken by the number of posts in it.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const kind = request.nextUrl.searchParams.get('kind') === 'video' ? 'video' : 'image';

    const rows = (await db`
      SELECT image_url, video_url FROM posts WHERE id = ${id} LIMIT 1
    `.catch(() => [])) as unknown as Row[];

    if (rows.length === 0) return new Response('Not found', { status: 404 });

    const stored = String((kind === 'video' ? rows[0].video_url : rows[0].image_url) ?? '');
    if (!stored) return new Response('Not found', { status: 404 });

    // Media that already lives somewhere else (Firebase, Supabase) is not
    // proxied — sending the caller there keeps that bandwidth off our server.
    if (!stored.startsWith('data:')) {
      return Response.redirect(stored, 302);
    }

    const comma = stored.indexOf(',');
    const header = stored.slice(0, comma);
    const body = stored.slice(comma + 1);
    const mime = header.match(/^data:([^;,]+)/)?.[1] || 'application/octet-stream';
    const buffer = Buffer.from(body, 'base64');

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(buffer.length),
        // The bytes behind a given post id never change — editing a post's
        // media writes a new row value and this URL would return it, but the
        // common case is an image that is identical for ever.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Post media error:', error);
    return new Response('Failed to load media', { status: 500 });
  }
}
